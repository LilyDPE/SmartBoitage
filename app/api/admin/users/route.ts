// API Route: User Management (Admin only)
// GET /api/admin/users - List all users
// POST /api/admin/users - Create new user

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, requireAdmin, getAllUsers, createUser, logActivity } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    await requireAdmin(session);

    const users = await getAllUsers();

    return NextResponse.json({
      success: true,
      users,
      count: users.length,
    });
  } catch (error: any) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      {
        error: error.message || 'Failed to fetch users',
      },
      { status: error.message === 'Non authentifié' ? 401 : error.message.includes('administrateur') ? 403 : 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const admin = await requireAdmin(session);

    const body = await request.json();
    const { email, nom, password, role, telephone, adresse, dateEmbauche } = body;

    // Validation
    if (!email || !nom || !password || !role) {
      return NextResponse.json(
        { error: 'Champs requis: email, nom, password, role' },
        { status: 400 }
      );
    }

    if (!['admin', 'commercial', 'manager'].includes(role)) {
      return NextResponse.json(
        { error: 'Rôle invalide' },
        { status: 400 }
      );
    }

    // Create user
    const user = await createUser({
      email,
      nom,
      password,
      role,
      telephone,
      adresse,
      dateEmbauche,
    });

    // Log activity
    await logActivity(
      (admin as any).id,
      (admin as any).email,
      'create_user',
      'user',
      user.id,
      { email: user.email, nom: user.nom, role: user.role }
    );

    return NextResponse.json({
      success: true,
      user,
      message: 'Utilisateur créé avec succès',
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating user:', error);

    // Handle duplicate email
    if (error.code === '23505') {
      return NextResponse.json(
        { error: 'Cet email est déjà utilisé' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        error: error.message || 'Failed to create user',
      },
      { status: error.message === 'Non authentifié' ? 401 : error.message.includes('administrateur') ? 403 : 500 }
    );
  }
}
