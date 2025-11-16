'use client';

// Navigation bar with user menu
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Navbar() {
  const { data: session } = useSession();
  const router = useRouter();
  const [showMenu, setShowMenu] = useState(false);

  if (!session) {
    return null;
  }

  const user = session.user as any;
  const isAdmin = user?.role === 'admin';
  const isManager = ['admin', 'manager'].includes(user?.role);

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    router.push('/auth/login');
  };

  return (
    <div
      style={{
        background: 'white',
        borderBottom: '1px solid #e0e0e0',
        padding: '12px 20px',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}
    >
      <div
        style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        {/* Logo/Title */}
        <Link
          href="/"
          style={{
            fontSize: '20px',
            fontWeight: 'bold',
            color: '#3388ff',
            textDecoration: 'none',
          }}
        >
          SmartBoitage PRO
        </Link>

        {/* Navigation Links */}
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <Link
            href="/"
            style={{
              color: '#666',
              textDecoration: 'none',
              padding: '8px 12px',
              borderRadius: '5px',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#f5f5f5')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            🏠 Accueil
          </Link>

          <Link
            href="/quick-tour"
            style={{
              color: '#666',
              textDecoration: 'none',
              padding: '8px 12px',
              borderRadius: '5px',
              transition: 'background 0.2s',
              background: 'linear-gradient(90deg, #667eea15, #764ba215)',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'linear-gradient(90deg, #667eea30, #764ba230)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'linear-gradient(90deg, #667eea15, #764ba215)')}
          >
            ⚡ Micro-Tournée
          </Link>

          <Link
            href="/zones/create"
            style={{
              color: '#666',
              textDecoration: 'none',
              padding: '8px 12px',
              borderRadius: '5px',
              transition: 'background 0.2s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#f5f5f5')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            ➕ Nouvelle Zone
          </Link>

          {isAdmin && (
            <Link
              href="/admin"
              style={{
                color: '#666',
                textDecoration: 'none',
                padding: '8px 12px',
                borderRadius: '5px',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#f5f5f5')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              👑 Admin
            </Link>
          )}

          {isManager && (
            <Link
              href="/admin/history"
              style={{
                color: '#666',
                textDecoration: 'none',
                padding: '8px 12px',
                borderRadius: '5px',
                transition: 'background 0.2s',
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#f5f5f5')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              📊 Historique
            </Link>
          )}

          {/* User Menu */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowMenu(!showMenu)}
              style={{
                padding: '8px 15px',
                background: '#f5f5f5',
                border: 'none',
                borderRadius: '20px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px',
              }}
            >
              <span
                style={{
                  width: '30px',
                  height: '30px',
                  borderRadius: '50%',
                  background: '#3388ff',
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                }}
              >
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </span>
              <span>{user?.name}</span>
              <span style={{ fontSize: '10px' }}>▼</span>
            </button>

            {showMenu && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '5px',
                  background: 'white',
                  border: '1px solid #e0e0e0',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                  minWidth: '200px',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    padding: '12px 15px',
                    borderBottom: '1px solid #e0e0e0',
                  }}
                >
                  <div style={{ fontWeight: '500', marginBottom: '4px' }}>
                    {user?.name}
                  </div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    {user?.email}
                  </div>
                  <div style={{ marginTop: '4px' }}>
                    <span
                      style={{
                        padding: '2px 8px',
                        background: '#e3f2fd',
                        color: '#1976d2',
                        borderRadius: '3px',
                        fontSize: '11px',
                        fontWeight: '500',
                      }}
                    >
                      {user?.role}
                    </span>
                  </div>
                </div>

                <Link
                  href="/profile"
                  style={{
                    display: 'block',
                    padding: '12px 15px',
                    color: '#333',
                    textDecoration: 'none',
                    transition: 'background 0.2s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#f5f5f5')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  onClick={() => setShowMenu(false)}
                >
                  👤 Mon profil
                </Link>

                <button
                  onClick={handleSignOut}
                  style={{
                    width: '100%',
                    padding: '12px 15px',
                    background: 'transparent',
                    border: 'none',
                    borderTop: '1px solid #e0e0e0',
                    textAlign: 'left',
                    color: '#f44336',
                    cursor: 'pointer',
                    fontSize: '14px',
                    transition: 'background 0.2s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#ffebee')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  🚪 Déconnexion
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Click outside to close menu */}
      {showMenu && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: -1,
          }}
          onClick={() => setShowMenu(false)}
        />
      )}
    </div>
  );
}
