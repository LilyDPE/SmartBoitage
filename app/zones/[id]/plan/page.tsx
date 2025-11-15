'use client';

// Zone Planning Page - Optimize route
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import type L from 'leaflet';
import SegmentList from '@/components/SegmentList';

// Import Map without SSR to avoid Leaflet's window dependency
const MapComponent = dynamic(() => import('@/components/Map'), { ssr: false });

// Utility functions (avoiding SSR issues with direct imports)
const addGeoJSONLayer = (map: L.Map, geojson: any, options?: any) => {
  if (typeof window === 'undefined') return null;
  const L = require('leaflet');
  const layer = L.geoJSON(geojson, {
    style: { color: '#3388ff', weight: 3, opacity: 0.8 },
    ...options,
  });
  layer.addTo(map);
  return layer;
};

const drawLine = (map: L.Map, coordinates: number[][], options?: any) => {
  if (typeof window === 'undefined') return null;
  const L = require('leaflet');
  const latlngs = coordinates.map((coord: number[]) => [coord[1], coord[0]]);
  const line = L.polyline(latlngs, {
    color: '#ff3388',
    weight: 4,
    opacity: 0.8,
    ...options,
  });
  line.addTo(map);
  return line;
};

const fitBounds = (map: L.Map, geojson: any) => {
  if (typeof window === 'undefined') return;
  const L = require('leaflet');
  const layer = L.geoJSON(geojson);
  const bounds = layer.getBounds();
  if (bounds.isValid()) {
    map.fitBounds(bounds, { padding: [50, 50] });
  }
};

