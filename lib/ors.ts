// OpenRouteService API Integration
// Route optimization, matrix calculations, and directions

import { Position, LineString } from 'geojson';

const ORS_API_KEY = process.env.ORS_API_KEY || '';
const ORS_BASE_URL = process.env.ORS_BASE_URL || 'https://api.openrouteservice.org';

export interface ORSMatrixResponse {
  durations: number[][];
  distances: number[][];
  sources: Array<{ location: Position }>;
  destinations: Array<{ location: Position }>;
}

export interface ORSDirectionsResponse {
  features: Array<{
    geometry: LineString;
    properties: {
      segments: Array<{
        distance: number;
        duration: number;
        steps: any[];
      }>;
      summary: {
        distance: number;
        duration: number;
      };
      way_points: number[];
    };
  }>;
}

export interface RouteOptimizationResult {
  orderedWaypoints: Position[];
  route: LineString;
  totalDistance: number;
  totalDuration: number;
  segmentOrder: number[];
}

/**
 * Get distance/duration matrix between multiple points
 */
export async function getMatrix(
  locations: Position[],
  profile: 'driving-car' | 'foot-walking' | 'cycling-regular' = 'foot-walking'
): Promise<ORSMatrixResponse> {
  if (locations.length === 0) {
    throw new Error('At least one location is required');
  }

  if (locations.length > 50) {
    throw new Error('Maximum 50 locations allowed for matrix calculation');
  }

  const url = `${ORS_BASE_URL}/v2/matrix/${profile}`;

  const body = {
    locations: locations,
    metrics: ['distance', 'duration'],
    units: 'm',
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: ORS_API_KEY,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ORS Matrix API error: ${response.statusText} - ${errorText}`);
    }

    const data: ORSMatrixResponse = await response.json();
    return data;
  } catch (error) {
    console.error('Error calling ORS Matrix API:', error);
    throw error;
  }
}

/**
 * Get optimized route through multiple waypoints
 */
export async function getDirections(
  waypoints: Position[],
  profile: 'driving-car' | 'foot-walking' | 'cycling-regular' = 'foot-walking',
  options: {
    optimize?: boolean;
    instructions?: boolean;
  } = {}
): Promise<ORSDirectionsResponse> {
  if (waypoints.length < 2) {
    throw new Error('At least 2 waypoints are required');
  }

  if (waypoints.length > 50) {
    throw new Error('Maximum 50 waypoints allowed');
  }

  const url = `${ORS_BASE_URL}/v2/directions/${profile}/geojson`;

  const body: any = {
    coordinates: waypoints,
    instructions: options.instructions ?? false,
    preference: 'shortest',
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: ORS_API_KEY,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ORS Directions API error: ${response.statusText} - ${errorText}`);
    }

    const data: ORSDirectionsResponse = await response.json();
    return data;
  } catch (error) {
    console.error('Error calling ORS Directions API:', error);
    throw error;
  }
}

/**
 * Optimize route using nearest neighbor heuristic
 * Solves approximate TSP (Traveling Salesman Problem)
 */
export async function optimizeRoute(
  waypoints: Position[],
  profile: 'driving-car' | 'foot-walking' | 'cycling-regular' = 'foot-walking',
  startIndex: number = 0
): Promise<RouteOptimizationResult> {
  if (waypoints.length === 0) {
    throw new Error('No waypoints provided');
  }

  if (waypoints.length === 1) {
    // Single waypoint, no optimization needed
    return {
      orderedWaypoints: waypoints,
      route: { type: 'LineString', coordinates: waypoints },
      totalDistance: 0,
      totalDuration: 0,
      segmentOrder: [0],
    };
  }

  console.log(`Optimizing route for ${waypoints.length} waypoints...`);

  // Step 1: Get distance matrix
  const matrix = await getMatrix(waypoints, profile);

  // Step 2: Use nearest neighbor heuristic to find good order
  const order = nearestNeighborTSP(matrix.distances, startIndex);

  console.log(`Optimal order found:`, order);

  // Step 3: Reorder waypoints
  const orderedWaypoints = order.map((idx) => waypoints[idx]);

  // Step 4: Get actual route through ordered waypoints
  const directions = await getDirections(orderedWaypoints, profile, {
    instructions: false,
  });

  const feature = directions.features[0];
  const route = feature.geometry;
  const totalDistance = feature.properties.summary.distance;
  const totalDuration = feature.properties.summary.duration;

  return {
    orderedWaypoints,
    route,
    totalDistance,
    totalDuration,
    segmentOrder: order,
  };
}

/**
 * Nearest neighbor TSP heuristic
 * Greedy algorithm to find approximate shortest path visiting all points
 */
function nearestNeighborTSP(distanceMatrix: number[][], startIndex: number = 0): number[] {
  const n = distanceMatrix.length;
  const visited = new Set<number>();
  const order: number[] = [];

  let current = startIndex;
  visited.add(current);
  order.push(current);

  // Visit all other nodes
  while (visited.size < n) {
    let nearest = -1;
    let minDistance = Infinity;

    // Find nearest unvisited node
    for (let i = 0; i < n; i++) {
      if (!visited.has(i)) {
        const distance = distanceMatrix[current][i];
        if (distance < minDistance) {
          minDistance = distance;
          nearest = i;
        }
      }
    }

    if (nearest === -1) break; // Should not happen

    visited.add(nearest);
    order.push(nearest);
    current = nearest;
  }

  return order;
}

