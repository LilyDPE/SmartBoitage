'use client';

// Tour Page - GPS-tracked distribution session
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import type L from 'leaflet';
import TourPlayer from '@/components/TourPlayer';
import SegmentList from '@/components/SegmentList';
import NavigationGuide from '@/components/NavigationGuide';

// Import Map without SSR to avoid Leaflet's window dependency
const MapComponent = dynamic(() => import('@/components/Map'), { ssr: false });

export default function TourPage() {
  const router = useRouter();
  const params = useParams();
  const zoneId = params.id as string;

  const [map, setMap] = useState<L.Map | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [zone, setZone] = useState<any>(null);
  const [route, setRoute] = useState<any>(null);
  const [progression, setProgression] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const [instructions, setInstructions] = useState<any[]>([]);
  const [currentPosition, setCurrentPosition] = useState<{ lon: number; lat: number } | null>(null);
  const [voiceEnabled, setVoiceEnabled] = useState(false);

  useEffect(() => {
    startSession();
  }, [zoneId]);

  // Center map on zone when zone data and map are ready
  useEffect(() => {
    if (map && zone?.geom?.coordinates?.[0]?.[0]) {
      const coords = zone.geom.coordinates[0];
      // Calculate bounds from all coordinates
      const lats = coords.map((c: number[]) => c[1]);
      const lons = coords.map((c: number[]) => c[0]);
      const bounds: [[number, number], [number, number]] = [
        [Math.min(...lats), Math.min(...lons)],
        [Math.max(...lats), Math.max(...lons)]
      ];
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [map, zone]);

  const startSession = async () => {
    try {
      setLoading(true);

      // Get zone data first
      const zoneResponse = await fetch(`/api/zones/${zoneId}/segments`);
      const zoneData = await zoneResponse.json();

      if (!zoneData.success) {
        throw new Error('Zone non trouvée');
      }

      setZone(zoneData.zone);

      // Start tour session
      const response = await fetch('/api/tour/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          zoneId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSessionId(data.session.id);
        setProgression(data.progression);

        // Fetch optimized route with instructions
        if (zoneData.zone.route_geom) {
          setRoute(zoneData.zone.route_geom);
        }

        // If we have route instructions, load them
        if (zoneData.zone.route_instructions) {
          setInstructions(zoneData.zone.route_instructions);
        }
      } else {
        throw new Error(data.error || 'Erreur lors du démarrage de la tournée');
      }
    } catch (err: any) {
      console.error('Error starting session:', err);
      setError(err.message || 'Erreur lors du démarrage de la tournée');
    } finally {
      setLoading(false);
    }
  };

  const handlePositionUpdate = async (lon: number, lat: number) => {
    if (!sessionId) return;

    // Update current position for navigation
    setCurrentPosition({ lon, lat });

    // Update position and check for segment completion
    try {
      const response = await fetch('/api/tour/update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          lon,
          lat,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setProgression(data.progression);
      }
    } catch (err) {
      console.error('Error updating position:', err);
    }
  };

  const handlePause = async () => {
    if (!sessionId) return;

    try {
      const response = await fetch('/api/tour/pause', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setPaused(true);
      }
    } catch (err) {
      console.error('Error pausing tour:', err);
    }
  };

  const handleResume = async () => {
    if (!sessionId) return;

    try {
      const response = await fetch('/api/tour/resume', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setPaused(false);
        setProgression(data.progression);
      }
    } catch (err) {
      console.error('Error resuming tour:', err);
    }
  };

  const handleComplete = () => {
    if (!sessionId) return;

    if (
      !confirm('Êtes-vous sûr de vouloir terminer cette tournée ?')
    ) {
      return;
    }

    router.push('/');
  };

  const completionPercentage = progression
    ? Math.round((progression.completed / progression.total) * 100)
    : 0;

  return (
    <div>
      {/* Header */}
      <div className="header">
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1>{zone?.nom || 'Tournée en cours'}</h1>
              {progression && (
                <div style={{ fontSize: '14px', color: '#666', marginTop: '5px' }}>
                  Progression: {progression.completed} / {progression.total} segments (
                  {completionPercentage}%)
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                className={voiceEnabled ? "btn btn-primary" : "btn btn-secondary"}
                onClick={() => setVoiceEnabled(!voiceEnabled)}
                title={voiceEnabled ? "Désactiver le guidage vocal" : "Activer le guidage vocal"}
              >
                {voiceEnabled ? '🔊' : '🔇'} Voix
              </button>
              {!paused ? (
                <button className="btn btn-secondary" onClick={handlePause}>
                  ⏸ Pause
                </button>
              ) : (
                <button className="btn btn-primary" onClick={handleResume}>
                  ▶ Reprendre
                </button>
              )}
              <button className="btn btn-success" onClick={handleComplete}>
                ✓ Terminer
              </button>
            </div>
          </div>
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

        {!loading && !error && sessionId && (
          <div>
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
              {progression && (
                <div
                  style={{
                    marginTop: '10px',
                    fontSize: '14px',
                    color: '#666',
                    display: 'flex',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>{progression.completed} segments complétés</span>
                  <span>{progression.remaining} restants</span>
                </div>
              )}
            </div>

            <div className="grid" style={{ gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
              {/* Left panel - Map and GPS */}
              <div>
                {/* Navigation Guide */}
                <NavigationGuide
                  instructions={instructions}
                  currentPosition={currentPosition}
                  route={route}
                  voiceEnabled={voiceEnabled}
                />

                <div className="card" style={{ padding: '0', overflow: 'hidden', marginTop: '20px' }}>
                  <MapComponent
                    center={zone?.geom?.coordinates?.[0]?.[0] ? [
                      zone.geom.coordinates[0][0][1], // lat
                      zone.geom.coordinates[0][0][0]  // lon
                    ] : [50.05, 1.55]} // Default: Nord de la France
                    zoom={15}
                    style={{ width: '100%', height: '600px' }}
                    onMapReady={setMap}
                    autoGeolocate={true}
                  />
                </div>

                <TourPlayer
                  map={map}
                  sessionId={sessionId}
                  onPositionUpdate={handlePositionUpdate}
                  route={route}
                  segments={progression?.segments}
                  instructions={instructions}
                />
              </div>

              {/* Right panel - Segment list */}
              <div>
                {progression?.segments && (
                  <SegmentList
                    segments={progression.segments}
                    showCompleted={true}
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
