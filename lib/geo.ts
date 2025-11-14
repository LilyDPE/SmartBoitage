// GIS Utility Functions
// Geospatial calculations, transformations, and helpers

import { Position, LineString, Point, Polygon, Feature, FeatureCollection } from 'geojson';

/**
 * Calculate distance between two points using Haversine formula
 * @param lon1 Longitude of point 1
 * @param lat1 Latitude of point 1
 * @param lon2 Longitude of point 2
 * @param lat2 Latitude of point 2
 * @returns Distance in meters
 */
export function haversineDistance(
  lon1: number,
  lat1: number,
  lon2: number,
  lat2: number
): number {
  const R = 6371000; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Calculate bearing between two points
 * @returns Bearing in degrees (0-360)
 */
export function calculateBearing(
  lon1: number,
  lat1: number,
  lon2: number,
  lat2: number
): number {
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x =
    Math.cos(φ1) * Math.sin(φ2) -
    Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);

  const θ = Math.atan2(y, x);
  const bearing = ((θ * 180) / Math.PI + 360) % 360;

  return bearing;
}

/**
 * Get midpoint of a LineString
 */
export function getLineMidpoint(coordinates: Position[]): Position {
  if (coordinates.length === 0) {
    throw new Error('Cannot get midpoint of empty line');
  }

  // Calculate total length
  let totalLength = 0;
  const segments: number[] = [];

  for (let i = 0; i < coordinates.length - 1; i++) {
    const segmentLength = haversineDistance(
      coordinates[i][0],
      coordinates[i][1],
      coordinates[i + 1][0],
      coordinates[i + 1][1]
    );
    segments.push(segmentLength);
    totalLength += segmentLength;
  }

  // Find midpoint
  const halfLength = totalLength / 2;
  let accumulatedLength = 0;

  for (let i = 0; i < segments.length; i++) {
    if (accumulatedLength + segments[i] >= halfLength) {
      const segmentProgress = (halfLength - accumulatedLength) / segments[i];
      return [
        coordinates[i][0] + (coordinates[i + 1][0] - coordinates[i][0]) * segmentProgress,
        coordinates[i][1] + (coordinates[i + 1][1] - coordinates[i][1]) * segmentProgress,
      ];
    }
    accumulatedLength += segments[i];
  }

  // Fallback to geometric center
  return coordinates[Math.floor(coordinates.length / 2)];
}

/**
 * Calculate centroid of a polygon
 */
export function getPolygonCentroid(coordinates: Position[][]): Position {
  const ring = coordinates[0]; // Use outer ring
  let area = 0;
  let x = 0;
  let y = 0;

  for (let i = 0; i < ring.length - 1; i++) {
    const x0 = ring[i][0];
    const y0 = ring[i][1];
    const x1 = ring[i + 1][0];
    const y1 = ring[i + 1][1];
    const cross = x0 * y1 - x1 * y0;
    area += cross;
    x += (x0 + x1) * cross;
    y += (y0 + y1) * cross;
  }

  area *= 0.5;
  x /= 6 * area;
  y /= 6 * area;

  return [x, y];
}

/**
 * Offset a line perpendicular by distance in meters
 * Simple implementation for small distances
 */
export function offsetLine(
  coordinates: Position[],
  offsetMeters: number
): Position[] {
  const offsetted: Position[] = [];

  for (let i = 0; i < coordinates.length; i++) {
    const prev = i > 0 ? coordinates[i - 1] : coordinates[i];
    const curr = coordinates[i];
    const next = i < coordinates.length - 1 ? coordinates[i + 1] : coordinates[i];

    // Calculate perpendicular offset
    const bearing = calculateBearing(prev[0], prev[1], next[0], next[1]);
    const perpBearing = (bearing + 90) % 360; // Perpendicular to the right

    const newPoint = destinationPoint(
      curr[0],
      curr[1],
      offsetMeters,
      perpBearing
    );

    offsetted.push(newPoint);
  }

  return offsetted;
}

