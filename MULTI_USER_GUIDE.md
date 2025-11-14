# Guide Multi-Utilisateurs - SmartBoitage PRO

## 📚 Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Installation & Configuration](#installation--configuration)
3. [Comptes de test](#comptes-de-test)
4. [Fonctionnalités par rôle](#fonctionnalités-par-rôle)
5. [Pages d'administration](#pages-dadministration)
6. [API Endpoints](#api-endpoints)
7. [Base de données](#base-de-données)
8. [Sécurité](#sécurité)

---

## Vue d'ensemble

SmartBoitage PRO intègre désormais un **système complet de gestion multi-utilisateurs** avec :

- ✅ **3 niveaux de rôles** : Admin, Manager, Commercial
- ✅ **Authentification sécurisée** (NextAuth.js + bcrypt)
- ✅ **Dashboard administrateur** avec statistiques en temps réel
- ✅ **Gestion des utilisateurs** (CRUD complet)
- ✅ **Historique des sessions** avec filtres avancés
- ✅ **Profil utilisateur** avec statistiques personnelles
- ✅ **Protection des routes** (middleware + composants)
- ✅ **Journal d'activité** pour audit
- ✅ **Export CSV** de l'historique

---

## Installation & Configuration

### 1. Installer les nouvelles dépendances

```bash
npm install
```

Nouvelles dépendances ajoutées :
- `next-auth@^4.24.5` - Authentification
- `bcryptjs@^2.4.3` - Hachage des mots de passe

### 2. Configurer les variables d'environnement

Créer un fichier `.env` à la racine du projet :

```bash
cp .env.example .env
```

**Variables obligatoires pour l'authentification :**

```env
# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=votre_secret_aleatoire_tres_long_ici
```

**Générer un secret sécurisé :**

```bash
# Sur Linux/macOS :
openssl rand -base64 32

# Ou utiliser ce générateur en ligne :
# https://generate-secret.vercel.app/32
```

### 3. Exécuter les migrations de base de données

```bash
# Migration complète (schema initial + auth)
npm run db:setup

# Ou seulement la migration auth si déjà installé
npm run db:auth
```

Cette migration va :
- Ajouter les colonnes d'authentification à la table `users`
- Créer les tables `session_history`, `activity_log`, `teams`, `daily_stats`
- Créer les vues SQL pour les rapports
- Insérer les comptes de test
- Créer les fonctions SQL d'archivage

### 4. Démarrer l'application

```bash
npm run dev
```

Aller sur http://localhost:3000

---

## Comptes de test

Après la migration, 3 comptes sont automatiquement créés :

### 🔑 Administrateur

```
Email: admin@smartboitage.fr
Mot de passe: admin123
```

**Accès complet** : Toutes les fonctionnalités

### 🔑 Commercial 1

```
Email: commercial1@smartboitage.fr
Mot de passe: commercial123
```

**Accès limité** : Création de zones, tournées

### 🔑 Commercial 2

```
Email: commercial2@smartboitage.fr
Mot de passe: commercial123
```

**Accès limité** : Création de zones, tournées

⚠️ **IMPORTANT** : Changez ces mots de passe en production !

---

## Fonctionnalités par rôle

### 👑 Admin

**Accès total** :
- ✅ Dashboard admin avec statistiques globales
- ✅ Gestion des utilisateurs (créer, modifier, supprimer)
- ✅ Réinitialisation des mots de passe
- ✅ Historique complet de toutes les sessions
- ✅ Journal d'activité
- ✅ Toutes les fonctionnalités commercial

### 📊 Manager

**Accès modéré** :
- ✅ Visualisation de l'historique des sessions
- ✅ Statistiques d'équipe
- ✅ Toutes les fonctionnalités commercial
- ❌ Gestion des utilisateurs

### 👤 Commercial

**Accès standard** :
- ✅ Création de zones
- ✅ Planification de parcours
- ✅ Suivi GPS des tournées
- ✅ Profil personnel avec statistiques
- ❌ Accès administratif
- ❌ Visualisation des autres utilisateurs

---

## Pages d'administration

### 📊 Dashboard Admin

**URL** : `/admin`

**Fonctionnalités** :
- Vue d'ensemble des métriques clés
- Nombre de commerciaux actifs
- Sessions terminées vs totales
- Segments distribués
- Distance totale parcourue
- **Tableau de performance** par commercial
- **Zones les plus utilisées**
- Filtre par période (7j / 30j / 90j / 1an)

**Statistiques affichées** :
- Commerciaux actifs
- Sessions complétées
- Segments distribués
- Distance parcourue
- Temps moyen par session

### 👥 Gestion des Utilisateurs

**URL** : `/admin/users`

**Fonctionnalités** :
- Liste complète des utilisateurs
- Recherche par nom ou email
- Filtre par rôle (admin/manager/commercial)
- **Créer** un nouvel utilisateur
- **Éditer** les informations
- **Réinitialiser** le mot de passe
- **Supprimer** un utilisateur
- Activer/désactiver un compte

**Formulaire de création/édition** :
- Nom complet
- Email
- Mot de passe
- Rôle
- Téléphone
- Adresse
- Statut actif/inactif

### 📋 Historique des Sessions

**URL** : `/admin/history`

**Fonctionnalités** :
- Historique complet de toutes les sessions terminées
- **Filtres avancés** :
  - Par commercial
  - Par zone
  - Par période (date début/fin)
- **Export CSV** de l'historique
- Pagination (50 résultats par page)
- **Métriques affichées** :
  - Date et heure
  - Commercial assigné
  - Zone visitée
  - Segments distribués
  - Taux de complétion
  - Distance parcourue
  - Durée
  - Commentaires

### 👤 Profil Utilisateur

**URL** : `/profile`

**Fonctionnalités** :
- Modifier ses informations personnelles
- Changer son mot de passe
- **Statistiques personnelles** :
  - Nombre de sessions complétées
  - Segments distribués
  - Kilomètres parcourus
  - Temps total
- Informations du compte :
  - Rôle
  - Statut
  - Date d'inscription
  - Dernière connexion

---

## API Endpoints

### Authentification

#### `POST /api/auth/signin`
Connexion utilisateur (NextAuth)

**Body** :
```json
{
  "email": "admin@smartboitage.fr",
  "password": "admin123"
}
```

#### `POST /api/auth/signout`
Déconnexion utilisateur

---

### Gestion des utilisateurs (Admin uniquement)

#### `GET /api/admin/users`
Liste tous les utilisateurs

**Response** :
```json
{
  "success": true,
  "users": [...],
  "count": 10
}
```

#### `POST /api/admin/users`
Créer un nouvel utilisateur

**Body** :
```json
{
  "email": "nouveau@smartboitage.fr",
  "nom": "Jean Dupont",
  "password": "motdepasse123",
  "role": "commercial",
  "telephone": "0612345678",
  "adresse": "1 rue de la Paix, Paris"
}
```

#### `GET /api/admin/users/[id]`
Récupérer un utilisateur spécifique

#### `PUT /api/admin/users/[id]`
Mettre à jour un utilisateur

**Body** :
```json
{
  "nom": "Jean Dupont",
  "email": "jean.dupont@smartboitage.fr",
  "role": "manager",
  "actif": true,
  "telephone": "0612345678",
  "newPassword": "nouveau_mdp" // Optionnel
}
```

#### `DELETE /api/admin/users/[id]`
Supprimer un utilisateur

---

### Statistiques (Admin uniquement)

#### `GET /api/admin/stats?period=30`
Statistiques système

**Query params** :
- `period` : 7, 30, 90, 365 (jours)

**Response** :
```json
{
  "success": true,
  "stats": {
    "total_commercials": 5,
    "active_commercials": 4,
    "total_sessions": 120,
    "completed_sessions": 100,
    "total_segments_completed": 5000,
    "total_distance_m": 150000,
    "avg_session_duration": 3600
  },
  "userPerformance": [...],
  "zonePopularity": [...],
  "dailyActivity": [...]
}
```

---

### Historique (Admin/Manager)

#### `GET /api/admin/history`
Historique des sessions

**Query params** :
- `userId` : Filtrer par utilisateur
- `zoneId` : Filtrer par zone
- `startDate` : Date début (YYYY-MM-DD)
- `endDate` : Date fin (YYYY-MM-DD)
- `limit` : Nombre de résultats (défaut: 50)
- `offset` : Pagination (défaut: 0)

**Response** :
```json
{
  "success": true,
  "history": [...],
  "pagination": {
    "total": 200,
    "limit": 50,
    "offset": 0,
    "hasMore": true
  }
}
```

---

### Sessions (Tous)

#### `POST /api/tour/complete`
Terminer et archiver une session

**Body** :
```json
{
  "sessionId": "uuid",
  "commentaire": "Bonne tournée",
  "meteo": "Ensoleillé",
  "temperature": 22
}
```

Cette route appelle automatiquement la fonction SQL `fn_archive_session` qui :
- Archive la session dans `session_history`
- Met à jour les statistiques quotidiennes (`daily_stats`)
- Enregistre toutes les métriques

---

## Base de données

### Nouvelles tables

#### `users` (étendue)

Colonnes ajoutées :
- `password_hash` - Hash bcrypt du mot de passe
- `role` - admin | commercial | manager
- `actif` - Compte actif/inactif
- `telephone` - Numéro de téléphone
- `adresse` - Adresse postale
- `date_embauche` - Date d'embauche
- `last_login` - Dernière connexion
- `reset_token` - Token de réinitialisation MDP
- `reset_token_expiry` - Expiration du token

#### `session_history`

Archive de toutes les sessions terminées :
- `session_id` - Référence à la session
- `user_id` - Commercial assigné
- `zone_id` - Zone visitée
- `zone_nom` - Nom de la zone
- `started_at` - Date/heure début
- `ended_at` - Date/heure fin
- `duration_seconds` - Durée en secondes
- `total_segments` - Nombre total de segments
- `completed_segments` - Segments complétés
- `distance_m` - Distance en mètres
- `adresse_depart` - Adresse de départ
- `adresse_fin` - Adresse de fin
- `commentaire` - Commentaire du commercial
- `meteo` - Conditions météo
- `temperature` - Température

#### `activity_log`

Journal d'audit de toutes les actions :
- `user_id` - Utilisateur
- `user_email` - Email
- `action` - Type d'action (login, create_user, etc.)
- `entity_type` - Type d'entité (user, zone, session)
- `entity_id` - ID de l'entité
- `details` - Détails JSON
- `ip_address` - Adresse IP
- `created_at` - Date/heure

#### `daily_stats`

Statistiques agrégées par jour et par utilisateur :
- `user_id` - Utilisateur
- `date` - Date
- `sessions_count` - Nombre de sessions
- `segments_completed` - Segments complétés
- `distance_m` - Distance totale
- `duration_seconds` - Durée totale
- `zones_count` - Nombre de zones visitées

#### `teams`

Équipes de commerciaux :
- `nom` - Nom de l'équipe
- `description` - Description
- `manager_id` - Manager assigné
- `actif` - Équipe active/inactive

#### `team_members`

Membres des équipes :
- `team_id` - Équipe
- `user_id` - Utilisateur
- `role` - member | lead
- `joined_at` - Date d'ajout

### Vues SQL

#### `v_user_performance`

Performance de chaque utilisateur :
```sql
SELECT * FROM v_user_performance;
```

Colonnes :
- `user_id`, `nom`, `email`, `role`
- `total_sessions` - Nombre de sessions
- `total_segments_completed` - Segments distribués
- `total_distance_m` - Distance totale
- `total_duration_seconds` - Temps total
- `avg_completion_rate` - Taux moyen de complétion
- `last_activity` - Dernière activité
- `zones_visited` - Zones visitées

#### `v_daily_activity`

Activité quotidienne globale :
```sql
SELECT * FROM v_daily_activity ORDER BY date DESC;
```

#### `v_zone_popularity`

Zones les plus utilisées :
```sql
SELECT * FROM v_zone_popularity ORDER BY session_count DESC;
```

### Fonctions SQL

#### `fn_archive_session(session_id UUID)`

Archive une session terminée :
```sql
SELECT fn_archive_session('uuid-here');
```

Actions :
1. Récupère les données de la session
2. Calcule les statistiques
3. Insère dans `session_history`
4. Met à jour `daily_stats`

#### `fn_log_activity(...)`

Enregistre une activité :
```sql
SELECT fn_log_activity(
  user_id,
  user_email,
  'login',
  'user',
  entity_id,
  '{"details": "value"}'::jsonb,
  '192.168.1.1'
);
```

---

## Sécurité

### Authentification

- ✅ **Hachage bcrypt** pour les mots de passe (10 rounds)
- ✅ **Sessions JWT** avec secret cryptographique
- ✅ **Expiration automatique** après 30 jours
- ✅ **Protection CSRF** via NextAuth

### Protection des routes

#### Middleware Next.js

Fichier : `middleware.ts`

Protection automatique de toutes les routes sauf :
- `/auth/*` - Pages d'authentification
- `/api/auth/*` - Endpoints NextAuth
- `/` - Page d'accueil
- Fichiers statiques

Redirections :
- Non authentifié → `/auth/login`
- Rôle insuffisant → `/`

#### Composant ProtectedRoute

Utilisation dans une page :

```tsx
import ProtectedRoute from '@/components/ProtectedRoute';

export default function AdminPage() {
  return (
    <ProtectedRoute requiredRole="admin">
      <div>Contenu admin uniquement</div>
    </ProtectedRoute>
  );
}
```

#### Helpers backend

Dans les API routes :

```tsx
import { getServerSession } from 'next-auth';
import { authOptions, requireAdmin } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  await requireAdmin(session); // Lance une erreur si pas admin

  // Code protégé...
}
```

Fonctions disponibles :
- `requireAuth(session)` - Nécessite authentification
- `requireAdmin(session)` - Nécessite rôle admin
- `requireManager(session)` - Nécessite admin ou manager

### Bonnes pratiques

#### Changement des mots de passe par défaut

```sql
-- En production, changer TOUS les mots de passe !
UPDATE users
SET password_hash = crypt('nouveau_mot_de_passe', gen_salt('bf'))
WHERE email = 'admin@smartboitage.fr';
```

#### Génération de NEXTAUTH_SECRET sécurisé

```bash
# Générer un secret de 32 caractères
openssl rand -base64 32
```

#### Protection des endpoints sensibles

Toujours vérifier l'authentification et le rôle :

```tsx
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }

  const userRole = (session.user as any)?.role;

  if (userRole !== 'admin') {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 });
  }

  // Code protégé...
}
```

---

## Workflows typiques

### 1. Création d'un nouveau commercial

**Par l'administrateur :**

1. Aller sur `/admin/users`
2. Cliquer sur "Nouvel utilisateur"
3. Remplir le formulaire :
   - Nom : Jean Dupont
   - Email : jean.dupont@smartboitage.fr
   - Mot de passe : temp123 (à changer par l'utilisateur)
   - Rôle : Commercial
   - Téléphone : 0612345678
4. Cliquer sur "Créer"

**Le commercial peut ensuite** :
1. Se connecter avec ses identifiants
2. Aller sur `/profile`
3. Changer son mot de passe
4. Créer ses zones et débuter ses tournées

### 2. Suivi d'une équipe

**Par le manager :**

1. Aller sur `/admin/history`
2. Filtrer par période (ex: derniers 7 jours)
3. Filtrer par commercial si besoin
4. Visualiser les performances :
   - Taux de complétion
   - Distance parcourue
   - Temps passé
5. Exporter en CSV pour analyse

### 3. Archivage automatique

**À la fin d'une tournée** :

Quand le commercial clique sur "Terminer" :
1. Appel à `/api/tour/complete`
2. Fonction SQL `fn_archive_session` déclenchée
3. Session archivée dans `session_history`
4. Statistiques mises à jour dans `daily_stats`
5. Visible immédiatement dans `/admin/history`

---

## Dépannage

### Erreur : "NEXTAUTH_SECRET not defined"

**Solution :**
```bash
# Ajouter à .env
NEXTAUTH_SECRET=$(openssl rand -base64 32)
```

### Erreur : "Cannot read properties of undefined (reading 'role')"

**Solution :**
Vérifier que la session est chargée :
```tsx
const { data: session, status } = useSession();

if (status === 'loading') {
  return <div>Loading...</div>;
}
```

### Les utilisateurs ne peuvent pas se connecter

**Vérifier** :
1. Migration `db:auth` exécutée
2. Utilisateurs créés dans la base
3. Hachage bcrypt correct
4. NEXTAUTH_URL correspond à l'URL de l'app

**Debug** :
```sql
-- Vérifier les utilisateurs
SELECT id, email, role, actif FROM users;

-- Vérifier les mots de passe hachés
SELECT email, password_hash IS NOT NULL as has_password FROM users;
```

### Redirection infinie sur /auth/login

**Solution :**
Vérifier que `/auth/login` est bien dans les exceptions du middleware :
```ts
// middleware.ts
if (path.startsWith('/auth/')) {
  return true;
}
```

---

## Prochaines étapes (optionnelles)

- [ ] Gestion complète des équipes (`/admin/teams`)
- [ ] Notifications push pour nouvelles zones
- [ ] Export PDF des rapports
- [ ] Graphiques de tendances
- [ ] Intégration OAuth (Google, Microsoft)
- [ ] Application mobile native
- [ ] API publique avec clés d'accès
- [ ] Webhooks pour intégrations tierces

---

**Documentation générée pour SmartBoitage PRO v2.0**
Dernière mise à jour : 2025
