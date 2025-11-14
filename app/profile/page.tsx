'use client';

// User Profile Page
import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';

export default function ProfilePage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();

  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    nom: '',
    email: '',
    telephone: '',
    adresse: '',
  });

  // Password change
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login?callbackUrl=/profile');
    } else if (status === 'authenticated') {
      loadProfile();
    }
  }, [status, router]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const userId = (session?.user as any)?.id;

      // Get user data
      const userResponse = await fetch(`/api/admin/users/${userId}`);
      const userData = await userResponse.json();

      if (userData.success) {
        setUser(userData.user);
        setFormData({
          nom: userData.user.nom || '',
          email: userData.user.email || '',
          telephone: userData.user.telephone || '',
          adresse: userData.user.adresse || '',
        });
      }

      // Get user stats
      const statsResponse = await fetch(`/api/admin/history?userId=${userId}&limit=1000`);
      const statsData = await statsResponse.json();

      if (statsData.success) {
        const totalSessions = statsData.history.length;
        const totalSegments = statsData.history.reduce(
          (sum: number, h: any) => sum + (h.completed_segments || 0),
          0
        );
        const totalDistance = statsData.history.reduce(
          (sum: number, h: any) => sum + (h.distance_m || 0),
          0
        );
        const totalDuration = statsData.history.reduce(
          (sum: number, h: any) => sum + (h.duration_seconds || 0),
          0
        );

        setStats({
          totalSessions,
          totalSegments,
          totalDistance,
          totalDuration,
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const userId = (session?.user as any)?.id;
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        alert('Profil mis à jour avec succès');
        await update(); // Refresh session
        loadProfile();
      } else {
        alert(data.error || 'Erreur lors de la mise à jour');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      alert('Erreur lors de la mise à jour');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert('Les mots de passe ne correspondent pas');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      alert('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    try {
      const userId = (session?.user as any)?.id;
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          newPassword: passwordData.newPassword,
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert('Mot de passe changé avec succès');
        setShowPasswordModal(false);
        setPasswordData({
          oldPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
      } else {
        alert(data.error || 'Erreur lors du changement de mot de passe');
      }
    } catch (error) {
      console.error('Error changing password:', error);
      alert('Erreur lors du changement de mot de passe');
    }
  };

  if (status === 'loading' || loading) {
    return (
      <div className="flex-center" style={{ minHeight: '100vh' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div>
      <Navbar />

      <div className="container" style={{ marginTop: '30px' }}>
        <h1 style={{ marginBottom: '30px' }}>Mon Profil</h1>

        <div className="grid" style={{ gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
          {/* Profile Form */}
          <div>
            <div className="card">
              <h2 style={{ marginBottom: '20px' }}>Informations personnelles</h2>

              <form onSubmit={handleSaveProfile}>
                <div style={{ marginBottom: '15px' }}>
                  <label>Nom complet</label>
                  <input
                    type="text"
                    value={formData.nom}
                    onChange={(e) => setFormData({ ...formData, nom: e.target.value })}
                    required
                  />
                </div>

                <div style={{ marginBottom: '15px' }}>
                  <label>Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    required
                  />
                </div>

                <div style={{ marginBottom: '15px' }}>
                  <label>Téléphone</label>
                  <input
                    type="tel"
                    value={formData.telephone}
                    onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                    placeholder="06 12 34 56 78"
                  />
                </div>

                <div style={{ marginBottom: '15px' }}>
                  <label>Adresse</label>
                  <input
                    type="text"
                    value={formData.adresse}
                    onChange={(e) => setFormData({ ...formData, adresse: e.target.value })}
                  />
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="submit" className="btn btn-primary" disabled={saving}>
                    {saving ? 'Enregistrement...' : 'Enregistrer'}
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowPasswordModal(true)}
                  >
                    🔒 Changer le mot de passe
                  </button>
                </div>
              </form>
            </div>

            {/* Account Info */}
            {user && (
              <div className="card" style={{ marginTop: '20px' }}>
                <h3 style={{ marginBottom: '15px' }}>Informations du compte</h3>
                <div style={{ fontSize: '14px', lineHeight: '2' }}>
                  <div>
                    <strong>Rôle:</strong>{' '}
                    <span
                      style={{
                        padding: '3px 8px',
                        background: '#e3f2fd',
                        color: '#1976d2',
                        borderRadius: '3px',
                        fontSize: '12px',
                        fontWeight: '500',
                        marginLeft: '8px',
                      }}
                    >
                      {user.role}
                    </span>
                  </div>
                  <div>
                    <strong>Statut:</strong>{' '}
                    <span
                      style={{
                        padding: '3px 8px',
                        background: user.actif ? '#e8f5e9' : '#ffebee',
                        color: user.actif ? '#388e3c' : '#c62828',
                        borderRadius: '3px',
                        fontSize: '12px',
                        fontWeight: '500',
                        marginLeft: '8px',
                      }}
                    >
                      {user.actif ? 'Actif' : 'Inactif'}
                    </span>
                  </div>
                  <div>
                    <strong>Membre depuis:</strong>{' '}
                    {new Date(user.created_at).toLocaleDateString('fr-FR')}
                  </div>
                  <div>
                    <strong>Dernière connexion:</strong>{' '}
                    {user.last_login
                      ? new Date(user.last_login).toLocaleDateString('fr-FR')
                      : 'Jamais'}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Stats */}
          <div>
            {stats && (
              <div>
                <div className="card" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', marginBottom: '15px' }}>
                  <div style={{ fontSize: '40px', fontWeight: 'bold' }}>
                    {stats.totalSessions}
                  </div>
                  <div style={{ marginTop: '8px', fontSize: '16px' }}>
                    Sessions complétées
                  </div>
                </div>

                <div className="card" style={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white', marginBottom: '15px' }}>
                  <div style={{ fontSize: '40px', fontWeight: 'bold' }}>
                    {stats.totalSegments}
                  </div>
                  <div style={{ marginTop: '8px', fontSize: '16px' }}>
                    Segments distribués
                  </div>
                </div>

                <div className="card" style={{ background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)', color: 'white', marginBottom: '15px' }}>
                  <div style={{ fontSize: '40px', fontWeight: 'bold' }}>
                    {(stats.totalDistance / 1000).toFixed(1)}
                  </div>
                  <div style={{ marginTop: '8px', fontSize: '16px' }}>
                    Kilomètres parcourus
                  </div>
                </div>

                <div className="card" style={{ background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', color: 'white' }}>
                  <div style={{ fontSize: '40px', fontWeight: 'bold' }}>
                    {Math.round(stats.totalDuration / 3600)}h
                  </div>
                  <div style={{ marginTop: '8px', fontSize: '16px' }}>
                    Temps total
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Password Modal */}
      {showPasswordModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '20px',
          }}
          onClick={() => setShowPasswordModal(false)}
        >
          <div
            style={{
              background: 'white',
              borderRadius: '10px',
              padding: '30px',
              maxWidth: '400px',
              width: '100%',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ marginBottom: '20px' }}>Changer le mot de passe</h2>

            <form onSubmit={handleChangePassword}>
              <div style={{ marginBottom: '15px' }}>
                <label>Nouveau mot de passe</label>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, newPassword: e.target.value })
                  }
                  required
                  minLength={6}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label>Confirmer le nouveau mot de passe</label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) =>
                    setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                  }
                  required
                  minLength={6}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  Changer
                </button>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowPasswordModal(false);
                    setPasswordData({
                      oldPassword: '',
                      newPassword: '',
                      confirmPassword: '',
                    });
                  }}
                  style={{ flex: 1 }}
                >
                  Annuler
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