/**
 * Calculate destination point given distance and bearing
 */
export function destinationPoint(
  lon: number,
  lat: number,
  distanceMeters: number,
  bearingDegrees: number
): Position {
  const R = 6371000; // Earth radius in meters
  const φ1 = (lat * Math.PI) / 180;
  const λ1 = (lon * Math.PI) / 180;
  const θ = (bearingDegrees * Math.PI) / 180;

  const φ2 = Math.asin(
    Math.sin(φ1) * Math.cos(distanceMeters / R) +
      Math.cos(φ1) * Math.sin(distanceMeters / R) * Math.cos(θ)
  );

  const λ2 =
    λ1 +
    Math.atan2(
      Math.sin(θ) * Math.sin(distanceMeters / R) * Math.cos(φ1),
      Math.cos(distanceMeters / R) - Math.sin(φ1) * Math.sin(φ2)
    );

  return [
    ((λ2 * 180) / Math.PI + 540) % 360 - 180, // Normalize to -180..+180
    (φ2 * 180) / Math.PI,
  ];
}

/**
 * Check if point is within polygon (simple ray casting)
 */
export function isPointInPolygon(point: Position, polygon: Position[][]): boolean {
  const ring = polygon[0];
  const x = point[0];
  const y = point[1];
  let inside = false;

  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];

    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;

    if (intersect) inside = !inside;
  }

  return inside;
}

/**
 * Calculate bounding box of coordinates
 */
export function getBoundingBox(coordinates: Position[]): {
  minLon: number;
  minLat: number;
  maxLon: number;
  maxLat: number;
} {
  let minLon = Infinity;
  let minLat = Infinity;
  let maxLon = -Infinity;
  let maxLat = -Infinity;

  for (const coord of coordinates) {
    minLon = Math.min(minLon, coord[0]);
    maxLon = Math.max(maxLon, coord[0]);
    minLat = Math.min(minLat, coord[1]);
    maxLat = Math.max(maxLat, coord[1]);
  }

  return { minLon, minLat, maxLon, maxLat };
}

/**
 * Get polygon bounding box
 */
export function getPolygonBounds(coordinates: Position[][]): {
  minLon: number;
  minLat: number;
  maxLon: number;
  maxLat: number;
} {
  return getBoundingBox(coordinates[0]);
}

/**
 * Calculate line length in meters
 */
export function calculateLineLength(coordinates: Position[]): number {
  let length = 0;

  for (let i = 0; i < coordinates.length - 1; i++) {
    length += haversineDistance(
      coordinates[i][0],
      coordinates[i][1],
      coordinates[i + 1][0],
      coordinates[i + 1][1]
    );
  }

  return length;
}

/**
 * Simplify line using Ramer-Douglas-Peucker algorithm
 */
export function simplifyLine(
  coordinates: Position[],
  tolerance: number
): Position[] {
  if (coordinates.length <= 2) return coordinates;

  // Find point with maximum distance
  let maxDistance = 0;
  let maxIndex = 0;

  for (let i = 1; i < coordinates.length - 1; i++) {
    const distance = perpendicularDistance(
      coordinates[i],
      coordinates[0],
      coordinates[coordinates.length - 1]
    );

    if (distance > maxDistance) {
      maxDistance = distance;
      maxIndex = i;
    }
  }

  // If max distance is greater than tolerance, recursively simplify
  if (maxDistance > tolerance) {
    const left = simplifyLine(coordinates.slice(0, maxIndex + 1), tolerance);
    const right = simplifyLine(coordinates.slice(maxIndex), tolerance);

    return [...left.slice(0, -1), ...right];
  }

  return [coordinates[0], coordinates[coordinates.length - 1]];
}

/**
 * Calculate perpendicular distance from point to line
 */
