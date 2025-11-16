'use client';

// Quick Tour Active Page - Execute quick tour with GPS navigation
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import type L from 'leaflet';
import NavigationGuide from '@/components/NavigationGuide';

// Import Map without SSR
const MapComponent = dynamic(() => import('@/components/Map'), { ssr: false });

export default function QuickTourActivePage() {
  const router = useRouter();
  const [map, setMap] = useState<L.Map | null>(null);
  const [tour, setTour] = useState<any>(null);
  const [currentPosition, setCurrentPosition] = useState<{ lon: number; lat: number } | null>(null);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [watching, setWatching] = useState(false);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [completedSegments, setCompletedSegments] = useState<Set<string>>(new Set());
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState<number | null>(null);

  const watchIdRef = useRef<number | null>(null);
  const locationMarkerRef = useRef<L.CircleMarker | null>(null);
  const accuracyCircleRef = useRef<L.Circle | null>(null);

  // Load tour from session storage
  useEffect(() => {
    const storedTour = sessionStorage.getItem('quickTour');
    if (!storedTour) {
      router.push('/quick-tour');
      return;
    }

    try {
      const tourData = JSON.parse(storedTour);
      setTour(tourData);
    } catch (err) {
      console.error('Error parsing tour data:', err);
      setError('Erreur lors du chargement de la tournée');
    }
  }, [router]);

  // Start GPS tracking automatically
  useEffect(() => {
    if (tour) {
      startTracking();
    }
    return () => {
      stopTracking();
    };
  }, [tour]);

  // Draw route and segments on map
  useEffect(() => {
    if (!map || !tour) return;

    const L = require('leaflet');

    // Clear previous layers
    map.eachLayer((layer: any) => {
      if (layer instanceof L.Polyline || layer instanceof L.Marker) {
        if (!layer.options.permanent) {
          map.removeLayer(layer);
        }
      }
    });

    // Draw route
    if (tour.route) {
      const routeLayer = L.geoJSON(tour.route, {
        style: {
          color: '#667eea',
          weight: 4,
          opacity: 0.7,
        },
      }).addTo(map);

      map.fitBounds(routeLayer.getBounds(), { padding: [50, 50] });
    }

    // Draw segments with color coding
    if (tour.segments) {
      tour.segments.forEach((seg: any, idx: number) => {
        if (!seg.geom || !seg.geom.coordinates) return;

        const isCompleted = completedSegments.has(seg.id);
        const isCurrent = currentSegmentIndex === idx;

        let color = '#9e9e9e'; // default
        if (isCompleted) {
          color = '#4caf50'; // green for completed
        } else if (isCurrent) {
          color = '#ff9800'; // orange for current
        }

        L.geoJSON(seg.geom, {
          style: {
            color,
            weight: 3,
            opacity: 0.7,
          },
        }).addTo(map).bindPopup(`
          <strong>${idx + 1}. ${seg.street_nom || 'Sans nom'}</strong><br/>
          Côté: ${seg.cote}<br/>
          ${Math.round(seg.longueur_m)} m<br/>
          ${isCompleted ? '✅ Complété' : isCurrent ? '🔵 En cours' : '⏳ À faire'}
        `);
      });
    }
  }, [map, tour, completedSegments, currentSegmentIndex]);

  const startTracking = () => {
    if (!navigator.geolocation) {
      setError('La géolocalisation n\'est pas supportée');
      return;
    }

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const lon = pos.coords.longitude;
        const lat = pos.coords.latitude;
        const acc = pos.coords.accuracy;

        setCurrentPosition({ lon, lat });
        setAccuracy(acc);
        setError(null);

        // Update map
        if (map) {
          const L = require('leaflet');

          // Remove old markers
          if (locationMarkerRef.current) {
            map.removeLayer(locationMarkerRef.current);
          }
          if (accuracyCircleRef.current) {
            map.removeLayer(accuracyCircleRef.current);
          }

          // Add new location marker
          locationMarkerRef.current = L.circleMarker([lat, lon], {
            radius: 8,
            fillColor: '#4285f4',
            color: 'white',
            weight: 2,
            fillOpacity: 1,
          }).addTo(map);

          // Add accuracy circle
          accuracyCircleRef.current = L.circle([lat, lon], {
            radius: acc,
            color: '#4285f4',
            fillColor: '#4285f4',
            fillOpacity: 0.1,
            weight: 1,
          }).addTo(map);
        }

        // Check for segment proximity
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

  const stopTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setWatching(false);
  };

  const checkSegmentProximity = (lon: number, lat: number) => {
    if (!tour || !tour.segments) return;

    // Find nearest uncompleted segment
    let nearestIndex = -1;
    let nearestDistance = Infinity;

    tour.segments.forEach((seg: any, idx: number) => {
      if (completedSegments.has(seg.id)) return;

      // Calculate distance to segment midpoint
      const midpoint = seg.midpoint || [seg.geom?.coordinates?.[0]?.[0], seg.geom?.coordinates?.[0]?.[1]];
      if (!midpoint) return;

      const distance = haversineDistance(lon, lat, midpoint[0], midpoint[1]);

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = idx;
      }
    });

    // If within 30m of a segment, mark as current
    if (nearestDistance < 30 && nearestIndex !== -1) {
      setCurrentSegmentIndex(nearestIndex);
    }
  };

  const haversineDistance = (lon1: number, lat1: number, lon2: number, lat2: number): number => {
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
  };

  const handleMarkSegmentComplete = (segmentId: string) => {
    setCompletedSegments((prev) => new Set([...prev, segmentId]));

    // Move to next segment
    if (tour && tour.segments) {
      const currentIdx = tour.segments.findIndex((s: any) => s.id === segmentId);
      const nextIdx = tour.segments.findIndex((s: any, idx: number) =>
        idx > currentIdx && !completedSegments.has(s.id)
      );
      if (nextIdx !== -1) {
        setCurrentSegmentIndex(nextIdx);
      } else {
        setCurrentSegmentIndex(null);
      }
    }
  };

  const handleCompleteTour = () => {
    if (!confirm('Terminer la tournée ?')) return;

    // Clear session storage
    sessionStorage.removeItem('quickTour');

    // Redirect to home
    router.push('/');
  };

  if (!tour) {
    return (
      <div className="flex-center" style={{ padding: '40px' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  const completionPercentage = tour.segments
    ? Math.round((completedSegments.size / tour.segments.length) * 100)
    : 0;

  return (
    <div>
      {/* Header */}
      <div className="header">
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1>⚡ Micro-Tournée en cours</h1>
              <div style={{ fontSize: '14px', color: '#666', marginTop: '5px' }}>
                Progression: {completedSegments.size} / {tour.segments?.length || 0} segments (
                {completionPercentage}%)
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                className={voiceEnabled ? "btn btn-primary" : "btn btn-secondary"}
                onClick={() => setVoiceEnabled(!voiceEnabled)}
                title={voiceEnabled ? "Désactiver le guidage vocal" : "Activer le guidage vocal"}
              >
                {voiceEnabled ? '🔊' : '🔇'} Voix
              </button>
              <button
                className="btn btn-success"
                onClick={handleCompleteTour}
              >
                ✓ Terminer
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container">
        {/* Progress bar */}
        <div className="card" style={{ marginBottom: '20px' }}>
          <div style={{ marginBottom: '10px' }}>
            <strong>Progression globale</strong>
          </div>
          <div
            style={{
              width: '100%',
              height: '30px',
              background: '#e0e0e0',
              borderRadius: '15px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${completionPercentage}%`,
                height: '100%',
                background: 'linear-gradient(90deg, #4caf50, #8bc34a)',
                transition: 'width 0.3s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: 'bold',
              }}
            >
              {completionPercentage}%
            </div>
          </div>
        </div>

        <div className="grid" style={{ gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
          {/* Left panel - Map and Navigation */}
          <div>
            {/* Navigation Guide */}
            <NavigationGuide
              instructions={tour.instructions}
              currentPosition={currentPosition}
              route={tour.route}
              voiceEnabled={voiceEnabled}
            />

            {/* Map */}
            <div className="card" style={{ padding: '0', overflow: 'hidden', marginTop: '20px' }}>
              <MapComponent
                center={tour.startPoint || [2.3522, 48.8566]}
                zoom={15}
                style={{ width: '100%', height: '600px' }}
                onMapReady={setMap}
              />
            </div>

            {/* GPS Status */}
            <div className="card" style={{ marginTop: '20px' }}>
              <h3 style={{ fontSize: '16px', marginBottom: '10px' }}>📍 Suivi GPS</h3>
              {currentPosition ? (
                <div style={{ fontSize: '14px', color: '#666' }}>
                  Position: {currentPosition.lat.toFixed(6)}, {currentPosition.lon.toFixed(6)}
                  {accuracy && <> (±{Math.round(accuracy)}m)</>}
                </div>
              ) : (
                <div style={{ fontSize: '14px', color: '#666' }}>
                  En attente du signal GPS...
                </div>
              )}

              {error && (
                <div
                  style={{
                    marginTop: '10px',
                    padding: '10px',
                    background: '#ffebee',
                    color: '#c62828',
                    borderRadius: '5px',
                    fontSize: '14px',
                  }}
                >
                  {error}
                </div>
              )}
            </div>
          </div>

          {/* Right panel - Segment list */}
          <div>
            <div className="card">
              <h3 style={{ fontSize: '16px', marginBottom: '10px' }}>
                📋 Segments ({completedSegments.size}/{tour.segments?.length || 0})
              </h3>

              <div style={{ maxHeight: '700px', overflowY: 'auto' }}>
                {tour.segments?.map((seg: any, idx: number) => {
                  const isCompleted = completedSegments.has(seg.id);
                  const isCurrent = currentSegmentIndex === idx;

                  return (
                    <div
                      key={seg.id}
                      style={{
                        padding: '12px',
                        marginBottom: '10px',
                        background: isCompleted
                          ? '#e8f5e9'
                          : isCurrent
                          ? '#fff3e0'
                          : '#f5f5f5',
                        borderRadius: '5px',
                        borderLeft: `4px solid ${
                          isCompleted ? '#4caf50' : isCurrent ? '#ff9800' : '#9e9e9e'
                        }`,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                        <strong style={{ fontSize: '14px' }}>
                          {idx + 1}. {seg.street_nom || 'Sans nom'}
                        </strong>
                        {isCompleted && <span>✅</span>}
                        {isCurrent && <span>🔵</span>}
                      </div>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        Côté: {seg.cote} • {Math.round(seg.longueur_m)} m
                      </div>
                      {isCurrent && !isCompleted && (
                        <button
                          className="btn btn-success"
                          onClick={() => handleMarkSegmentComplete(seg.id)}
                          style={{ width: '100%', marginTop: '10px', fontSize: '12px', padding: '6px' }}
                        >
                          ✓ Marquer comme fait
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
