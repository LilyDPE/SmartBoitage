# 🚀 Guide Complet de Déploiement sur Railway - SmartBoitage

Guide étape par étape pour déployer votre application sur Railway, de A à Z.

---

## 📋 Table des matières

1. [Prérequis](#prérequis)
2. [Étape 1 : Créer un compte Railway](#étape-1--créer-un-compte-railway)
3. [Étape 2 : Créer un nouveau projet](#étape-2--créer-un-nouveau-projet)
4. [Étape 3 : Ajouter PostgreSQL](#étape-3--ajouter-postgresql)
5. [Étape 4 : Installer PostGIS](#étape-4--installer-postgis)
6. [Étape 5 : Configurer les variables d'environnement](#étape-5--configurer-les-variables-denvironnement)
7. [Étape 6 : Initialiser la base de données](#étape-6--initialiser-la-base-de-données)
8. [Étape 7 : Vérifier le déploiement](#étape-7--vérifier-le-déploiement)
9. [Étape 8 : Configurer un domaine](#étape-8--configurer-un-domaine)
10. [Dépannage](#dépannage)

---

## Prérequis

Avant de commencer, assurez-vous d'avoir :

- ✅ Un compte GitHub (avec le repository SmartBoitage)
- ✅ Une clé API OpenRouteService (gratuit)
- ✅ 10-15 minutes devant vous

---

## Étape 1 : Créer un compte Railway

### 1.1 Aller sur Railway

Ouvrez votre navigateur et allez sur : **https://railway.app**

### 1.2 S'inscrire

1. Cliquez sur **"Login"** en haut à droite
2. Choisissez **"Sign in with GitHub"** (recommandé)
3. Autorisez Railway à accéder à votre compte GitHub
4. Confirmez votre email si demandé

**📌 Pourquoi GitHub ?** Cela permet à Railway de déployer automatiquement votre code depuis GitHub.

### 1.3 Plans et tarifs (Important !)

**⚠️ Railway n'est plus 100% gratuit**

Voici les vrais plans en 2025 :

#### 🎁 Trial (Essai gratuit - 30 jours)
- **$5 de crédit** valable 30 jours
- Accès complet à toutes les fonctionnalités
- PostgreSQL inclus
- Parfait pour tester !

#### 💳 Hobby Plan (Après le trial)
- **$5/mois minimum** (abonnement obligatoire)
- **Inclut $5 de crédit d'usage**
- Si vous dépassez $5 d'usage → vous payez la différence
- PostgreSQL inclus

**Exemple de coût réel :**
- Si votre app consomme $3/mois → vous payez $5 (le minimum)
- Si votre app consomme $7/mois → vous payez $5 + $2 = $7

#### 🆓 Free Plan (après trial si vous ne payez pas)
- Seulement **$1/mois de crédit** (très limité)
- Juste pour de petits tests, pas pour une vraie app

**💡 Conclusion :** Railway coûte **$5/mois minimum** pour une vraie utilisation.

**Mais c'est quand même mieux que Vercel gratuit :**
- Vercel : 100 déploiements max (vite atteint en dev)
- Railway : Déploiements illimités pour $5/mois

**Si vous voulez du 100% gratuit, voir les alternatives à la fin de ce guide !**

---

## Étape 2 : Créer un nouveau projet

### 2.1 Nouveau projet

1. Sur le dashboard Railway, cliquez sur **"New Project"**
2. Sélectionnez **"Deploy from GitHub repo"**

### 2.2 Connecter votre repository

1. Si c'est la première fois :
   - Cliquez sur **"Configure GitHub App"**
   - Autorisez Railway à accéder à vos repositories
   - Sélectionnez soit "All repositories" soit "Only select repositories"

2. Dans la liste, trouvez et sélectionnez **"SmartBoitage"**

### 2.3 Première branche

Railway va vous demander quelle branche déployer :
- Sélectionnez **`claude/deploy-railway-01UC5i1YqDNxfgNS4MyHkeCv`** (notre branche avec la config Railway)
- Ou **`main`** si vous avez déjà mergé les modifications

### 2.4 Premier déploiement

Railway va automatiquement :
1. ✅ Détecter que c'est un projet Next.js
2. ✅ Lire le fichier `railway.json`
3. ✅ Commencer le build

**⚠️ Le premier build va échouer** - c'est normal ! Il manque la base de données et les variables d'environnement.

---

## Étape 3 : Ajouter PostgreSQL

### 3.1 Ajouter le service PostgreSQL

Dans votre projet Railway :

1. Cliquez sur **"+ New"** (bouton en haut à droite)
2. Sélectionnez **"Database"**
3. Choisissez **"Add PostgreSQL"**

Railway va créer une base PostgreSQL en quelques secondes.

### 3.2 Vérifier la connexion

1. Cliquez sur le service PostgreSQL que vous venez de créer
2. Allez dans l'onglet **"Variables"**
3. Vous devriez voir automatiquement :
   - `DATABASE_URL`
   - `PGHOST`
   - `PGPORT`
   - `PGUSER`
   - `PGPASSWORD`
   - `PGDATABASE`

### 3.3 Lier à votre application

Railway devrait automatiquement lier PostgreSQL à votre application Next.js.

Pour vérifier :
1. Cliquez sur votre service **"smartboitage-pro"** (l'application Next.js)
2. Allez dans l'onglet **"Variables"**
3. Vous devriez voir `DATABASE_URL` référencé depuis PostgreSQL

Si ce n'est pas le cas :
1. Dans votre service Next.js, onglet **"Variables"**
2. Cliquez sur **"+ New Variable"**
3. Sélectionnez **"Add Reference"**
4. Choisissez `DATABASE_URL` depuis le service PostgreSQL

---

## Étape 4 : Installer PostGIS

PostgreSQL de Railway supporte PostGIS, mais il faut l'activer.

### Option A : Via Railway Web (Interface graphique)

1. Cliquez sur votre service **PostgreSQL**
2. Allez dans l'onglet **"Connect"**
3. Sous "Available Plugins", cliquez sur **"PostGIS"**
4. Cliquez sur **"Install"**

### Option B : Via la ligne de commande

#### 4.1 Installer Railway CLI

Ouvrez un terminal et exécutez :

```bash
npm install -g @railway/cli
```

Ou avec Homebrew (Mac) :
```bash
brew install railway
```

#### 4.2 Se connecter à Railway

```bash
railway login
```

Cela ouvrira votre navigateur pour vous connecter.

#### 4.3 Lier au projet

Dans le dossier de votre projet local :

```bash
cd /chemin/vers/SmartBoitage
railway link
```

Sélectionnez votre projet dans la liste.

#### 4.4 Se connecter à PostgreSQL

```bash
railway connect postgres
```

Cela ouvrira une session `psql` connectée à votre base PostgreSQL Railway.

#### 4.5 Installer PostGIS

Dans la console `psql`, exécutez :

```sql
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;
```

Vous devriez voir :
```
CREATE EXTENSION
CREATE EXTENSION
```

#### 4.6 Vérifier l'installation

```sql
SELECT PostGIS_version();
```

Vous devriez voir la version de PostGIS (ex: `3.3.2`).

Pour quitter psql :
```sql
\q
```

---

## Étape 5 : Configurer les variables d'environnement

### 5.1 Obtenir une clé API OpenRouteService

1. Allez sur **https://openrouteservice.org/dev/#/signup**
2. Créez un compte gratuit
3. Confirmez votre email
4. Allez dans **"Request a Token"**
5. Donnez un nom à votre token (ex: "SmartBoitage")
6. Cliquez sur **"Create Token"**
7. **Copiez la clé API** (vous ne pourrez plus la voir après !)

Exemple : `5b3ce3597851110001cf6248abcdef1234567890abcdef123456`

### 5.2 Générer un secret NextAuth

Dans votre terminal local :

```bash
openssl rand -base64 32
```

Exemple de résultat : `XyZ123abc+def/GHI456jkl==MNO789pqr`

**Copiez ce secret** - vous en aurez besoin !

### 5.3 Ajouter les variables dans Railway

1. Dans Railway, cliquez sur votre service **"smartboitage-pro"**
2. Allez dans l'onglet **"Variables"**
3. Cliquez sur **"+ New Variable"**

Ajoutez les variables suivantes **une par une** :

#### Variables OBLIGATOIRES :

| Variable | Valeur | Description |
|----------|--------|-------------|
| `ORS_API_KEY` | `votre_clé_ors` | La clé API OpenRouteService que vous avez copiée |
| `ORS_BASE_URL` | `https://api.openrouteservice.org` | URL de base de l'API ORS |
| `OVERPASS_URL` | `https://overpass-api.de/api/interpreter` | API OpenStreetMap |
| `NEXTAUTH_SECRET` | `votre_secret_openssl` | Le secret généré avec openssl |
| `NODE_ENV` | `production` | Environnement de production |

#### Variables avec références Railway :

Pour `NEXT_PUBLIC_APP_URL` et `NEXTAUTH_URL`, vous devez utiliser le domaine Railway :

1. Trouvez votre domaine Railway :
   - Allez dans l'onglet **"Settings"** de votre service Next.js
   - Sous "Domains", vous verrez quelque chose comme `smartboitage-production.up.railway.app`
   - **Copiez ce domaine**

2. Ajoutez ces variables avec le domaine complet :

| Variable | Valeur | Description |
|----------|--------|-------------|
| `NEXT_PUBLIC_APP_URL` | `https://votre-app.up.railway.app` | URL publique de votre app |
| `NEXTAUTH_URL` | `https://votre-app.up.railway.app` | URL pour NextAuth |

**⚠️ Important** : Utilisez `https://` (pas `http://`) !

#### Variables OPTIONNELLES (recommandées) :

| Variable | Valeur | Description |
|----------|--------|-------------|
| `DB_POOL_MAX` | `20` | Nombre max de connexions DB |
| `DB_POOL_IDLE_TIMEOUT` | `30000` | Timeout de connexion idle (ms) |
| `DB_POOL_CONNECTION_TIMEOUT` | `10000` | Timeout de connexion (ms) |

### 5.4 Vérifier les variables

Vous devriez avoir au total **7 variables obligatoires** :

✅ `DATABASE_URL` (référence depuis PostgreSQL)
✅ `ORS_API_KEY`
✅ `ORS_BASE_URL`
✅ `OVERPASS_URL`
✅ `NEXTAUTH_SECRET`
✅ `NEXT_PUBLIC_APP_URL`
✅ `NEXTAUTH_URL`
✅ `NODE_ENV`

---

## Étape 6 : Initialiser la base de données

Maintenant que PostGIS est installé, il faut créer les tables.

### Option A : Via Railway CLI (Recommandé)

Dans votre terminal local :

```bash
# Se connecter à la DB et exécuter init-db.sql
railway run psql $DATABASE_URL -f scripts/init-db.sql

# Exécuter les migrations
railway run psql $DATABASE_URL -f scripts/migrate.sql

# Ajouter les tables d'authentification
railway run psql $DATABASE_URL -f scripts/add-auth.sql
```

### Option B : Via interface web de PostgreSQL

1. **Copier le contenu des fichiers SQL** :
   - Ouvrez `scripts/init-db.sql` dans votre éditeur
   - Copiez tout le contenu

2. **Se connecter à la base** :
   - Dans Railway, cliquez sur votre service PostgreSQL
   - Allez dans l'onglet **"Query"**
   - Collez le contenu de `init-db.sql`
   - Cliquez sur **"Run Query"**

3. **Répétez pour** :
   - `scripts/migrate.sql`
   - `scripts/add-auth.sql`

### 6.1 Vérifier l'initialisation

Se connecter à PostgreSQL :

```bash
railway connect postgres
```

Vérifier les tables :

```sql
\dt
```

Vous devriez voir :
```
                List of relations
 Schema |        Name        | Type  |     Owner
--------+--------------------+-------+----------------
 public | delivery_points    | table | postgres
 public | routes             | table | postgres
 public | segments           | table | postgres
 public | users              | table | postgres
 public | vehicles           | table | postgres
 public | zones              | table | postgres
```

Quitter :
```sql
\q
```

---

## Étape 7 : Vérifier le déploiement

### 7.1 Redéployer l'application

Maintenant que tout est configuré :

1. Dans Railway, cliquez sur votre service **"smartboitage-pro"**
2. Allez dans l'onglet **"Deployments"**
3. Cliquez sur **"Redeploy"** (si le dernier déploiement a échoué)

Ou simplement faites un nouveau commit sur GitHub - Railway redéploiera automatiquement !

### 7.2 Suivre le build

Dans l'onglet **"Deployments"** :

1. Cliquez sur le déploiement en cours
2. Vous verrez les logs en temps réel :
   ```
   ✓ npm ci
   ✓ npm run build
   ✓ npm start
   ```

Le build prend environ **1-2 minutes**.

### 7.3 Tester l'application

1. Une fois le déploiement réussi (cercle vert ✅)
2. Cliquez sur le lien de votre domaine Railway (ex: `smartboitage-production.up.railway.app`)
3. L'application devrait s'ouvrir !

### 7.4 Checklist de vérification

Testez ces fonctionnalités :

- [ ] **Page d'accueil charge** → `/`
- [ ] **Page de connexion** → `/auth/signin`
- [ ] **Carte s'affiche** → Devrait voir OpenStreetMap
- [ ] **API fonctionne** → Testez une requête API
- [ ] **Base de données connectée** → Aucune erreur de connexion dans les logs

---

## Étape 8 : Configurer un domaine

### 8.1 Domaine Railway (Gratuit)

Par défaut, Railway vous donne un domaine comme :
```
smartboitage-production.up.railway.app
```

C'est suffisant pour commencer !

### 8.2 Domaine personnalisé (Optionnel)

Si vous avez un nom de domaine (ex: `smartboitage.com`) :

1. Dans Railway, service **"smartboitage-pro"**
2. Allez dans **"Settings"** → **"Domains"**
3. Cliquez sur **"+ Custom Domain"**
4. Entrez votre domaine (ex: `app.smartboitage.com`)
5. Railway vous donnera un enregistrement CNAME à ajouter chez votre registrar

Configuration chez votre registrar (ex: Namecheap, OVH, Cloudflare) :
```
Type: CNAME
Name: app (ou @)
Value: <ce-que-railway-vous-donne>.railway.app
```

6. **Important** : Mettez à jour les variables d'environnement :
   - `NEXT_PUBLIC_APP_URL` → `https://app.smartboitage.com`
   - `NEXTAUTH_URL` → `https://app.smartboitage.com`

---

## Dépannage

### ❌ Build échoue avec "Type error"

**Problème** : Erreur TypeScript pendant le build

**Solution** :
1. Vérifiez les logs de déploiement dans Railway
2. Corrigez les erreurs TypeScript dans votre code local
3. Committez et pushez - Railway redéploiera automatiquement

### ❌ Erreur de connexion à la base de données

**Problème** : `Error connecting to database`

**Solutions** :
1. Vérifiez que `DATABASE_URL` est bien référencé dans les variables
2. Vérifiez que PostgreSQL est bien démarré (service vert dans Railway)
3. Vérifiez que PostGIS est installé :
   ```bash
   railway connect postgres
   SELECT PostGIS_version();
   ```

### ❌ Erreur NextAuth "NEXTAUTH_SECRET is missing"

**Problème** : NextAuth ne démarre pas

**Solution** :
1. Vérifiez que `NEXTAUTH_SECRET` est bien défini dans les variables
2. Vérifiez que `NEXTAUTH_URL` correspond à votre domaine Railway
3. Redéployez l'application

### ❌ Carte ne s'affiche pas

**Problème** : Page blanche ou erreur Leaflet

**Solutions** :
1. Ouvrez la console du navigateur (F12)
2. Vérifiez s'il y a des erreurs de sécurité (CSP, CORS)
3. Vérifiez que les tuiles OpenStreetMap sont accessibles
4. Vérifiez que le domaine est en HTTPS

### ❌ Erreur ORS "Invalid API key"

**Problème** : Routing ne fonctionne pas

**Solution** :
1. Vérifiez que `ORS_API_KEY` est correct
2. Vérifiez votre quota sur OpenRouteService :
   - Connectez-vous sur https://openrouteservice.org
   - Allez dans "Dashboard"
   - Vérifiez le nombre de requêtes restantes
3. Le plan gratuit permet 2000 requêtes/jour

### 💰 Coûts dépassent le plan gratuit

**Problème** : Vous dépassez les $5 gratuits

**Solutions** :
1. Vérifiez votre consommation dans Railway Dashboard
2. Optimisez :
   - Réduisez le nombre de services en cours
   - Arrêtez les services de dev/test
   - Utilisez le "sleep mode" quand l'app n'est pas utilisée
3. Passez au plan Developer à $5/mois pour un usage illimité

### 🔧 Railway CLI ne se connecte pas

**Problème** : `railway login` échoue

**Solutions** :
1. Vérifiez votre connexion internet
2. Vérifiez que vous avez bien autorisé Railway dans votre navigateur
3. Réinstallez Railway CLI :
   ```bash
   npm uninstall -g @railway/cli
   npm install -g @railway/cli
   ```

---

## 🆓 Alternatives 100% Gratuites à Railway

Si vous cherchez du **100% gratuit sans limite de temps**, voici vos options :

### Option 1 : Render (Recommandé)

**✅ Avantages :**
- Vraiment gratuit sans limite de temps
- PostgreSQL gratuit (limité à 90 jours, puis payant ou backup manuel)
- 750h/mois d'exécution gratuite
- Auto-deploy depuis GitHub
- Supporte Next.js nativement

**❌ Inconvénients :**
- L'app "s'endort" après 15min d'inactivité → redémarrage lent (30-60s)
- PostgreSQL gratuit limité (1GB, 90 jours max)
- Besoin d'une base externe pour du long terme

**📝 Configuration :**
1. Créer compte sur https://render.com
2. "New Web Service" → Connecter GitHub
3. Build Command: `npm run build`
4. Start Command: `npm start`
5. Ajouter PostgreSQL (External Database recommandé)

**Coût réel :** $0 pour l'app, mais PostgreSQL externe recommandé ($7/mois chez Render ou gratuit externe)

---

### Option 2 : Vercel + Base de données externe

**✅ Avantages :**
- Next.js optimisé par défaut (Vercel a créé Next.js)
- Déploiement ultra-rapide
- CDN global gratuit
- Vraiment gratuit pour le frontend

**❌ Inconvénients :**
- 100 déploiements/mois max (votre problème actuel !)
- Pas de PostgreSQL gratuit
- Besoin d'une base externe

**💡 Solution hybride :**
1. **Frontend sur Vercel** (gratuit)
2. **Backend API sur autre plateforme** (Render, Railway, etc.)
3. **Base de données externe gratuite** (voir options ci-dessous)

---

### Option 3 : Bases de données PostgreSQL gratuites

Pour compléter Vercel ou Render :

#### Supabase (Recommandé pour PostGIS)
- **Gratuit** : 500MB, connexions illimitées
- **PostGIS inclus** ✅
- **Backups automatiques**
- URL : https://supabase.com
- Limite : 2 projets gratuits

#### Neon
- **Gratuit** : 512MB, 1 projet
- **Serverless** (s'endort si inactif)
- **PostGIS disponible** ✅
- URL : https://neon.tech

#### ElephantSQL (Turtle Plan)
- **Gratuit** : 20MB (très limité)
- **PostGIS disponible**
- URL : https://www.elephantsql.com
- Limite : 5 connexions simultanées

---

### 🎯 Ma recommandation selon votre budget

#### Budget = 0€ (Gratuit total)
**Configuration :**
```
Frontend/Backend : Render (gratuit)
Database         : Supabase (gratuit avec PostGIS)
```

**Inconvénients :**
- App s'endort après 15min sur Render
- Besoin de gérer 2 plateformes

**Instructions rapides :**
1. Déployer l'app sur Render
2. Créer une DB sur Supabase
3. Copier la `DATABASE_URL` de Supabase
4. Ajouter dans les variables Render
5. Exécuter les scripts SQL sur Supabase

---

#### Budget = 5€/mois
**Configuration :**
```
Tout : Railway ($5/mois)
```

**Avantages :**
- Tout au même endroit
- Pas d'endormissement
- Simple à gérer
- Déploiements illimités

**C'est ce qu'on a configuré dans ce guide !**

---

#### Budget = 7-10€/mois (Production)
**Configuration :**
```
Frontend/Backend : Vercel ou Render ($0 ou $7)
Database         : Render PostgreSQL ($7/mois)
```

**Avantages :**
- PostgreSQL avec backups automatiques
- Pas de limite de 100 déploiements
- Performances optimales

---

### 📊 Tableau comparatif

| Plateforme | App gratuite | DB gratuite | PostGIS | Endormissement | Déploiements |
|------------|--------------|-------------|---------|----------------|--------------|
| **Railway** | 30 jours | 30 jours | ✅ | ❌ | Illimité |
| **Render** | ✅ 750h/mois | 90 jours | ✅ | ✅ (15min) | Illimité |
| **Vercel** | ✅ | ❌ | - | ❌ | 100/mois max |
| **Supabase** | - | ✅ | ✅ | ✅ | - |
| **Neon** | - | ✅ | ✅ | ✅ | - |

---

### 🚀 Guide rapide : Déployer sur Render (Gratuit)

Si vous voulez tester Render au lieu de Railway :

1. **Créer compte** : https://render.com
2. **New Web Service** → Sélectionner votre repo GitHub
3. **Configuration :**
   ```
   Name: smartboitage
   Environment: Node
   Build Command: npm run build
   Start Command: npm start
   ```
4. **Variables d'environnement** :
   - Ajouter les mêmes variables que Railway
   - `DATABASE_URL` → depuis Supabase
5. **Deploy !**

L'app sera accessible sur `https://smartboitage.onrender.com`

**⚠️ Note :** L'app s'endormira après 15min d'inactivité (premier accès = 30-60s de chargement)

---

## 📚 Ressources utiles

- **Documentation Railway** : https://docs.railway.app
- **Discord Railway** : https://discord.gg/railway (support communautaire très réactif !)
- **OpenRouteService Docs** : https://openrouteservice.org/dev/#/api-docs
- **Next.js Deployment** : https://nextjs.org/docs/deployment

---

## 🎉 Félicitations !

Votre application SmartBoitage est maintenant déployée sur Railway !

### Prochaines étapes :

1. **Créer un compte utilisateur** via l'interface
2. **Tester les fonctionnalités** :
   - Créer une zone
   - Ajouter des points de livraison
   - Générer un itinéraire optimisé
3. **Monitorer les performances** dans Railway Dashboard
4. **Configurer des alertes** si nécessaire

### Déploiements automatiques

À partir de maintenant, chaque fois que vous pushez du code sur GitHub :
- ✅ Railway détecte le changement
- ✅ Build automatiquement
- ✅ Déploie si le build réussit
- ✅ Garde l'ancienne version si le build échoue

**C'est tout ! Profitez de votre application 🚀**

---

*Besoin d'aide ? Ouvrez une issue sur GitHub ou contactez le support Railway.*