function perpendicularDistance(
  point: Position,
  lineStart: Position,
  lineEnd: Position
): number {
  const [x, y] = point;
  const [x1, y1] = lineStart;
  const [x2, y2] = lineEnd;

  const A = x - x1;
  const B = y - y1;
  const C = x2 - x1;
  const D = y2 - y1;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let param = -1;

  if (lenSq !== 0) param = dot / lenSq;

  let xx: number, yy: number;

  if (param < 0) {
    xx = x1;
    yy = y1;
  } else if (param > 1) {
    xx = x2;
    yy = y2;
  } else {
    xx = x1 + param * C;
    yy = y1 + param * D;
  }

  const dx = x - xx;
  const dy = y - yy;

  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Create GeoJSON Point
 */
export function createPoint(lon: number, lat: number): Point {
  return {
    type: 'Point',
    coordinates: [lon, lat],
  };
}

/**
 * Create GeoJSON LineString
 */
export function createLineString(coordinates: Position[]): LineString {
  return {
    type: 'LineString',
    coordinates,
  };
}

/**
 * Create GeoJSON Polygon
 */
export function createPolygon(coordinates: Position[][]): Polygon {
  return {
    type: 'Polygon',
    coordinates,
  };
}

/**
 * Create GeoJSON Feature
 */
export function createFeature<G = any>(
  geometry: G,
  properties: any = {}
): Feature {
  return {
    type: 'Feature',
    geometry: geometry as any,
    properties,
  };
}

/**
 * Create GeoJSON FeatureCollection
 */
export function createFeatureCollection(features: Feature[]): FeatureCollection {
  return {
    type: 'FeatureCollection',
    features,
  };
}

/**
 * Convert polygon to Overpass format (space-separated lat lon pairs)
 */
export function polygonToOverpassPoly(coordinates: Position[][]): string {
  const ring = coordinates[0];
  return ring.map((coord) => `${coord[1]} ${coord[0]}`).join(' ');
}

/**
 * Buffer a point (create circle polygon around it)
 */
export function bufferPoint(
  lon: number,
  lat: number,
  radiusMeters: number,
  points: number = 32
): Position[] {
  const buffered: Position[] = [];

  for (let i = 0; i < points; i++) {
    const angle = (360 / points) * i;
    const point = destinationPoint(lon, lat, radiusMeters, angle);
    buffered.push(point);
  }

  // Close the polygon
  buffered.push(buffered[0]);

  return buffered;
}

/**
 * Get nearest point on line to a given point
 */
export function nearestPointOnLine(
  point: Position,
  lineCoordinates: Position[]
): { point: Position; distance: number; index: number } {
  let minDistance = Infinity;
  let nearestPoint: Position = lineCoordinates[0];
  let nearestIndex = 0;

  for (let i = 0; i < lineCoordinates.length - 1; i++) {
    const segmentStart = lineCoordinates[i];
    const segmentEnd = lineCoordinates[i + 1];

    const projected = projectPointOnSegment(point, segmentStart, segmentEnd);
    const distance = haversineDistance(
      point[0],
      point[1],
      projected[0],
      projected[1]
    );

    if (distance < minDistance) {
      minDistance = distance;
      nearestPoint = projected;
      nearestIndex = i;
    }
  }

  return { point: nearestPoint, distance: minDistance, index: nearestIndex };
}

/**
 * Project point onto line segment
 */
function projectPointOnSegment(
  point: Position,
  segmentStart: Position,
  segmentEnd: Position
): Position {
  const [x, y] = point;
  const [x1, y1] = segmentStart;
  const [x2, y2] = segmentEnd;

  const A = x - x1;
  const B = y - y1;
  const C = x2 - x1;
  const D = y2 - y1;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;

  if (lenSq === 0) return segmentStart;

  let param = dot / lenSq;

  // Clamp to segment
  param = Math.max(0, Math.min(1, param));

  return [x1 + param * C, y1 + param * D];
}

/**
 * Format distance for display
 */
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(2)} km`;
}

/**
 * Format duration for display
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}min`;
  }
  return `${minutes}min`;
}
