'use client';

// Zone Creation Page
import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import type L from 'leaflet';

// Import Map and ZoneDrawer without SSR to avoid Leaflet's window dependency
const MapComponent = dynamic(() => import('@/components/Map'), { ssr: false });
const ZoneDrawer = dynamic(() => import('@/components/ZoneDrawer'), { ssr: false });

export default function CreateZonePage() {
  const router = useRouter();
  const [map, setMap] = useState<L.Map | null>(null);
  const [zoneName, setZoneName] = useState('');
  const [zoneGeom, setZoneGeom] = useState<any>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string>('');

  const handleZoneDrawn = useCallback((geom: any) => {
    setZoneGeom(geom);
    setError(null);
  }, []);

  const handleCreateZone = async () => {
    if (!zoneName.trim()) {
      setError('Veuillez entrer un nom pour la zone');
      return;
    }

    if (!zoneGeom) {
      setError('Veuillez dessiner une zone sur la carte');
      return;
    }

    setCreating(true);
    setError(null);
    setProgress('Création de la zone...');

    try {
      const response = await fetch('/api/zones/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nom: zoneName,
          geom: zoneGeom,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Erreur lors de la création de la zone');
      }

      setProgress('Zone créée avec succès !');

      // Redirect to plan page
      setTimeout(() => {
        router.push(`/zones/${data.zone.id}/plan`);
      }, 1000);
    } catch (err: any) {
      console.error('Error creating zone:', err);
      setError(err.message || 'Erreur lors de la création de la zone');
      setCreating(false);
      setProgress('');
    }
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
          <h1>Créer une nouvelle zone</h1>
        </div>
      </div>

      <div className="container">
        <div className="grid" style={{ gridTemplateColumns: '1fr 2fr', gap: '20px' }}>
          {/* Left panel - Form */}
          <div>
            <div className="card">
              <h2 style={{ marginBottom: '20px' }}>Informations</h2>

              <div style={{ marginBottom: '20px' }}>
                <label>Nom de la zone *</label>
                <input
                  type="text"
                  value={zoneName}
                  onChange={(e) => setZoneName(e.target.value)}
                  placeholder="Ex: Centre-ville, Quartier Nord..."
                  disabled={creating}
                />
              </div>

              {zoneGeom && (
                <div
                  style={{
                    padding: '10px',
                    background: '#e8f5e9',
                    borderRadius: '5px',
                    marginBottom: '20px',
                  }}
                >
                  ✓ Zone dessinée sur la carte
                </div>
              )}

              {error && (
                <div
                  style={{
                    padding: '10px',
                    background: '#ffebee',
                    color: '#c62828',
                    borderRadius: '5px',
                    marginBottom: '20px',
                    fontSize: '14px',
                  }}
                >
                  {error}
                </div>
              )}

              {progress && (
                <div
                  style={{
                    padding: '10px',
                    background: '#e3f2fd',
                    color: '#1565c0',
                    borderRadius: '5px',
                    marginBottom: '20px',
                    fontSize: '14px',
                  }}
                >
                  {progress}
                </div>
              )}

              <button
                className="btn btn-primary"
                onClick={handleCreateZone}
                disabled={creating || !zoneName || !zoneGeom}
                style={{ width: '100%' }}
              >
                {creating ? 'Création en cours...' : 'Créer la zone'}
              </button>
            </div>

            <div className="card" style={{ marginTop: '20px' }}>
              <h3 style={{ marginBottom: '10px' }}>Instructions</h3>
              <ol style={{ paddingLeft: '20px', lineHeight: '1.8', fontSize: '14px' }}>
                <li>Donnez un nom à votre zone</li>
                <li>Utilisez les outils de dessin pour créer un polygone ou rectangle</li>
                <li>Cliquez sur "Créer la zone"</li>
                <li>Les rues seront extraites automatiquement depuis OpenStreetMap</li>
              </ol>
            </div>
          </div>

          {/* Right panel - Map */}
          <div>
            <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
              <MapComponent
                center={[2.3522, 48.8566]} // Paris
                zoom={13}
                style={{ width: '100%', height: '600px' }}
                onMapReady={setMap}
              />
              <ZoneDrawer map={map} onZoneDrawn={handleZoneDrawn} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
