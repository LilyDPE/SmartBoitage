'use client';

// Protected Route wrapper - requires authentication
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'manager' | 'commercial';
  redirectTo?: string;
}

export default function ProtectedRoute({
  children,
  requiredRole,
  redirectTo = '/auth/login',
}: ProtectedRouteProps) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return;

    if (status === 'unauthenticated') {
      const callbackUrl = encodeURIComponent(window.location.pathname);
      router.push(`${redirectTo}?callbackUrl=${callbackUrl}`);
      return;
    }

    if (requiredRole && session) {
      const userRole = (session.user as any)?.role;

      // Admin can access everything
      if (userRole === 'admin') return;

      // Manager can access manager and commercial pages
      if (userRole === 'manager' && ['manager', 'commercial'].includes(requiredRole)) {
        return;
      }

      // Commercial can only access commercial pages
      if (userRole === 'commercial' && requiredRole === 'commercial') {
        return;
      }

      // Unauthorized
      router.push('/');
    }
  }, [status, session, requiredRole, router, redirectTo]);

  if (status === 'loading') {
    return (
      <div className="flex-center" style={{ minHeight: '100vh' }}>
        <div className="spinner"></div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return null;
  }

  if (requiredRole && session) {
    const userRole = (session.user as any)?.role;

    // Check role access
    if (userRole === 'admin') {
      return <>{children}</>;
    }

    if (
      userRole === 'manager' &&
      ['manager', 'commercial'].includes(requiredRole)
    ) {
      return <>{children}</>;
    }

    if (userRole === 'commercial' && requiredRole === 'commercial') {
      return <>{children}</>;
    }

    return null;
  }

  return <>{children}</>;
}
