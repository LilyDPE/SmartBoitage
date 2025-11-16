// Overpass API Integration for OpenStreetMap street extraction

import { Position, LineString } from 'geojson';
import { polygonToOverpassPoly } from './geo';

const OVERPASS_URL =
  process.env.OVERPASS_URL || 'https://overpass-api.de/api/interpreter';

export interface OSMStreet {
  id: string;
  name: string;
  geometry: LineString;
  tags: Record<string, any>;
  nodes?: OSMNode[];
}

export interface OSMNode {
  id: string;
  lat: number;
  lon: number;
  tags?: Record<string, any>;
}

export interface OverpassResponse {
  version: number;
  generator: string;
  elements: OverpassElement[];
}

export interface OverpassElement {
  type: 'node' | 'way' | 'relation';
  id: number;
  lat?: number;
  lon?: number;
  tags?: Record<string, any>;
  nodes?: number[];
  geometry?: Array<{ lat: number; lon: number }>;
  members?: any[];
}

/**
 * Extract streets from OpenStreetMap within a polygon using Overpass API
 */
export async function extractStreetsFromOSM(
  polygonCoordinates: Position[][],
  options: {
    timeout?: number;
    includeResidential?: boolean;
    includeService?: boolean;
    includePaths?: boolean;
  } = {}
): Promise<OSMStreet[]> {
  const {
    timeout = 25,
    includeResidential = true,
    includeService = true,
    includePaths = false,
  } = options;

  // Convert polygon to Overpass poly format
  const polyString = polygonToOverpassPoly(polygonCoordinates);

  // Build Overpass QL query
  const query = buildOverpassQuery(polyString, {
    timeout,
    includeResidential,
    includeService,
    includePaths,
  });

  console.log('Executing Overpass query...');

  try {
    const response = await fetch(OVERPASS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `data=${encodeURIComponent(query)}`,
    });

    if (!response.ok) {
      throw new Error(`Overpass API error: ${response.statusText}`);
    }

    const data: OverpassResponse = await response.json();

    console.log(`Received ${data.elements.length} elements from Overpass`);

    // Parse and convert to our street format
    const streets = parseOverpassResponse(data);

    console.log(`Extracted ${streets.length} streets`);

    return streets;
  } catch (error) {
    console.error('Error fetching from Overpass API:', error);
    throw new Error(`Failed to extract streets: ${error}`);
  }
}

/**
 * Build Overpass QL query
 */
function buildOverpassQuery(
  polyString: string,
  options: {
    timeout: number;
    includeResidential: boolean;
    includeService: boolean;
    includePaths: boolean;
  }
): string {
  const { timeout, includeResidential: _includeResidential, includeService, includePaths } = options;

  // Highway types to include
  const highwayTypes = [
    'primary',
    'secondary',
    'tertiary',
    'unclassified',
    'residential',
    'living_street',
    'pedestrian',
  ];

  if (includeService) {
    highwayTypes.push('service');
  }

  if (includePaths) {
    highwayTypes.push('footway', 'path', 'cycleway');
  }

  const query = `
[out:json][timeout:${timeout}];
(
  way["highway"](poly:"${polyString}");
);
out body;
>;
out skel qt;
`.trim();

  return query;
}

/**
 * Parse Overpass API response
 */
function parseOverpassResponse(data: OverpassResponse): OSMStreet[] {
  const nodeMap = new Map<number, OSMNode>();
  const streets: OSMStreet[] = [];

  // First pass: collect all nodes
  for (const element of data.elements) {
    if (element.type === 'node' && element.lat && element.lon) {
      nodeMap.set(element.id, {
        id: element.id.toString(),
        lat: element.lat,
        lon: element.lon,
        tags: element.tags,
      });
    }
  }

  // Second pass: build ways (streets)
  for (const element of data.elements) {
    if (element.type === 'way' && element.nodes) {
      // Get coordinates from nodes or geometry
      const coordinates: Position[] = [];

      if (element.geometry) {
        // Overpass returned geometry directly
        for (const coord of element.geometry) {
          coordinates.push([coord.lon, coord.lat]);
        }
      } else if (element.nodes) {
        // Build geometry from node references
        for (const nodeId of element.nodes) {
          const node = nodeMap.get(nodeId);
          if (node) {
            coordinates.push([node.lon, node.lat]);
          }
        }
      }

      if (coordinates.length < 2) {
        continue; // Skip invalid geometries
      }

      // Extract street name
      const name =
        element.tags?.name ||
        element.tags?.ref ||
        element.tags?.['addr:street'] ||
        'Sans nom';

      // Build nodes array with house numbers if available
      const nodes: OSMNode[] = [];
      if (element.nodes) {
        for (const nodeId of element.nodes) {
          const node = nodeMap.get(nodeId);
          if (node) {
            nodes.push(node);
          }
        }
      }

      streets.push({
        id: element.id.toString(),
        name,
        geometry: {
          type: 'LineString',
          coordinates,
        },
        tags: element.tags || {},
        nodes,
      });
    }
  }

  return streets;
}

