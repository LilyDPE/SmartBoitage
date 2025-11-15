'use client';

// Map Component - Leaflet-based interactive map
import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default marker icons
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  });
}

export interface MapProps {
  center?: [number, number];
  zoom?: number;
  style?: React.CSSProperties;
  onMapReady?: (map: L.Map) => void;
  children?: React.ReactNode;
  autoGeolocate?: boolean;
  onLocationFound?: (lat: number, lon: number) => void;
}

export default function Map({
  center = [48.8566, 2.3522], // Paris by default
  zoom = 13,
  style = { width: '100%', height: '500px' },
  onMapReady,
  autoGeolocate = false,
  onLocationFound,
}: MapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const locationMarkerRef = useRef<L.CircleMarker | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Initialize map
    const map = L.map(containerRef.current, {
      center: [center[1], center[0]], // Leaflet uses [lat, lon]
      zoom,
      zoomControl: true,
    });

    // Add tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;

    if (onMapReady) {
      onMapReady(map);
    }

    // Auto-geolocate if requested
    if (autoGeolocate && typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;

          // Center map on user location
          map.setView([latitude, longitude], 14);

          // Add location marker
          const marker = L.circleMarker([latitude, longitude], {
            radius: 10,
            color: '#ffffff',
            weight: 3,
            fillColor: '#4285f4',
            fillOpacity: 1,
          }).addTo(map);

          marker.bindPopup('Votre position').openPopup();
          locationMarkerRef.current = marker;

          // Notify parent
          if (onLocationFound) {
            onLocationFound(latitude, longitude);
          }
        },
        (error) => {
          console.warn('Geolocation error:', error.message);
          // Keep default center if geolocation fails
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0,
        }
      );
    }

    // Cleanup
    return () => {
      if (locationMarkerRef.current) {
        locationMarkerRef.current.remove();
      }
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update center when prop changes
  useEffect(() => {
    if (mapRef.current && center) {
      mapRef.current.setView([center[1], center[0]], zoom);
    }
  }, [center, zoom]);

  return <div ref={containerRef} style={style} className="map-container" />;
}

// Hook to access map instance
export function useMap() {
  const [map, setMap] = useState<L.Map | null>(null);
  return { map, setMap };
}

// Utility functions for working with Leaflet

/**
 * Add GeoJSON layer to map
 */
export function addGeoJSONLayer(
  map: L.Map,
  geojson: any,
  options?: L.GeoJSONOptions
): L.GeoJSON {
  const layer = L.geoJSON(geojson, {
    style: {
      color: '#3388ff',
      weight: 3,
      opacity: 0.8,
    },
    ...options,
  });

  layer.addTo(map);
  return layer;
}

/**
 * Add marker to map
 */
export function addMarker(
  map: L.Map,
  lon: number,
  lat: number,
  options?: L.MarkerOptions
): L.Marker {
  const marker = L.marker([lat, lon], options);
  marker.addTo(map);
  return marker;
}

/**
 * Add circle to map
 */
export function addCircle(
  map: L.Map,
  lon: number,
  lat: number,
  radius: number,
  options?: L.CircleMarkerOptions
): L.Circle {
  const circle = L.circle([lat, lon], {
    radius,
    color: '#ff3388',
    fillColor: '#ff3388',
    fillOpacity: 0.2,
    ...options,
  });
  circle.addTo(map);
  return circle;
}

/**
 * Fit map to bounds of GeoJSON
 */
export function fitBounds(map: L.Map, geojson: any) {
  const layer = L.geoJSON(geojson);
  const bounds = layer.getBounds();
  if (bounds.isValid()) {
    map.fitBounds(bounds, { padding: [50, 50] });
  }
}

/**
 * Draw polygon on map
 */
export function drawPolygon(
  map: L.Map,
  coordinates: number[][][],
  options?: L.PolylineOptions
): L.Polygon {
  // Convert GeoJSON coordinates to Leaflet format
  const latlngs = coordinates[0].map((coord) => [coord[1], coord[0]] as [number, number]);

  const polygon = L.polygon(latlngs, {
    color: '#3388ff',
    weight: 3,
    opacity: 0.6,
    fillOpacity: 0.2,
    ...options,
  });

  polygon.addTo(map);
  return polygon;
}

/**
 * Draw line on map
 */
export function drawLine(
  map: L.Map,
  coordinates: number[][],
  options?: L.PolylineOptions
): L.Polyline {
  // Convert GeoJSON coordinates to Leaflet format
  const latlngs = coordinates.map((coord) => [coord[1], coord[0]] as [number, number]);

  const line = L.polyline(latlngs, {
    color: '#ff3388',
    weight: 4,
    opacity: 0.8,
    ...options,
  });

  line.addTo(map);
  return line;
}

/**
 * Add user location marker
 */
export function addLocationMarker(
  map: L.Map,
  lon: number,
  lat: number
): L.CircleMarker {
  const marker = L.circleMarker([lat, lon], {
    radius: 8,
    color: '#ffffff',
    weight: 2,
    fillColor: '#4285f4',
    fillOpacity: 1,
  });

  marker.addTo(map);
  return marker;
}

/**
 * Create custom icon
 */
export function createIcon(
  iconUrl: string,
  iconSize: [number, number] = [25, 41],
  iconAnchor: [number, number] = [12, 41]
): L.Icon {
  return L.icon({
    iconUrl,
    iconSize,
    iconAnchor,
  });
}
