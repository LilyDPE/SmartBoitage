'use client';

// Quick Tour Page - Generate optimal tour based on available time
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import type L from 'leaflet';

// Import Map without SSR
const MapComponent = dynamic(() => import('@/components/Map'), { ssr: false });

export default function QuickTourPage() {
  const router = useRouter();
  const [map, setMap] = useState<L.Map | null>(null);
  const [position, setPosition] = useState<{ lon: number; lat: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [customDuration, setCustomDuration] = useState('');
  const [numberOfPeople, setNumberOfPeople] = useState(1);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tour, setTour] = useState<any>(null);
  const [tours, setTours] = useState<any[] | null>(null);
  const [stats, setStats] = useState<any>(null);

  // Preset durations
  const presetDurations = [30, 60, 90, 120];

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setError('La géolocalisation n\'est pas supportée par votre navigateur');
      return;
    }

    setLocating(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lon = pos.coords.longitude;
        const lat = pos.coords.latitude;
        setPosition({ lon, lat });
        setLocating(false);

        // Center map on user location
        if (map) {
          map.setView([lat, lon], 15);

          // Add marker for user location
          const L = require('leaflet');
          L.marker([lat, lon], {
            icon: L.divIcon({
              className: 'user-location-marker',
              html: '<div style="background: #4285f4; width: 16px; height: 16px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
            }),
          }).addTo(map).bindPopup('Votre position');
        }
      },
      (err) => {
        console.error('Geolocation error:', err);
        setError(`Erreur de géolocalisation: ${err.message}`);
        setLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const handleGenerateTour = async () => {
    if (!position) {
      setError('Veuillez d\'abord obtenir votre position');
      return;
    }

    setGenerating(true);
    setError(null);
    setTour(null);
    setTours(null);

    try {
      const response = await fetch('/api/quick-tour', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lon: position.lon,
          lat: position.lat,
          durationMinutes,
          numberOfPeople,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || data.error || 'Erreur lors de la génération');
      }

      if (data.numberOfPeople === 2) {
        setTours(data.tours);
      } else {
        setTour(data.tour);
      }
      setStats(data.stats);

      // Draw route(s) on map
      if (map) {
        const L = require('leaflet');

        // Clear previous layers
        map.eachLayer((layer: any) => {
          if (layer instanceof L.Polyline || layer instanceof L.Marker) {
            if (!layer.options.permanent) {
              map.removeLayer(layer);
            }
          }
        });

        // Handle 2-person mode
        if (data.numberOfPeople === 2 && data.tours) {
          const colors = ['#667eea', '#f093fb']; // Different colors for each person

          data.tours.forEach((tourData: any, tourIdx: number) => {
            if (!tourData.route) return;

            // Draw route
            const routeLayer = L.geoJSON(tourData.route, {
              style: {
                color: colors[tourIdx],
                weight: 4,
                opacity: 0.8,
              },
            }).addTo(map).bindPopup(tourData.label);

            // Draw segment markers
            if (tourData.segments) {
              tourData.segments.forEach((seg: any, idx: number) => {
                if (seg.geom && seg.geom.coordinates) {
                  L.geoJSON(seg.geom, {
                    style: {
                      color: colors[tourIdx],
                      weight: 3,
                      opacity: 0.6,
                    },
                  }).addTo(map).bindPopup(`
                    <strong>${tourData.label}</strong><br/>
                    ${idx + 1}. ${seg.street_nom || 'Sans nom'}<br/>
                    Côté: ${seg.cote}<br/>
                    ${Math.round(seg.longueur_m)} m
                  `);
                }
              });
            }
          });
        }
        // Single person mode
        else if (data.tour && data.tour.route) {
          // Draw route
          const routeLayer = L.geoJSON(data.tour.route, {
            style: {
              color: '#667eea',
              weight: 4,
              opacity: 0.8,
            },
          }).addTo(map);

          // Draw segment markers
          if (data.tour.segments) {
            data.tour.segments.forEach((seg: any, idx: number) => {
              if (seg.geom && seg.geom.coordinates) {
                L.geoJSON(seg.geom, {
                  style: {
                    color: '#4caf50',
                    weight: 3,
                    opacity: 0.6,
                  },
                }).addTo(map).bindPopup(`
                  <strong>${idx + 1}. ${seg.street_nom || 'Sans nom'}</strong><br/>
                  Côté: ${seg.cote}<br/>
                  ${Math.round(seg.longueur_m)} m
                `);
              }
            });
          }

          // Fit map to route
          map.fitBounds(routeLayer.getBounds(), { padding: [50, 50] });
        }
      }
    } catch (err: any) {
      console.error('Error generating tour:', err);
      setError(err.message || 'Erreur lors de la génération de l\'itinéraire');
    } finally {
      setGenerating(false);
    }
  };

  const handleStartTour = () => {
    if (!tour) return;

    // Save tour to session storage for the tour page
    sessionStorage.setItem('quickTour', JSON.stringify(tour));

    // Redirect to a temporary tour session
    router.push('/quick-tour/active');
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
          <h1>⚡ Micro-Tournée Express</h1>
          <p style={{ color: '#666', marginTop: '5px' }}>
            Générez un itinéraire optimal basé sur votre position et le temps disponible
          </p>
        </div>
      </div>

      <div className="container">
        <div className="grid" style={{ gridTemplateColumns: '1fr 2fr', gap: '20px' }}>
          {/* Left panel - Configuration */}
          <div>
            <div className="card">
              <h2 style={{ marginBottom: '20px' }}>Configuration</h2>

              {/* Step 1: Get location */}
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ fontSize: '16px', marginBottom: '10px' }}>
                  1️⃣ Votre position
                </h3>
                {!position ? (
                  <button
                    className="btn btn-primary"
                    onClick={handleGetLocation}
                    disabled={locating}
                    style={{ width: '100%' }}
                  >
                    {locating ? '📍 Localisation...' : '📍 Me localiser'}
                  </button>
                ) : (
                  <div
                    style={{
                      padding: '10px',
                      background: '#e8f5e9',
                      borderRadius: '5px',
                      fontSize: '14px',
                    }}
                  >
                    ✅ Position détectée
                    <div style={{ color: '#666', fontSize: '12px', marginTop: '5px' }}>
                      {position.lat.toFixed(5)}, {position.lon.toFixed(5)}
                    </div>
                  </div>
                )}
              </div>

              {/* Step 2: Number of people */}
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ fontSize: '16px', marginBottom: '10px' }}>
                  2️⃣ Nombre de personnes
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <button
                    className={numberOfPeople === 1 ? 'btn btn-primary' : 'btn btn-secondary'}
                    onClick={() => setNumberOfPeople(1)}
                  >
                    👤 Seul
                  </button>
                  <button
                    className={numberOfPeople === 2 ? 'btn btn-primary' : 'btn btn-secondary'}
                    onClick={() => setNumberOfPeople(2)}
                  >
                    👥 À deux
                  </button>
                </div>
              </div>

              {/* Step 3: Choose duration */}
              <div style={{ marginBottom: '20px' }}>
                <h3 style={{ fontSize: '16px', marginBottom: '10px' }}>
                  3️⃣ Temps disponible
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '10px' }}>
                  {presetDurations.map((duration) => (
                    <button
                      key={duration}
                      className={durationMinutes === duration ? 'btn btn-primary' : 'btn btn-secondary'}
                      onClick={() => {
                        setDurationMinutes(duration);
                        setCustomDuration('');
                      }}
                    >
                      {duration < 60 ? `${duration}min` : `${duration / 60}h`}
                    </button>
                  ))}
                </div>

                <div>
                  <label style={{ fontSize: '14px', display: 'block', marginBottom: '5px' }}>
                    Durée personnalisée (minutes)
                  </label>
                  <input
                    type="number"
                    value={customDuration}
                    onChange={(e) => {
                      setCustomDuration(e.target.value);
                      const val = parseInt(e.target.value);
                      if (val > 0) setDurationMinutes(val);
                    }}
                    placeholder="Ex: 45"
                    min="10"
                    max="300"
                  />
                </div>
              </div>

              {/* Step 4: Generate */}
              <button
                className="btn btn-primary"
                onClick={handleGenerateTour}
                disabled={!position || generating}
                style={{ width: '100%', marginBottom: '10px' }}
              >
                {generating ? '⚙️ Génération...' : '🚀 Générer l\'itinéraire'}
              </button>

              {error && (
                <div
                  style={{
                    padding: '10px',
                    background: '#ffebee',
                    color: '#c62828',
                    borderRadius: '5px',
                    fontSize: '14px',
                    marginTop: '10px',
                  }}
                >
                  {error}
                </div>
              )}

              {stats && numberOfPeople === 1 && (
                <div
                  style={{
                    marginTop: '20px',
                    padding: '15px',
                    background: '#e3f2fd',
                    borderRadius: '5px',
                  }}
                >
                  <h3 style={{ fontSize: '16px', marginBottom: '10px' }}>
                    📊 Statistiques
                  </h3>
                  <div style={{ fontSize: '14px', lineHeight: '1.8' }}>
                    <div><strong>Segments :</strong> {stats.segmentCount}</div>
                    <div><strong>Distance :</strong> {stats.totalDistance}</div>
                    <div><strong>Durée :</strong> {stats.totalDuration}</div>
                    <div>
                      <strong>Statut :</strong>{' '}
                      <span style={{ color: stats.efficiency === 'optimal' ? '#4caf50' : '#ff9800' }}>
                        {stats.efficiency === 'optimal' ? '✅ Optimal' : '⚠️ Dépassement'}
                      </span>
                    </div>
                  </div>

                  <button
                    className="btn btn-success"
                    onClick={handleStartTour}
                    style={{ width: '100%', marginTop: '15px' }}
                  >
                    ▶️ Démarrer la tournée
                  </button>
                </div>
              )}

              {stats && numberOfPeople === 2 && tours && (
                <div
                  style={{
                    marginTop: '20px',
                    padding: '15px',
                    background: '#e3f2fd',
                    borderRadius: '5px',
                  }}
                >
                  <h3 style={{ fontSize: '16px', marginBottom: '10px' }}>
                    📊 Statistiques (2 personnes)
                  </h3>
                  <div style={{ fontSize: '14px', lineHeight: '1.8' }}>
                    <div><strong>Total segments :</strong> {stats.totalSegments}</div>
                    <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #ddd' }}>
                      <div style={{ color: '#667eea', fontWeight: 'bold' }}>👤 Personne 1 (Côté pair)</div>
                      <div><strong>Segments :</strong> {stats.tour1Segments}</div>
                      {tours[0] && (
                        <>
                          <div><strong>Distance :</strong> {tours[0].stats.totalDistance}</div>
                          <div><strong>Durée :</strong> {tours[0].stats.totalDuration}</div>
                        </>
                      )}
                    </div>
                    <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid #ddd' }}>
                      <div style={{ color: '#f093fb', fontWeight: 'bold' }}>👤 Personne 2 (Côté impair)</div>
                      <div><strong>Segments :</strong> {stats.tour2Segments}</div>
                      {tours[1] && (
                        <>
                          <div><strong>Distance :</strong> {tours[1].stats.totalDistance}</div>
                          <div><strong>Durée :</strong> {tours[1].stats.totalDuration}</div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Instructions */}
            <div className="card" style={{ marginTop: '20px' }}>
              <h3 style={{ fontSize: '16px', marginBottom: '10px' }}>💡 Comment ça marche ?</h3>
              <ol style={{ paddingLeft: '20px', fontSize: '14px', lineHeight: '1.8' }}>
                <li>Activez votre géolocalisation</li>
                <li>Choisissez le temps dont vous disposez</li>
                <li>L'algorithme génère automatiquement un itinéraire optimal</li>
                <li>Les segments les plus proches et non complétés sont sélectionnés</li>
                <li>Le parcours est optimisé pour revenir à votre point de départ</li>
              </ol>
            </div>
          </div>

          {/* Right panel - Map */}
          <div>
            <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
              <MapComponent
                center={position ? [position.lat, position.lon] : [50.05, 1.55]} // Default: Nord de la France
                zoom={position ? 15 : 10}
                style={{ width: '100%', height: '700px' }}
                onMapReady={setMap}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