/**
 * Extract house numbers from street nodes
 */
export function extractHouseNumbers(
  street: OSMStreet
): Array<{
  number: string;
  position: Position;
  isEven: boolean;
}> {
  const houseNumbers: Array<{
    number: string;
    position: Position;
    isEven: boolean;
  }> = [];

  if (!street.nodes) return houseNumbers;

  for (const node of street.nodes) {
    if (node.tags?.['addr:housenumber']) {
      const numberStr = node.tags['addr:housenumber'];
      const position: Position = [node.lon, node.lat];

      // Try to determine if even or odd
      const numberMatch = numberStr.match(/\d+/);
      if (numberMatch) {
        const number = parseInt(numberMatch[0], 10);
        const isEven = number % 2 === 0;

        houseNumbers.push({
          number: numberStr,
          position,
          isEven,
        });
      }
    }
  }

  return houseNumbers;
}

/**
 * Group house numbers by parity (pair/impair)
 */
export function groupByParity(
  houseNumbers: Array<{
    number: string;
    position: Position;
    isEven: boolean;
  }>
): {
  pair: Array<{ number: string; position: Position }>;
  impair: Array<{ number: string; position: Position }>;
} {
  const pair: Array<{ number: string; position: Position }> = [];
  const impair: Array<{ number: string; position: Position }> = [];

  for (const hn of houseNumbers) {
    if (hn.isEven) {
      pair.push({ number: hn.number, position: hn.position });
    } else {
      impair.push({ number: hn.number, position: hn.position });
    }
  }

  return { pair, impair };
}

/**
 * Determine if a street has house number data
 */
export function hasHouseNumberData(street: OSMStreet): boolean {
  if (!street.nodes) return false;

  return street.nodes.some((node) => node.tags?.['addr:housenumber']);
}

/**
 * Get street statistics
 */
export function getStreetStats(streets: OSMStreet[]): {
  total: number;
  withNames: number;
  withHouseNumbers: number;
  totalLength: number;
} {
  let withNames = 0;
  let withHouseNumbers = 0;
  let totalLength = 0;

  for (const street of streets) {
    if (street.name && street.name !== 'Sans nom') {
      withNames++;
    }

    if (hasHouseNumberData(street)) {
      withHouseNumbers++;
    }

    // Approximate length calculation
    const coords = street.geometry.coordinates;
    for (let i = 0; i < coords.length - 1; i++) {
      const dx = coords[i + 1][0] - coords[i][0];
      const dy = coords[i + 1][1] - coords[i][1];
      totalLength += Math.sqrt(dx * dx + dy * dy) * 111320; // Rough meters conversion
    }
  }

  return {
    total: streets.length,
    withNames,
    withHouseNumbers,
    totalLength,
  };
}

/**
 * Filter streets by type
 */
export function filterStreetsByType(
  streets: OSMStreet[],
  types: string[]
): OSMStreet[] {
  return streets.filter((street) => {
    const highway = street.tags.highway;
    return highway && types.includes(highway);
  });
}

/**
 * Merge connected street segments with same name
 */
export function mergeConnectedStreets(streets: OSMStreet[]): OSMStreet[] {
  // Group streets by name
  const streetsByName = new Map<string, OSMStreet[]>();

  for (const street of streets) {
    const name = street.name || 'Sans nom';
    if (!streetsByName.has(name)) {
      streetsByName.set(name, []);
    }
    streetsByName.get(name)!.push(street);
  }

  const merged: OSMStreet[] = [];

  // For each name group, try to merge connected segments
  for (const [_name, segments] of streetsByName) {
    if (segments.length === 1) {
      merged.push(segments[0]);
      continue;
    }

    // Simple merge: just keep all segments for now
    // Advanced implementation would connect segments that share endpoints
    merged.push(...segments);
  }

  return merged;
}

/**
 * Validate street geometry
 */
export function validateStreetGeometry(street: OSMStreet): boolean {
  const coords = street.geometry.coordinates;

  // Must have at least 2 points
  if (coords.length < 2) return false;

  // Check for valid coordinates
  for (const coord of coords) {
    if (
      !Array.isArray(coord) ||
      coord.length !== 2 ||
      !isFinite(coord[0]) ||
      !isFinite(coord[1]) ||
      Math.abs(coord[0]) > 180 ||
      Math.abs(coord[1]) > 90
    ) {
      return false;
    }
  }

  return true;
}

/**
 * Clean and validate extracted streets
 */
export function cleanStreets(streets: OSMStreet[]): OSMStreet[] {
  return streets.filter(validateStreetGeometry);
}
