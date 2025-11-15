# Déploiement sur Railway

Ce guide explique comment déployer SmartBoitage sur Railway.

## Prérequis

- Compte Railway : https://railway.app
- Compte GitHub (pour le déploiement automatique)
- Clés API nécessaires :
  - OpenRouteService API Key (gratuit sur https://openrouteservice.org/dev/#/signup)

## Étapes de déploiement

### 1. Créer un nouveau projet sur Railway

1. Connectez-vous à https://railway.app
2. Cliquez sur "New Project"
3. Sélectionnez "Deploy from GitHub repo"
4. Choisissez le repository `SmartBoitage`

### 2. Ajouter une base de données PostgreSQL

1. Dans votre projet Railway, cliquez sur "New"
2. Sélectionnez "Database" → "Add PostgreSQL"
3. Railway va automatiquement créer une base PostgreSQL avec PostGIS disponible
4. La variable `DATABASE_URL` sera automatiquement configurée

### 3. Installer l'extension PostGIS

Railway PostgreSQL supporte PostGIS. Connectez-vous à votre base de données :

```bash
# Via Railway CLI
railway run psql $DATABASE_URL

# Ou via l'interface Railway "Connect" → copier les credentials
```

Puis exécutez :

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
```

### 4. Initialiser le schéma de la base de données

Utilisez Railway CLI pour exécuter les scripts de migration :

```bash
# Installer Railway CLI
npm i -g @railway/cli

# Se connecter
railway login

# Lier au projet
railway link

# Exécuter les migrations
railway run npm run db:setup
```

Ou manuellement via psql en uploadant les fichiers :
- `scripts/init-db.sql`
- `scripts/migrate.sql`
- `scripts/add-auth.sql`

### 5. Configurer les variables d'environnement

Dans Railway, allez dans l'onglet "Variables" et ajoutez :

#### Variables obligatoires :

```bash
# OpenRouteService (pour le routing)
ORS_API_KEY=votre_cle_api_ors
ORS_BASE_URL=https://api.openrouteservice.org

# Overpass API (pour OpenStreetMap data)
OVERPASS_URL=https://overpass-api.de/api/interpreter

# Application URL (sera fourni par Railway)
NEXT_PUBLIC_APP_URL=${{ RAILWAY_PUBLIC_DOMAIN }}
NEXTAUTH_URL=${{ RAILWAY_PUBLIC_DOMAIN }}

# Secret pour NextAuth (générer avec: openssl rand -base64 32)
NEXTAUTH_SECRET=votre_secret_aleatoire_32_caracteres_minimum

# Node environment
NODE_ENV=production
```

#### Variables optionnelles :

```bash
# Pool de connexions PostgreSQL
DB_POOL_MAX=20
DB_POOL_IDLE_TIMEOUT=30000
DB_POOL_CONNECTION_TIMEOUT=10000

# Debug
DEBUG=false
```

**Note :** `DATABASE_URL` est automatiquement configuré par Railway quand vous ajoutez PostgreSQL.

### 6. Déployer

Railway déploiera automatiquement votre application :

1. À chaque push sur la branche principale
2. Ou manuellement via le bouton "Deploy" dans l'interface Railway

Le build utilisera :
- `npm ci` pour installer les dépendances
- `npm run build` pour construire l'application Next.js
- `npm start` pour lancer le serveur en production

### 7. Configuration du domaine

Railway fournit automatiquement un domaine `*.railway.app`. Vous pouvez :

1. Utiliser le domaine Railway par défaut
2. Ajouter un domaine personnalisé dans l'onglet "Settings" → "Domains"

**Important :** Mettez à jour `NEXT_PUBLIC_APP_URL` et `NEXTAUTH_URL` avec votre domaine final.

## Vérification du déploiement

Après le déploiement, vérifiez :

1. ✅ L'application est accessible via l'URL Railway
2. ✅ La connexion à la base de données fonctionne
3. ✅ L'authentification fonctionne (page de login)
4. ✅ Les cartes s'affichent correctement
5. ✅ Le routing fonctionne (nécessite ORS_API_KEY valide)

## Dépannage

### Erreur de connexion à la base de données

Vérifiez que :
- PostgreSQL est bien ajouté au projet
- `DATABASE_URL` est défini dans les variables
- PostGIS est installé sur la base

### Erreur de build

- Vérifiez les logs dans Railway
- Assurez-vous que Node 18+ est utilisé
- Vérifiez que toutes les dépendances sont dans `package.json`

### Erreur 500 au démarrage

- Vérifiez les logs de l'application
- Assurez-vous que `NEXTAUTH_SECRET` est défini
- Vérifiez que la base de données est initialisée

## Commandes utiles Railway CLI

```bash
# Voir les logs en temps réel
railway logs

# Exécuter une commande dans l'environnement Railway
railway run <commande>

# Ouvrir un shell dans l'environnement
railway shell

# Voir les variables d'environnement
railway variables

# Se connecter à PostgreSQL
railway run psql $DATABASE_URL
```

## Coûts

Railway offre :
- **Plan gratuit** : 500 heures d'exécution/mois + $5 de crédit
- **Plan développeur** : $5/mois pour un usage illimité
- PostgreSQL inclus dans les deux plans

Bien plus flexible que les 100 déploiements gratuits de Vercel !

## Migration depuis Vercel

Si vous migrez depuis Vercel :

1. Exportez vos variables d'environnement de Vercel
2. Importez-les dans Railway
3. Assurez-vous d'avoir PostgreSQL configuré (Vercel PostgreSQL ≠ Railway PostgreSQL)
4. Testez l'application sur Railway avant de supprimer Vercel

## Support

- Documentation Railway : https://docs.railway.app
- Discord Railway : https://discord.gg/railway
- Repository : https://github.com/LilyDPE/SmartBoitage
