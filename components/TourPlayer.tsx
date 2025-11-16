'use client';

// TourPlayer Component - GPS tracking and tour navigation
import { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import { addLocationMarker, drawLine } from './Map';

export interface TourPlayerProps {
  map: L.Map | null;
  sessionId: string;
  onPositionUpdate?: (lon: number, lat: number) => void;
  onSegmentDetected?: (segmentId: string) => void;
  route?: any; // GeoJSON LineString
  segments?: any[];
  instructions?: any[]; // Turn-by-turn navigation instructions
}

export default function TourPlayer({
  map,
  sessionId,
  onPositionUpdate,
  onSegmentDetected,
  route,
  segments,
  instructions: _instructions,
}: TourPlayerProps) {
  const [watching, setWatching] = useState(false);
  const [position, setPosition] = useState<{ lon: number; lat: number } | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentSegment, setCurrentSegment] = useState<any>(null);

  const watchIdRef = useRef<number | null>(null);
  const locationMarkerRef = useRef<L.CircleMarker | null>(null);
  const accuracyCircleRef = useRef<L.Circle | null>(null);
  const routeLayerRef = useRef<L.Polyline | null>(null);
  const segmentLayersRef = useRef<Map<string, L.Polyline>>(new Map());

  // Start GPS tracking
  const startTracking = () => {
    if (!navigator.geolocation) {
      setError('La géolocalisation n\'est pas supportée par votre navigateur');
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const lon = pos.coords.longitude;
        const lat = pos.coords.latitude;
        const acc = pos.coords.accuracy;

        setPosition({ lon, lat });
        setAccuracy(acc);
        setError(null);

        // Update map
        if (map) {
          // Remove old markers
          if (locationMarkerRef.current) {
            map.removeLayer(locationMarkerRef.current);
          }
          if (accuracyCircleRef.current) {
            map.removeLayer(accuracyCircleRef.current);
          }

          // Add new location marker
          locationMarkerRef.current = addLocationMarker(map, lon, lat);

          // Add accuracy circle
          accuracyCircleRef.current = L.circle([lat, lon], {
            radius: acc,
            color: '#4285f4',
            fillColor: '#4285f4',
            fillOpacity: 0.1,
            weight: 1,
          });
          accuracyCircleRef.current.addTo(map);

          // Center map on user location
          map.setView([lat, lon], map.getZoom());
        }

        // Notify parent
        if (onPositionUpdate) {
          onPositionUpdate(lon, lat);
        }

        // Check for segment detection
        checkSegmentProximity(lon, lat);
      },
      (err) => {
        console.error('Geolocation error:', err);
        setError(`Erreur GPS: ${err.message}`);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 5000,
      }
    );

    watchIdRef.current = watchId;
    setWatching(true);
  };

  // Stop GPS tracking
  const stopTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setWatching(false);
  };

  // Check if user is near any segment
  const checkSegmentProximity = async (lon: number, lat: number) => {
    if (!segments) return;

    // Simple client-side proximity check (would be better on server)
    for (const segment of segments) {
      if (segment.fait) continue; // Skip completed segments

      // This is a simplified check
      // In production, call the API to detect current segment
      // For now, just notify on first incomplete segment
    }

    // Call API to detect segment
    try {
      const response = await fetch('/api/tour/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          lon,
          lat,
        }),
      });

      const data = await response.json();

      if (data.currentSegment) {
        setCurrentSegment(data.currentSegment);
        if (onSegmentDetected && data.currentSegment.id) {
          onSegmentDetected(data.currentSegment.id);
        }
      }
    } catch (err) {
      console.error('Error detecting segment:', err);
    }
  };

  // Draw route on map
  useEffect(() => {
    if (!map || !route) return;

    // Remove old route
    if (routeLayerRef.current) {
      map.removeLayer(routeLayerRef.current);
    }

    // Draw new route
    const routeLayer = drawLine(map, route.coordinates, {
      color: '#3388ff',
      weight: 4,
      opacity: 0.6,
    });

    routeLayerRef.current = routeLayer;

    // Fit map to route
    map.fitBounds(routeLayer.getBounds(), { padding: [50, 50] });

    return () => {
      if (routeLayerRef.current && map) {
        map.removeLayer(routeLayerRef.current);
      }
    };
  }, [map, route]);

  // Draw segments on map
  useEffect(() => {
    if (!map || !segments) return;

    // Clear old segment layers
    segmentLayersRef.current.forEach((layer) => {
      map.removeLayer(layer);
    });
    segmentLayersRef.current.clear();

    // Draw segments with color coding
    for (const segment of segments) {
      if (!segment.geom) continue;

      let color = '#9e9e9e'; // default
      if (segment.fait) {
        color = '#4caf50'; // green for completed
      } else if (segment.statut === 'en_cours') {
        color = '#ff9800'; // orange for in progress
      }

      const layer = drawLine(map, segment.geom.coordinates, {
        color,
        weight: 3,
        opacity: 0.7,
      });

      // Add popup with segment info
      layer.bindPopup(`
        <strong>${segment.street_nom || 'Sans nom'}</strong><br/>
        Côté: ${segment.cote}<br/>
        Longueur: ${Math.round(segment.longueur_m)} m<br/>
        Statut: ${segment.fait ? 'Fait' : 'À faire'}
      `);

      segmentLayersRef.current.set(segment.id, layer);
    }

    return () => {
      segmentLayersRef.current.forEach((layer) => {
        if (map) map.removeLayer(layer);
      });
      segmentLayersRef.current.clear();
    };
  }, [map, segments]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTracking();
    };
  }, []);

  return (
    <div className="tour-player" style={{ padding: '10px' }}>
      <div style={{
        background: '#f5f5f5',
        padding: '15px',
        borderRadius: '5px',
        marginBottom: '10px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: '0 0 5px 0' }}>Suivi GPS</h3>
            {position && (
              <div style={{ fontSize: '12px', color: '#666' }}>
                Position: {position.lat.toFixed(6)}, {position.lon.toFixed(6)}
                {accuracy && <> (±{Math.round(accuracy)}m)</>}
              </div>
            )}
            {currentSegment && (
              <div style={{
                marginTop: '10px',
                padding: '10px',
                background: '#e3f2fd',
                borderRadius: '5px',
              }}>
                <strong>Segment actuel:</strong><br/>
                {currentSegment.streetNom} ({currentSegment.cote})
              </div>
            )}
          </div>

          <button
            onClick={watching ? stopTracking : startTracking}
            style={{
              padding: '10px 20px',
              background: watching ? '#f44336' : '#4caf50',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer',
              fontWeight: 'bold',
            }}
          >
            {watching ? 'Arrêter' : 'Démarrer'} GPS
          </button>
        </div>

        {error && (
          <div style={{
            marginTop: '10px',
            padding: '10px',
            background: '#ffebee',
            color: '#c62828',
            borderRadius: '5px',
            fontSize: '14px',
          }}>
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