export default function ZonePlanPage() {
  const router = useRouter();
  const params = useParams();
  const zoneId = params.id as string;

  const [map, setMap] = useState<L.Map | null>(null);
  const [zone, setZone] = useState<any>(null);
  const [segments, setSegments] = useState<any[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [_route, setRoute] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [optimizing, setOptimizing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [highlightedSegmentId, setHighlightedSegmentId] = useState<string | null>(null);

  const segmentLayersRef = useState<Map<string, L.GeoJSON>>(new Map())[0];
  const [routeLayerRef, setRouteLayerRef] = useState<L.Polyline | null>(null);

  useEffect(() => {
    loadZoneData();
  }, [zoneId]);

  const loadZoneData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/zones/${zoneId}/segments`);
      const data = await response.json();

      if (data.success) {
        setZone(data.zone);
        setSegments(data.segments);
        setStats(data.stats);

        // Draw zone and segments on map
        if (map && data.zone) {
          addGeoJSONLayer(map, data.zone.geom, {
            style: {
              color: '#3388ff',
              weight: 2,
              opacity: 0.6,
              fillOpacity: 0.1,
            },
          });

          fitBounds(map, data.zone.geom);
        }
      } else {
        setError('Zone non trouvée');
      }
    } catch (err) {
      console.error('Error loading zone:', err);
      setError('Erreur lors du chargement de la zone');
    } finally {
      setLoading(false);
    }
  };

  const optimizeRoute = async () => {
    setOptimizing(true);
    setError(null);

    try {
      const response = await fetch(`/api/zones/${zoneId}/planifier`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          profile: 'foot-walking',
          saveToDb: true,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setRoute(data.route);

        // Reload segments to get updated order
        await loadZoneData();

        // Draw route on map
        if (map && data.route.geometry) {
          // Remove old route
          if (routeLayerRef) {
            map.removeLayer(routeLayerRef);
          }

          const routeLayer = drawLine(map, data.route.geometry.coordinates, {
            color: '#ff3388',
            weight: 4,
            opacity: 0.8,
          });

          setRouteLayerRef(routeLayer);

          alert(
            `Parcours optimisé !\nDistance: ${data.stats.totalDistance}\nDurée estimée: ${data.stats.estimatedDuration}`
          );
        }
      } else {
        throw new Error(data.error || 'Erreur lors de l\'optimisation');
      }
    } catch (err: any) {
      console.error('Error optimizing route:', err);
      setError(err.message || 'Erreur lors de l\'optimisation du parcours');
    } finally {
      setOptimizing(false);
    }
  };

  // Draw segments on map
  useEffect(() => {
    if (!map || segments.length === 0) return;

    // Clear old layers
    segmentLayersRef.forEach((layer) => map.removeLayer(layer));
    segmentLayersRef.clear();

    // Draw each segment
    segments.forEach((segment) => {
      if (!segment.geom) return;

      let color = '#9e9e9e';
      if (segment.statut === 'fait') {
        color = '#4caf50';
      } else if (segment.statut === 'en_cours') {
        color = '#ff9800';
      }

      const layer = addGeoJSONLayer(map, segment.geom, {
        style: {
          color,
          weight: 3,
          opacity: 0.7,
        },
        onEachFeature: (_feature: any, layer: any) => {
          layer.bindPopup(`
            <strong>${segment.street_nom || 'Sans nom'}</strong><br/>
            Côté: ${segment.cote}<br/>
            Longueur: ${Math.round(segment.longueur_m)} m<br/>
            Ordre: ${segment.ordre_visite || 'Non défini'}
          `);
        },
      });

      segmentLayersRef.set(segment.id, layer);
    });
  }, [map, segments]);

  const handleSegmentClick = (segment: any) => {
    if (map && segment.geom) {
      fitBounds(map, segment.geom);
    }
  };

  const handleSegmentHover = (segment: any | null) => {
    setHighlightedSegmentId(segment?.id || null);

    if (!map) return;

    // Highlight segment on map
    segmentLayersRef.forEach((layer, id) => {
      if (id === segment?.id) {
        layer.setStyle({ weight: 6, opacity: 1 });
      } else {
        layer.setStyle({ weight: 3, opacity: 0.7 });
      }
    });
  };

  return (
    <div>
      {/* Header */}
      <div className="header">
        <div className="container">
          <button
            onClick={() => router.push('/')}
            style={{
              background: 'none',
              border: 'none',
              color: '#3388ff',
              cursor: 'pointer',
              fontSize: '16px',
              marginBottom: '10px',
            }}
          >
            ← Retour
          </button>
          <h1>{zone?.nom || 'Planification'}</h1>
        </div>
      </div>

      <div className="container">
        {loading && (
          <div className="flex-center" style={{ padding: '40px' }}>
            <div className="spinner"></div>
          </div>
        )}

        {error && (
          <div className="card" style={{ background: '#ffebee', color: '#c62828' }}>
            {error}
          </div>
        )}

        {!loading && !error && (
          <div className="grid" style={{ gridTemplateColumns: '1fr 2fr', gap: '20px' }}>
            {/* Left panel - Segments list */}
            <div>
              <div className="card">
                <div style={{ marginBottom: '20px' }}>
                  <button
                    className="btn btn-primary"
                    onClick={optimizeRoute}
                    disabled={optimizing}
                    style={{ width: '100%', marginBottom: '10px' }}
                  >
                    {optimizing ? 'Optimisation...' : '🚀 Optimiser le parcours'}
                  </button>

                  <button
                    className="btn btn-success"
                    onClick={() => router.push(`/zones/${zoneId}/tour`)}
                    style={{ width: '100%' }}
                  >
                    ▶ Démarrer la tournée
                  </button>
                </div>

                {stats && (
                  <div style={{ marginBottom: '20px' }}>
                    <h3 style={{ marginBottom: '10px' }}>Statistiques</h3>
                    <div style={{ fontSize: '14px', lineHeight: '1.8' }}>
                      <div>Total segments: {stats.total}</div>
                      <div>Côté pair: {stats.pair}</div>
                      <div>Côté impair: {stats.impair}</div>
                      <div>
                        Distance totale: {(stats.totalLength / 1000).toFixed(2)} km
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <SegmentList
                segments={segments}
                onSegmentClick={handleSegmentClick}
                onSegmentHover={handleSegmentHover}
                highlightedSegmentId={highlightedSegmentId || undefined}
              />
            </div>

            {/* Right panel - Map */}
            <div>
              <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
                <MapComponent
                  center={[2.3522, 48.8566]}
                  zoom={13}
                  style={{ width: '100%', height: '800px' }}
                  onMapReady={setMap}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
