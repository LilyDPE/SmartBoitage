'use client';

// Home Page - Zone management and list
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function HomePage() {
  const [zones, setZones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadZones();
  }, []);

  const loadZones = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/zones/create');
      const data = await response.json();

      if (data.success) {
        setZones(data.zones);
      } else {
        setError('Erreur lors du chargement des zones');
      }
    } catch (err) {
      console.error('Error loading zones:', err);
      setError('Impossible de charger les zones');
    } finally {
      setLoading(false);
    }
  };

  const deleteZone = async (zoneId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette zone ?')) {
      return;
    }

    try {
      // Add delete endpoint call here
      await loadZones();
    } catch (err) {
      console.error('Error deleting zone:', err);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="header">
        <div className="container">
          <h1>SmartBoitage PRO</h1>
          <p style={{ color: '#666', marginTop: '5px' }}>
            Gestion professionnelle de tournées de distribution
          </p>
        </div>
      </div>

      <div className="container">
        {/* Actions */}
        <div style={{ marginBottom: '30px' }}>
          <Link href="/zones/create">
            <button className="btn btn-primary" style={{ fontSize: '16px' }}>
              + Créer une nouvelle zone
            </button>
          </Link>
        </div>

        {/* Loading state */}
        {loading && (
          <div className="flex-center" style={{ padding: '40px' }}>
            <div className="spinner"></div>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div
            className="card"
            style={{
              background: '#ffebee',
              color: '#c62828',
              textAlign: 'center',
            }}
          >
            {error}
          </div>
        )}

        {/* Zones list */}
        {!loading && !error && zones.length === 0 && (
          <div className="card text-center">
            <h2 style={{ marginBottom: '10px' }}>Aucune zone créée</h2>
            <p style={{ color: '#666', marginBottom: '20px' }}>
              Commencez par créer votre première zone de boîtage
            </p>
            <Link href="/zones/create">
              <button className="btn btn-primary">Créer une zone</button>
            </Link>
          </div>
        )}

        {!loading && zones.length > 0 && (
          <div>
            <h2 style={{ marginBottom: '20px' }}>Mes zones ({zones.length})</h2>
            <div className="grid grid-2">
              {zones.map((zone) => (
                <div key={zone.id} className="card">
                  <h3 style={{ marginBottom: '10px' }}>{zone.nom}</h3>
                  <div
                    style={{
                      fontSize: '14px',
                      color: '#666',
                      marginBottom: '15px',
                    }}
                  >
                    Créée le{' '}
                    {new Date(zone.created_at).toLocaleDateString('fr-FR')}
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      gap: '10px',
                      flexWrap: 'wrap',
                    }}
                  >
                    <Link href={`/zones/${zone.id}/plan`}>
                      <button className="btn btn-primary">
                        Planifier
                      </button>
                    </Link>
                    <Link href={`/zones/${zone.id}/tour`}>
                      <button className="btn btn-success">
                        Démarrer tournée
                      </button>
                    </Link>
                    <button
                      className="btn btn-danger"
                      onClick={() => deleteZone(zone.id)}
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Info section */}
        <div className="card" style={{ marginTop: '40px', background: '#e3f2fd' }}>
          <h3 style={{ marginBottom: '10px' }}>Comment ça marche ?</h3>
          <ol style={{ paddingLeft: '20px', lineHeight: '1.8' }}>
            <li>
              <strong>Créez une zone</strong> - Dessinez votre zone de distribution
              sur la carte
            </li>
            <li>
              <strong>Extraction automatique</strong> - Les rues sont extraites
              depuis OpenStreetMap
            </li>
            <li>
              <strong>Segmentation pair/impair</strong> - Chaque rue est divisée
              en côtés pair et impair
            </li>
            <li>
              <strong>Planification</strong> - Un parcours optimisé est calculé
              automatiquement
            </li>
            <li>
              <strong>Suivi GPS</strong> - Suivez votre progression en temps réel
              pendant la tournée
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}
