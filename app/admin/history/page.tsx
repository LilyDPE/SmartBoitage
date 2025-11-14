'use client';

// Admin Session History Page
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function HistoryPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<any>(null);

  // Filters
  const [userId, setUserId] = useState('');
  const [zoneId, setZoneId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [limit] = useState(50);
  const [offset, setOffset] = useState(0);

  // Available users and zones for filters
  const [users, setUsers] = useState<any[]>([]);
  const [zones, setZones] = useState<any[]>([]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login?callbackUrl=/admin/history');
    } else if (status === 'authenticated') {
      const userRole = (session.user as any)?.role;
      if (!['admin', 'manager'].includes(userRole)) {
        router.push('/');
      }
    }
  }, [status, session, router]);

  useEffect(() => {
    if (status === 'authenticated') {
      loadUsers();
      loadZones();
      loadHistory();
    }
  }, [status, userId, zoneId, startDate, endDate, limit, offset]);

  const loadUsers = async () => {
    try {
      const response = await fetch('/api/admin/users');
      const data = await response.json();
      if (data.success) {
        setUsers(data.users.filter((u: any) => u.role === 'commercial'));
      }
    } catch (error) {
      console.error('Error loading users:', error);
    }
  };

  const loadZones = async () => {
    try {
      const response = await fetch('/api/zones/create');
      const data = await response.json();
      if (data.success) {
        setZones(data.zones);
      }
    } catch (error) {
      console.error('Error loading zones:', error);
    }
  };

  const loadHistory = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams();
      if (userId) params.append('userId', userId);
      if (zoneId) params.append('zoneId', zoneId);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      params.append('limit', limit.toString());
      params.append('offset', offset.toString());

      const response = await fetch(`/api/admin/history?${params}`);
      const data = await response.json();

      if (data.success) {
        setHistory(data.history);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error('Error loading history:', error);
    } finally {
      setLoading(false);
    }
  };

  const resetFilters = () => {
    setUserId('');
    setZoneId('');
    setStartDate('');
    setEndDate('');
    setOffset(0);
  };

  const exportToCSV = () => {
    const headers = [
      'Date début',
      'Date fin',
      'Commercial',
      'Zone',
      'Segments totaux',
      'Segments complétés',
      'Taux complétion',
      'Distance (km)',
      'Durée (min)',
      'Adresse départ',
      'Adresse fin',
      'Commentaire',
    ];

    const rows = history.map((h) => [
      new Date(h.started_at).toLocaleString('fr-FR'),
      h.ended_at ? new Date(h.ended_at).toLocaleString('fr-FR') : '-',
      h.user_nom || '-',
      h.zone_nom || '-',
      h.total_segments || 0,
      h.completed_segments || 0,
      h.completion_rate ? `${h.completion_rate}%` : '0%',
      ((h.distance_m || 0) / 1000).toFixed(2),
      Math.round((h.duration_seconds || 0) / 60),
      h.adresse_depart || '-',
      h.adresse_fin || '-',
      h.commentaire || '-',
    ]);

    const csv = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `historique_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (hours > 0) {
      return `${hours}h ${minutes}min`;
    }
    return `${minutes}min`;
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex-center" style={{ minHeight: '100vh' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  if (!session || !['admin', 'manager'].includes((session.user as any)?.role)) {
    return null;
  }

  return (
    <div>
      {/* Header */}
      <div className="header">
        <div className="container">
          <h1>Historique des Sessions</h1>
          <div style={{ marginTop: '10px' }}>
            <Link href="/admin">
              <button className="btn btn-secondary" style={{ marginRight: '10px' }}>
                ← Dashboard
              </button>
            </Link>
            <button className="btn btn-primary" onClick={exportToCSV}>
              📥 Exporter CSV
            </button>
          </div>
        </div>
      </div>

      <div className="container">
        {/* Filters */}
        <div className="card" style={{ marginBottom: '20px' }}>
          <h3 style={{ marginBottom: '15px' }}>Filtres</h3>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '15px',
            }}
          >
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>
                Commercial
              </label>
              <select
                value={userId}
                onChange={(e) => {
                  setUserId(e.target.value);
                  setOffset(0);
                }}
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '5px',
                  border: '1px solid #ddd',
                }}
              >
                <option value="">Tous</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.nom}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>
                Zone
              </label>
              <select
                value={zoneId}
                onChange={(e) => {
                  setZoneId(e.target.value);
                  setOffset(0);
                }}
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '5px',
                  border: '1px solid #ddd',
                }}
              >
                <option value="">Toutes</option>
                {zones.map((zone) => (
                  <option key={zone.id} value={zone.id}>
                    {zone.nom}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>
                Date début
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setOffset(0);
                }}
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '5px',
                  border: '1px solid #ddd',
                }}
              />
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>
                Date fin
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setOffset(0);
                }}
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '5px',
                  border: '1px solid #ddd',
                }}
              />
            </div>
          </div>

          <div style={{ marginTop: '15px', display: 'flex', gap: '10px' }}>
            <button className="btn btn-secondary" onClick={resetFilters}>
              Réinitialiser les filtres
            </button>
          </div>
        </div>

        {/* Results count */}
        {pagination && (
          <div style={{ marginBottom: '15px', color: '#666' }}>
            Affichage de {offset + 1} à {Math.min(offset + limit, pagination.total)} sur{' '}
            {pagination.total} sessions
          </div>
        )}

        {/* History table */}
        <div className="card" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ background: '#f5f5f5' }}>
                <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>
                  Date
                </th>
                <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>
                  Commercial
                </th>
                <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>
                  Zone
                </th>
                <th style={{ padding: '10px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>
                  Segments
                </th>
                <th style={{ padding: '10px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>
                  Complétion
                </th>
                <th style={{ padding: '10px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>
                  Distance
                </th>
                <th style={{ padding: '10px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>
                  Durée
                </th>
                <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>
                  Commentaire
                </th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
                    Aucune session trouvée
                  </td>
                </tr>
              ) : (
                history.map((h) => (
                  <tr key={h.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '10px' }}>
                      <div style={{ fontWeight: '500' }}>
                        {new Date(h.started_at).toLocaleDateString('fr-FR')}
                      </div>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        {new Date(h.started_at).toLocaleTimeString('fr-FR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                        {h.ended_at && (
                          <>
                            {' - '}
                            {new Date(h.ended_at).toLocaleTimeString('fr-FR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '10px' }}>
                      <div style={{ fontWeight: '500' }}>{h.user_nom || '-'}</div>
                      <div style={{ fontSize: '12px', color: '#666' }}>{h.user_email || '-'}</div>
                    </td>
                    <td style={{ padding: '10px' }}>{h.zone_nom || '-'}</td>
                    <td style={{ padding: '10px', textAlign: 'center' }}>
                      <div style={{ fontWeight: '500' }}>
                        {h.completed_segments || 0} / {h.total_segments || 0}
                      </div>
                    </td>
                    <td style={{ padding: '10px', textAlign: 'center' }}>
                      <span
                        style={{
                          padding: '4px 8px',
                          borderRadius: '3px',
                          background:
                            (h.completion_rate || 0) >= 90
                              ? '#4caf50'
                              : (h.completion_rate || 0) >= 70
                              ? '#ff9800'
                              : '#f44336',
                          color: 'white',
                          fontSize: '12px',
                          fontWeight: '500',
                        }}
                      >
                        {h.completion_rate || 0}%
                      </span>
                    </td>
                    <td style={{ padding: '10px', textAlign: 'center' }}>
                      {((h.distance_m || 0) / 1000).toFixed(2)} km
                    </td>
                    <td style={{ padding: '10px', textAlign: 'center' }}>
                      {formatDuration(h.duration_seconds || 0)}
                    </td>
                    <td
                      style={{
                        padding: '10px',
                        maxWidth: '200px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                      title={h.commentaire}
                    >
                      {h.commentaire || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination && pagination.total > limit && (
          <div
            style={{
              marginTop: '20px',
              display: 'flex',
              justifyContent: 'center',
              gap: '10px',
            }}
          >
            <button
              className="btn btn-secondary"
              onClick={() => setOffset(Math.max(0, offset - limit))}
              disabled={offset === 0}
            >
              ← Précédent
            </button>
            <span style={{ padding: '10px', alignSelf: 'center' }}>
              Page {Math.floor(offset / limit) + 1} / {Math.ceil(pagination.total / limit)}
            </span>
            <button
              className="btn btn-secondary"
              onClick={() => setOffset(offset + limit)}
              disabled={!pagination.hasMore}
            >
              Suivant →
            </button>
          </div>
        )}

        {/* Summary stats */}
        {history.length > 0 && (
          <div className="grid grid-2" style={{ marginTop: '30px' }}>
            <div className="card" style={{ background: '#e3f2fd' }}>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#1976d2' }}>
                {history.reduce((sum, h) => sum + (h.completed_segments || 0), 0)}
              </div>
              <div style={{ marginTop: '5px' }}>Segments distribués</div>
            </div>
            <div className="card" style={{ background: '#e8f5e9' }}>
              <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#388e3c' }}>
                {(
                  history.reduce((sum, h) => sum + (h.distance_m || 0), 0) / 1000
                ).toFixed(1)}{' '}
                km
              </div>
              <div style={{ marginTop: '5px' }}>Distance totale</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
