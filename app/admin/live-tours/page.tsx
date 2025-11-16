'use client';

// Admin Live Tour Tracking - Real-time tracking of all active commercials
import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import type L from 'leaflet';

// Import Map without SSR to avoid Leaflet's window dependency
const MapComponent = dynamic(() => import('@/components/Map'), { ssr: false });

interface TourUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface TourPosition {
  lon: number;
  lat: number;
}

interface TourProgress {
  total: number;
  completed: number;
  remaining: number;
  percentage: number;
}

interface LiveTour {
  sessionId: string;
  zoneId: string;
  zoneName: string;
  status: string;
  startTime: string;
  lastUpdate: string;
  user: TourUser;
  position: TourPosition | null;
  progress: TourProgress;
  elapsedMinutes: number;
}

export default function LiveToursPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [map, setMap] = useState<L.Map | null>(null);
  const [tours, setTours] = useState<LiveTour[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Check authorization
  useEffect(() => {
    if (status === 'loading') return;

    if (!session) {
      router.push('/auth/login');
      return;
    }

    const user = session.user as any;
    if (user.role !== 'admin') {
      router.push('/');
      return;
    }
  }, [session, status, router]);

  // Fetch live tours
  const fetchLiveTours = async () => {
    try {
      const response = await fetch('/api/admin/live-tours');
      const data = await response.json();

      if (data.success) {
        setTours(data.tours);
        setLastRefresh(new Date());
        setError(null);

        // Update map markers
        if (map) {
          updateMapMarkers(data.tours);
        }
      } else {
        throw new Error(data.error || 'Erreur lors du chargement');
      }
    } catch (err: any) {
      console.error('Error fetching live tours:', err);
      setError(err.message || 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    fetchLiveTours();
  }, []);

  // Auto-refresh every 15 seconds
  useEffect(() => {
    if (!autoRefresh) {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
        refreshIntervalRef.current = null;
      }
      return;
    }

    refreshIntervalRef.current = setInterval(() => {
      fetchLiveTours();
    }, 15000); // 15 seconds

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [autoRefresh, map]);

  // Update markers on map
  const updateMapMarkers = (toursList: LiveTour[]) => {
    if (!map) return;

    // Import Leaflet for marker creation
    import('leaflet').then((L) => {
      // Clear old markers
      markersRef.current.forEach((marker) => {
        map.removeLayer(marker);
      });
      markersRef.current.clear();

      // Add new markers for each active tour
      toursList.forEach((tour) => {
        if (!tour.position) return;

        // Create custom icon with user initial
        const initial = tour.user.name.charAt(0).toUpperCase();
        const iconHtml = `
          <div style="
            width: 40px;
            height: 40px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border: 3px solid white;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            font-size: 18px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          ">
            ${initial}
          </div>
        `;

        const icon = L.divIcon({
          html: iconHtml,
          className: 'custom-marker',
          iconSize: [40, 40],
          iconAnchor: [20, 20],
        });

        const marker = L.marker([tour.position.lat, tour.position.lon], { icon })
          .addTo(map)
          .bindPopup(`
            <div style="min-width: 200px;">
              <h3 style="margin: 0 0 10px 0; color: #333;">
                ${tour.user.name}
              </h3>
              <div style="margin-bottom: 8px;">
                <strong>Zone:</strong> ${tour.zoneName}
              </div>
              <div style="margin-bottom: 8px;">
                <strong>Progression:</strong> ${tour.progress.completed}/${tour.progress.total} (${tour.progress.percentage}%)
              </div>
              <div style="margin-bottom: 8px;">
                <strong>Temps écoulé:</strong> ${tour.elapsedMinutes} min
              </div>
              <div style="margin-bottom: 8px;">
                <strong>Dernière mise à jour:</strong><br/>
                ${new Date(tour.lastUpdate).toLocaleTimeString('fr-FR')}
              </div>
              <a href="/zones/${tour.zoneId}" style="
                display: inline-block;
                margin-top: 8px;
                padding: 6px 12px;
                background: #3388ff;
                color: white;
                text-decoration: none;
                border-radius: 4px;
                font-size: 12px;
              ">
                Voir la zone
              </a>
            </div>
          `);

        markersRef.current.set(tour.sessionId, marker);
      });

      // Auto-fit bounds if there are markers
      if (toursList.length > 0 && toursList.some((t) => t.position)) {
        const bounds = L.latLngBounds(
          toursList
            .filter((t) => t.position)
            .map((t) => [t.position!.lat, t.position!.lon] as [number, number])
        );
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    });
  };

  // Update markers when map is ready
  useEffect(() => {
    if (map && tours.length > 0) {
      updateMapMarkers(tours);
    }
  }, [map]);

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}min`;
    }
    return `${mins}min`;
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex-center" style={{ padding: '40px' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="header">
        <div className="container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h1>📍 Tournées en direct</h1>
              <p style={{ margin: '5px 0 0 0', fontSize: '14px', color: '#666' }}>
                Suivi en temps réel de {tours.length} tournée{tours.length !== 1 ? 's' : ''} active{tours.length !== 1 ? 's' : ''}
              </p>
            </div>

            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <div style={{ fontSize: '12px', color: '#666' }}>
                Dernière mise à jour: {lastRefresh.toLocaleTimeString('fr-FR')}
              </div>
              <button
                className={autoRefresh ? 'btn btn-primary' : 'btn btn-secondary'}
                onClick={() => setAutoRefresh(!autoRefresh)}
                title={autoRefresh ? 'Désactiver le rafraîchissement automatique' : 'Activer le rafraîchissement automatique'}
              >
                {autoRefresh ? '🔄 Auto' : '⏸ Manuel'}
              </button>
              <button
                className="btn btn-secondary"
                onClick={fetchLiveTours}
              >
                🔄 Actualiser
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => router.push('/admin')}
              >
                ← Retour
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="container">
        {error && (
          <div className="card" style={{ background: '#ffebee', color: '#c62828', marginBottom: '20px' }}>
            ⚠️ {error}
          </div>
        )}

        {tours.length === 0 && !loading && (
          <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>📍</div>
            <h2>Aucune tournée active</h2>
            <p style={{ color: '#666', marginTop: '10px' }}>
              Il n'y a actuellement aucun commercial en tournée.
            </p>
          </div>
        )}

        {tours.length > 0 && (
          <div className="grid" style={{ gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
            {/* Left panel - Map */}
            <div>
              <div className="card" style={{ padding: '0', overflow: 'hidden', height: '700px' }}>
                <MapComponent
                  center={[48.8566, 2.3522]}
                  zoom={13}
                  style={{ width: '100%', height: '100%' }}
                  onMapReady={setMap}
                />
              </div>
            </div>

            {/* Right panel - Tour list */}
            <div>
              <div className="card">
                <h2 style={{ margin: '0 0 20px 0' }}>Tournées actives</h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  {tours.map((tour) => (
                    <div
                      key={tour.sessionId}
                      style={{
                        padding: '15px',
                        background: '#f9f9f9',
                        borderRadius: '8px',
                        border: '1px solid #e0e0e0',
                      }}
                    >
                      {/* User info */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                        <div
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 'bold',
                            fontSize: '18px',
                          }}
                        >
                          {tour.user.name.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: '600', marginBottom: '2px' }}>
                            {tour.user.name}
                          </div>
                          <div style={{ fontSize: '12px', color: '#666' }}>
                            {tour.user.email}
                          </div>
                        </div>
                      </div>

                      {/* Zone */}
                      <div style={{ marginBottom: '8px' }}>
                        <strong>Zone:</strong>{' '}
                        <a
                          href={`/zones/${tour.zoneId}`}
                          style={{ color: '#3388ff', textDecoration: 'none' }}
                        >
                          {tour.zoneName}
                        </a>
                      </div>

                      {/* Progress bar */}
                      <div style={{ marginBottom: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', fontSize: '13px' }}>
                          <span><strong>Progression:</strong></span>
                          <span>{tour.progress.percentage}%</span>
                        </div>
                        <div
                          style={{
                            width: '100%',
                            height: '8px',
                            background: '#e0e0e0',
                            borderRadius: '4px',
                            overflow: 'hidden',
                          }}
                        >
                          <div
                            style={{
                              width: `${tour.progress.percentage}%`,
                              height: '100%',
                              background: 'linear-gradient(90deg, #4caf50, #8bc34a)',
                              transition: 'width 0.3s',
                            }}
                          />
                        </div>
                        <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                          {tour.progress.completed}/{tour.progress.total} segments
                        </div>
                      </div>

                      {/* Stats */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '12px', fontSize: '13px' }}>
                        <div>
                          <div style={{ color: '#666' }}>Temps écoulé</div>
                          <div style={{ fontWeight: '600' }}>{formatDuration(tour.elapsedMinutes)}</div>
                        </div>
                        <div>
                          <div style={{ color: '#666' }}>Restants</div>
                          <div style={{ fontWeight: '600' }}>{tour.progress.remaining} segments</div>
                        </div>
                      </div>

                      {/* Last update */}
                      <div style={{ marginTop: '12px', fontSize: '12px', color: '#999' }}>
                        📍 Dernière position: {new Date(tour.lastUpdate).toLocaleTimeString('fr-FR')}
                      </div>

                      {!tour.position && (
                        <div style={{ marginTop: '8px', padding: '8px', background: '#fff3cd', borderRadius: '4px', fontSize: '12px', color: '#856404' }}>
                          ⚠️ Position GPS non disponible
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Summary stats */}
              <div className="card" style={{ marginTop: '20px' }}>
                <h3 style={{ margin: '0 0 15px 0' }}>Résumé</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Tournées actives:</span>
                    <strong>{tours.length}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Segments complétés:</span>
                    <strong>{tours.reduce((sum, t) => sum + t.progress.completed, 0)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Segments restants:</span>
                    <strong>{tours.reduce((sum, t) => sum + t.progress.remaining, 0)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Temps total:</span>
                    <strong>{formatDuration(tours.reduce((sum, t) => sum + t.elapsedMinutes, 0))}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
