// Authentication configuration and utilities
import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { compare } from 'bcryptjs';
import { query } from './db';

export interface User {
  id: string;
  email: string;
  nom: string;
  role: 'admin' | 'commercial' | 'manager';
  actif: boolean;
}

// NextAuth configuration
export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Mot de passe', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email et mot de passe requis');
        }

        // Get user from database
        const result = await query(
          `SELECT id, email, nom, password_hash, role, actif
           FROM users
           WHERE email = $1`,
          [credentials.email]
        );

        const user = result.rows[0];

        if (!user) {
          throw new Error('Identifiants invalides');
        }

        if (!user.actif) {
          throw new Error('Compte désactivé');
        }

        // Verify password
        const isValid = await compare(credentials.password, user.password_hash);

        if (!isValid) {
          throw new Error('Identifiants invalides');
        }

        // Update last login
        await query(
          `UPDATE users SET last_login = NOW() WHERE id = $1`,
          [user.id]
        );

        // Log activity
        await query(
          `SELECT fn_log_activity($1, $2, $3, NULL, NULL, NULL, NULL)`,
          [user.id, user.email, 'login']
        );

        return {
          id: user.id,
          email: user.email,
          name: user.nom,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as any).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).id = token.id;
        (session.user as any).role = token.role;
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/login',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET,
};

// Helper to check if user is authenticated
export async function requireAuth(session: any) {
  if (!session || !session.user) {
    throw new Error('Non authentifié');
  }
  return session.user;
}

// Helper to check if user is admin
export async function requireAdmin(session: any) {
  const user = await requireAuth(session);
  if ((user as any).role !== 'admin') {
    throw new Error('Accès réservé aux administrateurs');
  }
  return user;
}

// Helper to check if user is admin or manager
export async function requireManager(session: any) {
  const user = await requireAuth(session);
  if (!['admin', 'manager'].includes((user as any).role)) {
    throw new Error('Accès réservé aux managers et administrateurs');
  }
  return user;
}

// Get user from database
export async function getUserById(userId: string): Promise<User | null> {
  const result = await query(
    `SELECT id, email, nom, role, actif, telephone, adresse, date_embauche, last_login
     FROM users
     WHERE id = $1`,
    [userId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0];
}

// Get all users (admin only)
export async function getAllUsers() {
  const result = await query(
    `SELECT
       id,
       email,
       nom,
       role,
       actif,
       telephone,
       adresse,
       date_embauche,
       last_login,
       created_at
     FROM users
     ORDER BY created_at DESC`
  );

  return result.rows;
}

// Create new user
export async function createUser(data: {
  email: string;
  nom: string;
  password: string;
  role: string;
  telephone?: string;
  adresse?: string;
  dateEmbauche?: string;
}) {
  const bcrypt = require('bcryptjs');
  const hashedPassword = await bcrypt.hash(data.password, 10);

  const result = await query(
    `INSERT INTO users (email, nom, password_hash, role, telephone, adresse, date_embauche)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, email, nom, role, actif`,
    [
      data.email,
      data.nom,
      hashedPassword,
      data.role,
      data.telephone || null,
      data.adresse || null,
      data.dateEmbauche || null,
    ]
  );

  return result.rows[0];
}

// Update user
export async function updateUser(
  userId: string,
  data: {
    nom?: string;
    email?: string;
    role?: string;
    actif?: boolean;
    telephone?: string;
    adresse?: string;
  }
) {
  const fields: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (data.nom !== undefined) {
    fields.push(`nom = $${paramIndex++}`);
    values.push(data.nom);
  }
  if (data.email !== undefined) {
    fields.push(`email = $${paramIndex++}`);
    values.push(data.email);
  }
  if (data.role !== undefined) {
    fields.push(`role = $${paramIndex++}`);
    values.push(data.role);
  }
  if (data.actif !== undefined) {
    fields.push(`actif = $${paramIndex++}`);
    values.push(data.actif);
  }
  if (data.telephone !== undefined) {
    fields.push(`telephone = $${paramIndex++}`);
    values.push(data.telephone);
  }
  if (data.adresse !== undefined) {
    fields.push(`adresse = $${paramIndex++}`);
    values.push(data.adresse);
  }

  if (fields.length === 0) {
    throw new Error('No fields to update');
  }

  values.push(userId);

  const result = await query(
    `UPDATE users
     SET ${fields.join(', ')}
     WHERE id = $${paramIndex}
     RETURNING id, email, nom, role, actif`,
    values
  );

  return result.rows[0];
}

// Delete user
export async function deleteUser(userId: string) {
  await query(`DELETE FROM users WHERE id = $1`, [userId]);
}

// Change password
export async function changePassword(
  userId: string,
  oldPassword: string,
  newPassword: string
) {
  const bcrypt = require('bcryptjs');

  // Verify old password
  const result = await query(
    `SELECT password_hash FROM users WHERE id = $1`,
    [userId]
  );

  if (result.rows.length === 0) {
    throw new Error('User not found');
  }

  const isValid = await bcrypt.compare(oldPassword, result.rows[0].password_hash);

  if (!isValid) {
    throw new Error('Invalid old password');
  }

  // Hash new password
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  // Update password
  await query(
    `UPDATE users SET password_hash = $1 WHERE id = $2`,
    [hashedPassword, userId]
  );
}

// Reset password (admin only)
export async function resetPassword(userId: string, newPassword: string) {
  const bcrypt = require('bcryptjs');
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  await query(
    `UPDATE users SET password_hash = $1 WHERE id = $2`,
    [hashedPassword, userId]
  );
}

// Log activity
export async function logActivity(
  userId: string,
  userEmail: string,
  action: string,
  entityType?: string,
  entityId?: string,
  details?: any,
  ipAddress?: string
) {
  await query(
    `SELECT fn_log_activity($1, $2, $3, $4, $5, $6, $7)`,
    [
      userId,
      userEmail,
      action,
      entityType || null,
      entityId || null,
      details ? JSON.stringify(details) : null,
      ipAddress || null,
    ]
  );
}
