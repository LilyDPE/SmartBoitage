// API Route: Manage specific user (Admin only)
// GET /api/admin/users/[id] - Get user details
// PUT /api/admin/users/[id] - Update user
// DELETE /api/admin/users/[id] - Delete user

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions, requireAdmin, getUserById, updateUser, deleteUser, resetPassword, logActivity } from '@/lib/auth';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    await requireAdmin(session);

    const user = await getUserById(params.id);

    if (!user) {
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      user,
    });
  } catch (error: any) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      {
        error: error.message || 'Failed to fetch user',
      },
      { status: error.message === 'Non authentifié' ? 401 : error.message.includes('administrateur') ? 403 : 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const admin = await requireAdmin(session);

    const body = await request.json();
    const { nom, email, role, actif, telephone, adresse, newPassword } = body;

    // Handle password reset separately
    if (newPassword) {
      await resetPassword(params.id, newPassword);
      await logActivity(
        (admin as any).id,
        (admin as any).email,
        'reset_password',
        'user',
        params.id
      );
    }

    // Update user
    const user = await updateUser(params.id, {
      nom,
      email,
      role,
      actif,
      telephone,
      adresse,
    });

    // Log activity
    await logActivity(
      (admin as any).id,
      (admin as any).email,
      'update_user',
      'user',
      params.id,
      { nom, email, role, actif }
    );

    return NextResponse.json({
      success: true,
      user,
      message: 'Utilisateur mis à jour avec succès',
    });
  } catch (error: any) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      {
        error: error.message || 'Failed to update user',
      },
      { status: error.message === 'Non authentifié' ? 401 : error.message.includes('administrateur') ? 403 : 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    const admin = await requireAdmin(session);

    // Prevent admin from deleting themselves
    if ((admin as any).id === params.id) {
      return NextResponse.json(
        { error: 'Vous ne pouvez pas supprimer votre propre compte' },
        { status: 400 }
      );
    }

    // Get user before deletion
    const user = await getUserById(params.id);

    if (!user) {
      return NextResponse.json(
        { error: 'Utilisateur non trouvé' },
        { status: 404 }
      );
    }

    // Delete user
    await deleteUser(params.id);

    // Log activity
    await logActivity(
      (admin as any).id,
      (admin as any).email,
      'delete_user',
      'user',
      params.id,
      { email: user.email, nom: user.nom }
    );

    return NextResponse.json({
      success: true,
      message: 'Utilisateur supprimé avec succès',
    });
  } catch (error: any) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      {
        error: error.message || 'Failed to delete user',
      },
      { status: error.message === 'Non authentifié' ? 401 : error.message.includes('administrateur') ? 403 : 500 }
    );
  }
}
