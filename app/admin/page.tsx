'use client';

// Admin Dashboard - Overview and statistics
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login?callbackUrl=/admin');
    } else if (status === 'authenticated' && (session.user as any)?.role !== 'admin') {
      router.push('/');
    }
  }, [status, session, router]);

  useEffect(() => {
    if (status === 'authenticated') {
      loadStats();
    }
  }, [status, period]);

  const loadStats = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/admin/stats?period=${period}`);
      const data = await response.json();

      if (data.success) {
        setStats(data);
      }
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex-center" style={{ minHeight: '100vh' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  if (!session || (session.user as any)?.role !== 'admin') {
    return null;
  }

  return (
    <div>
      {/* Header */}
      <div className="header">
        <div className="container">
          <h1>Dashboard Administrateur</h1>
          <div style={{ marginTop: '10px' }}>
            <Link href="/">
              <button className="btn btn-secondary" style={{ marginRight: '10px' }}>
                ← Accueil
              </button>
            </Link>
            <Link href="/admin/users">
              <button className="btn btn-primary" style={{ marginRight: '10px' }}>
                👥 Utilisateurs
              </button>
            </Link>
            <Link href="/admin/live-tours">
              <button className="btn btn-primary" style={{ marginRight: '10px' }}>
                📍 Suivi en direct
              </button>
            </Link>
            <Link href="/admin/history">
              <button className="btn btn-primary">
                📊 Historique
              </button>
            </Link>
          </div>
        </div>
      </div>

      <div className="container">
        {/* Period selector */}
        <div className="card" style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontWeight: '500' }}>Période:</span>
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: '5px',
                border: '1px solid #ddd',
              }}
            >
              <option value="7">7 derniers jours</option>
              <option value="30">30 derniers jours</option>
              <option value="90">90 derniers jours</option>
              <option value="365">1 an</option>
            </select>
          </div>
        </div>

        {/* Overview Cards */}
        {stats?.stats && (
          <div className="grid grid-2" style={{ marginBottom: '30px' }}>
            <div className="card" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
              <div style={{ fontSize: '40px', fontWeight: 'bold' }}>
                {stats.stats.active_commercials || 0}
              </div>
              <div style={{ fontSize: '16px', marginTop: '5px' }}>
                Commerciaux actifs
              </div>
              <div style={{ fontSize: '14px', opacity: 0.8, marginTop: '5px' }}>
                sur {stats.stats.total_commercials || 0} au total
              </div>
            </div>

            <div className="card" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white' }}>
              <div style={{ fontSize: '40px', fontWeight: 'bold' }}>
                {stats.stats.completed_sessions || 0}
              </div>
              <div style={{ fontSize: '16px', marginTop: '5px' }}>
                Sessions terminées
              </div>
              <div style={{ fontSize: '14px', opacity: 0.8, marginTop: '5px' }}>
                sur {stats.stats.total_sessions || 0} sessions
              </div>
            </div>

            <div className="card" style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', color: 'white' }}>
              <div style={{ fontSize: '40px', fontWeight: 'bold' }}>
                {stats.stats.total_segments_completed || 0}
              </div>
              <div style={{ fontSize: '16px', marginTop: '5px' }}>
                Segments distribués
              </div>
              <div style={{ fontSize: '14px', opacity: 0.8, marginTop: '5px' }}>
                {((stats.stats.total_distance_m || 0) / 1000).toFixed(1)} km parcourus
              </div>
            </div>

            <div className="card" style={{ background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', color: 'white' }}>
              <div style={{ fontSize: '40px', fontWeight: 'bold' }}>
                {Math.round((stats.stats.avg_session_duration || 0) / 60)}
              </div>
              <div style={{ fontSize: '16px', marginTop: '5px' }}>
                Minutes / session (moyenne)
              </div>
              <div style={{ fontSize: '14px', opacity: 0.8, marginTop: '5px' }}>
                {stats.stats.total_zones || 0} zones créées
              </div>
            </div>
          </div>
        )}

        {/* User Performance */}
        {stats?.userPerformance && stats.userPerformance.length > 0 && (
          <div className="card" style={{ marginBottom: '30px' }}>
            <h2 style={{ marginBottom: '20px' }}>📈 Performance des commerciaux</h2>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f5f5f5' }}>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Commercial</th>
                    <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Sessions</th>
                    <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Segments</th>
                    <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Distance</th>
                    <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Taux complétion</th>
                    <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Dernière activité</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.userPerformance.map((user: any) => (
                    <tr key={user.user_id} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '12px' }}>
                        <div style={{ fontWeight: '500' }}>{user.nom}</div>
                        <div style={{ fontSize: '12px', color: '#666' }}>{user.email}</div>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>{user.total_sessions || 0}</td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>{user.total_segments_completed || 0}</td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        {((user.total_distance_m || 0) / 1000).toFixed(1)} km
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <span
                          style={{
                            padding: '4px 8px',
                            borderRadius: '3px',
                            background:
                              (user.avg_completion_rate || 0) >= 90
                                ? '#4caf50'
                                : (user.avg_completion_rate || 0) >= 70
                                ? '#ff9800'
                                : '#f44336',
                            color: 'white',
                            fontSize: '12px',
                            fontWeight: '500',
                          }}
                        >
                          {Math.round(user.avg_completion_rate || 0)}%
                        </span>
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center', fontSize: '14px', color: '#666' }}>
                        {user.last_activity
                          ? new Date(user.last_activity).toLocaleDateString('fr-FR')
                          : 'Jamais'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Zone Popularity */}
        {stats?.zonePopularity && stats.zonePopularity.length > 0 && (
          <div className="card">
            <h2 style={{ marginBottom: '20px' }}>🗺️ Zones les plus utilisées</h2>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f5f5f5' }}>
                    <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Zone</th>
                    <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Sessions</th>
                    <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Utilisateurs</th>
                    <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Durée moy.</th>
                    <th style={{ padding: '12px', textAlign: 'center', borderBottom: '2px solid #ddd' }}>Dernière util.</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.zonePopularity.map((zone: any) => (
                    <tr key={zone.zone_id} style={{ borderBottom: '1px solid #eee' }}>
                      <td style={{ padding: '12px', fontWeight: '500' }}>{zone.zone_nom}</td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>{zone.session_count || 0}</td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>{zone.user_count || 0}</td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        {Math.round((zone.avg_duration || 0) / 60)} min
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center', fontSize: '14px', color: '#666' }}>
                        {zone.last_used
                          ? new Date(zone.last_used).toLocaleDateString('fr-FR')
                          : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