/**
 * Optimize route using 2-opt improvement heuristic
 * Improves existing route by swapping edges
 */
export function twoOptImprovement(
  order: number[],
  distanceMatrix: number[][]
): number[] {
  const n = order.length;
  let improved = true;
  let currentOrder = [...order];

  while (improved) {
    improved = false;

    for (let i = 1; i < n - 1; i++) {
      for (let j = i + 1; j < n; j++) {
        // Calculate current distance
        const currentDist =
          distanceMatrix[currentOrder[i - 1]][currentOrder[i]] +
          distanceMatrix[currentOrder[j]][currentOrder[(j + 1) % n]];

        // Calculate new distance after swap
        const newDist =
          distanceMatrix[currentOrder[i - 1]][currentOrder[j]] +
          distanceMatrix[currentOrder[i]][currentOrder[(j + 1) % n]];

        if (newDist < currentDist) {
          // Perform 2-opt swap
          const newOrder = [
            ...currentOrder.slice(0, i),
            ...currentOrder.slice(i, j + 1).reverse(),
            ...currentOrder.slice(j + 1),
          ];
          currentOrder = newOrder;
          improved = true;
        }
      }
    }
  }

  return currentOrder;
}

/**
 * Batch optimize large number of waypoints by splitting into chunks
 */
export async function optimizeLargeRoute(
  waypoints: Position[],
  profile: 'driving-car' | 'foot-walking' | 'cycling-regular' = 'foot-walking',
  chunkSize: number = 40
): Promise<RouteOptimizationResult> {
  if (waypoints.length <= 50) {
    // Can optimize directly
    return optimizeRoute(waypoints, profile);
  }

  console.log(
    `Large route with ${waypoints.length} waypoints, splitting into chunks...`
  );

  // Split into chunks
  const chunks: Position[][] = [];
  for (let i = 0; i < waypoints.length; i += chunkSize) {
    chunks.push(waypoints.slice(i, i + chunkSize));
  }

  // Optimize each chunk
  const optimizedChunks: RouteOptimizationResult[] = [];
  for (let i = 0; i < chunks.length; i++) {
    console.log(`Optimizing chunk ${i + 1}/${chunks.length}...`);
    const result = await optimizeRoute(chunks[i], profile);
    optimizedChunks.push(result);
  }

  // Combine results
  const allWaypoints: Position[] = [];
  const allCoordinates: Position[] = [];
  let totalDistance = 0;
  let totalDuration = 0;

  for (const chunk of optimizedChunks) {
    allWaypoints.push(...chunk.orderedWaypoints);
    allCoordinates.push(...chunk.route.coordinates);
    totalDistance += chunk.totalDistance;
    totalDuration += chunk.totalDuration;
  }

  return {
    orderedWaypoints: allWaypoints,
    route: { type: 'LineString', coordinates: allCoordinates },
    totalDistance,
    totalDuration,
    segmentOrder: Array.from({ length: waypoints.length }, (_, i) => i),
  };
}

/**
 * Get isochrone (time-based polygon showing reachable area)
 */
export async function getIsochrone(
  location: Position,
  profile: 'driving-car' | 'foot-walking' | 'cycling-regular' = 'foot-walking',
  ranges: number[] = [300, 600, 900] // seconds
): Promise<any> {
  const url = `${ORS_BASE_URL}/v2/isochrones/${profile}`;

  const body = {
    locations: [location],
    range: ranges,
    range_type: 'time',
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: ORS_API_KEY,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`ORS Isochrone API error: ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error calling ORS Isochrone API:', error);
    throw error;
  }
}

/**
 * Calculate route between two points (simple)
 */
export async function getSimpleRoute(
  start: Position,
  end: Position,
  profile: 'driving-car' | 'foot-walking' | 'cycling-regular' = 'foot-walking'
): Promise<{
  route: LineString;
  distance: number;
  duration: number;
}> {
  const directions = await getDirections([start, end], profile);
  const feature = directions.features[0];

  return {
    route: feature.geometry,
    distance: feature.properties.summary.distance,
    duration: feature.properties.summary.duration,
  };
}

/**
 * Validate ORS API key
 */
export async function validateORSKey(): Promise<boolean> {
  if (!ORS_API_KEY) {
    console.warn('ORS_API_KEY not configured');
    return false;
  }

  try {
    // Try a simple request to validate key
    const testLocation: Position = [8.681495, 49.41461]; // Heidelberg, Germany
    await getMatrix([testLocation], 'foot-walking');
    return true;
  } catch (error) {
    console.error('ORS API key validation failed:', error);
    return false;
  }
}

/**
 * Estimate walking time based on distance
 * Fallback when ORS is not available
 */
export function estimateWalkingTime(distanceMeters: number): number {
  // Average walking speed: 5 km/h = 1.39 m/s
  const walkingSpeed = 1.39;
  return distanceMeters / walkingSpeed;
}

/**
 * Calculate total route length
 */
export function calculateRouteLength(route: LineString): number {
  const coords = route.coordinates;
  let length = 0;

  for (let i = 0; i < coords.length - 1; i++) {
    const dx = coords[i + 1][0] - coords[i][0];
    const dy = coords[i + 1][1] - coords[i][1];
    // Simple Euclidean distance (approximate)
    length += Math.sqrt(dx * dx + dy * dy) * 111320; // Convert to meters
  }

  return length;
}
