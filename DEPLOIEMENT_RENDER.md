# 🚀 Déploiement SmartBoitage sur Render + Supabase (100% GRATUIT)

Guide complet pour déployer votre application gratuitement sur Render avec Supabase pour PostgreSQL + PostGIS.

**💰 Coût total : 0€ pour toujours**

---

## 📋 Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Étape 1 : Créer la base de données Supabase](#étape-1--créer-la-base-de-données-supabase)
3. [Étape 2 : Initialiser la base de données](#étape-2--initialiser-la-base-de-données)
4. [Étape 3 : Déployer l'app sur Render](#étape-3--déployer-lapp-sur-render)
5. [Étape 4 : Obtenir une clé OpenRouteService](#étape-4--obtenir-une-clé-openrouteservice)
6. [Étape 5 : Configurer les variables d'environnement](#étape-5--configurer-les-variables-denvironnement)
7. [Étape 6 : Vérifier le déploiement](#étape-6--vérifier-le-déploiement)
8. [Gestion de l'endormissement](#gestion-de-lendormissement)
9. [Dépannage](#dépannage)

---

## Vue d'ensemble

### Architecture

```
┌─────────────────┐      ┌──────────────────┐
│  Render (App)   │◄────►│ Supabase (DB)    │
│  Next.js        │      │ PostgreSQL+PostGIS│
│  GRATUIT        │      │ GRATUIT          │
└─────────────────┘      └──────────────────┘
```

### Ce que vous allez avoir

- ✅ Application Next.js sur Render (gratuit)
- ✅ PostgreSQL + PostGIS sur Supabase (gratuit)
- ✅ Déploiements automatiques depuis GitHub (illimités)
- ✅ HTTPS automatique
- ⚠️ App s'endort après 15min (réveil en 30-60s)

---

## Étape 1 : Créer la base de données Supabase

### 1.1 Créer un compte Supabase

1. Allez sur **https://supabase.com**
2. Cliquez sur **"Start your project"**
3. Connectez-vous avec **GitHub** (recommandé)
4. Autorisez Supabase

### 1.2 Créer un nouveau projet

1. Sur le dashboard, cliquez sur **"New project"**
2. Sélectionnez votre organisation (ou créez-en une)
3. Remplissez les informations :

```
Project Name: smartboitage
Database Password: [Générer un mot de passe fort]
Region: Europe (Frankfurt) ou autre proche de vous
Pricing Plan: Free (0$/month)
```

4. Cliquez sur **"Create new project"**

**⏱️ Attente :** 2-3 minutes pour la création de la base

### 1.3 Activer PostGIS

Une fois le projet créé :

1. Dans la barre latérale gauche, cliquez sur **"SQL Editor"**
2. Cliquez sur **"+ New query"**
3. Copiez-collez ce code SQL :

```sql
-- Activer l'extension PostGIS
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;

-- Vérifier l'installation
SELECT PostGIS_version();
```

4. Cliquez sur **"Run"** (ou Ctrl+Enter)
5. Vous devriez voir la version de PostGIS (ex: `3.3.2`)

✅ **PostGIS est activé !**

### 1.4 Récupérer la connexion DATABASE_URL

1. Dans la barre latérale, cliquez sur **"Project Settings"** (icône engrenage)
2. Allez dans **"Database"**
3. Sous "Connection string", sélectionnez **"URI"**
4. Cliquez sur le bouton **"Copy"** à côté de "Connection string"

Vous obtiendrez quelque chose comme :
```
postgresql://postgres.xxxxxxxxxxxxx:[YOUR-PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:5432/postgres
```

**⚠️ IMPORTANT :** Gardez cette URL en sécurité, vous en aurez besoin !

---

## Étape 2 : Initialiser la base de données

Maintenant qu'on a PostgreSQL + PostGIS, il faut créer les tables.

### Option A : Via l'interface Supabase (Recommandé)

1. Dans Supabase, allez dans **"SQL Editor"**
2. Cliquez sur **"+ New query"**

#### 2.1 Exécuter init-db.sql

1. Ouvrez le fichier `/scripts/init-db.sql` dans votre éditeur local
2. Copiez TOUT le contenu
3. Collez dans le SQL Editor de Supabase
4. Cliquez sur **"Run"**

✅ Tables de base créées !

#### 2.2 Exécuter migrate.sql

1. Créez une **nouvelle query** (+ New query)
2. Ouvrez `/scripts/migrate.sql` localement
3. Copiez-collez le contenu
4. Cliquez sur **"Run"**

✅ Migrations appliquées !

#### 2.3 Exécuter add-auth.sql

1. Créez une **nouvelle query**
2. Ouvrez `/scripts/add-auth.sql` localement
3. Copiez-collez le contenu
4. Cliquez sur **"Run"**

✅ Tables d'authentification créées !

### Option B : Via psql (Avancé)

Si vous préférez utiliser psql en local :

```bash
# Remplacez [DATABASE_URL] par votre URL Supabase
psql "[DATABASE_URL]" -f scripts/init-db.sql
psql "[DATABASE_URL]" -f scripts/migrate.sql
psql "[DATABASE_URL]" -f scripts/add-auth.sql
```

### 2.4 Vérifier les tables

Dans Supabase, allez dans **"Table Editor"**. Vous devriez voir :

- ✅ `zones`
- ✅ `segments_rue`
- ✅ `points_livraison`
- ✅ `routes`
- ✅ `vehicules`
- ✅ `utilisateurs`
- ✅ `sessions_tournee`
- ✅ `historique_tournees`

🎉 **Base de données prête !**

---

## Étape 3 : Déployer l'app sur Render

### 3.1 Créer un compte Render

1. Allez sur **https://render.com**
2. Cliquez sur **"Get Started"**
3. Connectez-vous avec **GitHub** (recommandé)
4. Autorisez Render

### 3.2 Créer un nouveau Web Service

1. Sur le dashboard Render, cliquez sur **"New +"**
2. Sélectionnez **"Web Service"**

### 3.3 Connecter votre repository GitHub

1. Si c'est la première fois :
   - Cliquez sur **"Configure account"**
   - Autorisez Render à accéder à vos repositories
   - Sélectionnez **"All repositories"** ou choisissez **SmartBoitage**

2. Dans la liste, trouvez et sélectionnez **SmartBoitage**
3. Cliquez sur **"Connect"**

### 3.4 Configurer le service

Remplissez les informations :

```
Name: smartboitage
Region: Frankfurt (EU Central)
Branch: main (ou votre branche principale)
Runtime: Node
Build Command: npm install && npm run build
Start Command: npm start
Plan Type: Free
```

**⚠️ NE CLIQUEZ PAS ENCORE sur "Create Web Service" !**

### 3.5 Variables d'environnement avancées

Avant de créer, descendez jusqu'à **"Environment Variables"** et ajoutez :

Cliquez sur **"Add Environment Variable"** et ajoutez une par une :

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `NEXT_PUBLIC_APP_URL` | `https://smartboitage.onrender.com` |
| `NEXTAUTH_URL` | `https://smartboitage.onrender.com` |
| `ORS_BASE_URL` | `https://api.openrouteservice.org` |
| `OVERPASS_URL` | `https://overpass-api.de/api/interpreter` |
| `DB_POOL_MAX` | `20` |
| `DB_POOL_IDLE_TIMEOUT` | `30000` |
| `DB_POOL_CONNECTION_TIMEOUT` | `10000` |

**⚠️ Important :** On ajoutera `DATABASE_URL`, `ORS_API_KEY` et `NEXTAUTH_SECRET` après.

### 3.6 Créer le service

Maintenant cliquez sur **"Create Web Service"**

Render va :
1. ✅ Cloner votre repo
2. ✅ Installer les dépendances (`npm install`)
3. ⚠️ Build va échouer (normal, il manque des variables)

**C'est normal ! On va les ajouter maintenant.**

---

## Étape 4 : Obtenir une clé OpenRouteService

### 4.1 Créer un compte ORS

1. Allez sur **https://openrouteservice.org/dev/#/signup**
2. Créez un compte gratuit
3. Confirmez votre email

### 4.2 Générer une clé API

1. Connectez-vous sur https://openrouteservice.org
2. Allez dans **"Request a Token"**
3. Remplissez :
   ```
   Token Name: SmartBoitage
   ```
4. Cliquez sur **"Create Token"**
5. **Copiez la clé API** (elle ressemble à : `5b3ce3597851110001cf6248abc...`)

⚠️ **Gardez cette clé, vous ne pourrez plus la voir !**

---

## Étape 5 : Configurer les variables d'environnement

### 5.1 Ajouter les variables manquantes

Retournez sur Render, dans votre service **smartboitage** :

1. Allez dans l'onglet **"Environment"** (à gauche)
2. Cliquez sur **"Add Environment Variable"**

Ajoutez ces 3 variables manquantes :

#### DATABASE_URL (depuis Supabase)

```
Key: DATABASE_URL
Value: postgresql://postgres.xxxxx:[PASSWORD]@aws-0-eu-central-1.pooler.supabase.com:5432/postgres
```

(Collez l'URL que vous avez copiée depuis Supabase à l'Étape 1.4)

#### ORS_API_KEY (depuis OpenRouteService)

```
Key: ORS_API_KEY
Value: 5b3ce3597851110001cf6248abc...
```

(Collez la clé API ORS de l'Étape 4.2)

#### NEXTAUTH_SECRET (générer un nouveau)

Sur votre terminal local, exécutez :

```bash
openssl rand -base64 32
```

Ou utilisez ce site : https://generate-secret.vercel.app/32

Copiez le résultat et ajoutez :

```
Key: NEXTAUTH_SECRET
Value: [votre_secret_généré]
```

### 5.2 Vérifier l'URL du service

1. Dans Render, regardez en haut de la page votre URL
2. Elle ressemble à : `https://smartboitage.onrender.com`

Si votre URL est **différente**, mettez à jour :
- `NEXT_PUBLIC_APP_URL`
- `NEXTAUTH_URL`

Avec votre vraie URL.

### 5.3 Sauvegarder

Cliquez sur **"Save Changes"**

Render va automatiquement **redéployer** l'application avec les nouvelles variables.

---

## Étape 6 : Vérifier le déploiement

### 6.1 Suivre le build

1. Dans Render, allez dans l'onglet **"Logs"**
2. Vous verrez le build en temps réel :

```
==> Cloning from https://github.com/...
==> Running build command 'npm install && npm run build'...
==> Installing dependencies...
==> Building Next.js...
   ✓ Compiled successfully
   ✓ Linting and checking validity of types
   ✓ Collecting page data
   ✓ Generating static pages
==> Build complete!
==> Starting application...
```

**⏱️ Durée :** 2-5 minutes

### 6.2 Tester l'application

Une fois le déploiement terminé (cercle vert "Live") :

1. Cliquez sur le lien en haut : **https://smartboitage.onrender.com**
2. L'application devrait s'ouvrir ! 🎉

### 6.3 Checklist de vérification

Testez ces fonctionnalités :

- [ ] **Page d'accueil** → Charge correctement
- [ ] **Page de login** → `/auth/login` → Formulaire visible
- [ ] **Créer un compte** → Inscription fonctionne
- [ ] **Se connecter** → Login fonctionne
- [ ] **Carte s'affiche** → Voir OpenStreetMap
- [ ] **Créer une zone** → Dessiner une zone sur la carte
- [ ] **Voir les zones** → Liste des zones créées

✅ **Si tout fonctionne, bravo ! Vous êtes déployé !**

---

## Gestion de l'endormissement

### Comprendre l'endormissement

Sur le plan **gratuit** de Render :
- App s'endort après **15 minutes** d'inactivité
- Premier accès après endormissement = **30-60 secondes** de chargement
- Ensuite tout est **rapide** pendant que l'app est active

### Pour votre usage (1 commercial, 2h/jour)

**Scénario typique :**

```
9h00 → Commercial se connecte → 30s de chargement (réveil)
9h01-11h00 → Travail fluide pendant 2h ✅
11h00 → Fermeture
11h15 → App s'endort

14h00 → Reconnexion → 30s de chargement (réveil)
14h01-16h00 → Travail fluide pendant 2h ✅
```

**Impact :** 30s au début de chaque session → Totalement acceptable !

### Option : Garder l'app réveillée (UptimeRobot)

Si vous voulez éviter l'endormissement :

#### 1. Créer un compte UptimeRobot

1. Allez sur **https://uptimerobot.com**
2. Créez un compte gratuit

#### 2. Ajouter un moniteur

1. Cliquez sur **"+ Add New Monitor"**
2. Configurez :
   ```
   Monitor Type: HTTP(s)
   Friendly Name: SmartBoitage
   URL: https://smartboitage.onrender.com
   Monitoring Interval: 5 minutes
   ```
3. Cliquez sur **"Create Monitor"**

**Résultat :** UptimeRobot va "ping" votre app toutes les 5 minutes → Elle ne s'endormira jamais !

**Coût :** 0€ (UptimeRobot gratuit permet 50 moniteurs)

---

## Dépannage

### ❌ Build échoue : "Type error"

**Problème :** Erreurs TypeScript

**Solution :**
1. Les erreurs TypeScript ont déjà été corrigées dans la branche `claude/deploy-railway-01UC5i1YqDNxfgNS4MyHkeCv`
2. Mergez cette branche dans votre branche principale
3. Render redéploiera automatiquement

### ❌ Erreur "Cannot connect to database"

**Problème :** `DATABASE_URL` incorrect

**Solutions :**
1. Vérifiez que `DATABASE_URL` est bien défini dans Render Environment
2. Vérifiez que l'URL contient le bon mot de passe
3. Testez la connexion depuis Supabase : SQL Editor → `SELECT 1;`
4. Format attendu : `postgresql://postgres.xxx:[PASSWORD]@aws-0-xxx.pooler.supabase.com:5432/postgres`

### ❌ Erreur "PostGIS extension not found"

**Problème :** PostGIS pas activé

**Solution :**
1. Allez dans Supabase → SQL Editor
2. Exécutez :
   ```sql
   CREATE EXTENSION IF NOT EXISTS postgis;
   SELECT PostGIS_version();
   ```
3. Vous devriez voir la version de PostGIS

### ❌ Erreur "NEXTAUTH_SECRET is missing"

**Problème :** Variable d'environnement manquante

**Solution :**
1. Générez un secret : `openssl rand -base64 32`
2. Allez dans Render → Environment
3. Ajoutez `NEXTAUTH_SECRET` avec la valeur générée
4. Sauvegardez (redéploiement automatique)

### ❌ Carte ne s'affiche pas

**Problème :** Erreurs Leaflet ou tuiles OSM

**Solutions :**
1. Ouvrez la console du navigateur (F12)
2. Vérifiez les erreurs
3. Assurez-vous que l'URL est en HTTPS (Render le fait automatiquement)
4. Vérifiez que OpenStreetMap tiles sont accessibles

### ❌ Routing ne fonctionne pas

**Problème :** ORS API key invalide ou quota dépassé

**Solutions :**
1. Vérifiez que `ORS_API_KEY` est correct dans Render Environment
2. Connectez-vous sur https://openrouteservice.org
3. Vérifiez votre quota dans le dashboard
4. Plan gratuit = 2000 requêtes/jour
5. Si quota dépassé, attendez le lendemain ou créez une nouvelle clé

### 🐌 App très lente

**Problème :** Probablement endormie ou région éloignée

**Solutions :**
1. Si premier accès du jour → Attendez 30-60s (réveil)
2. Vérifiez la région Render : Europe recommandée
3. Utilisez UptimeRobot pour éviter l'endormissement

### 💰 Coûts inattendus

**Problème :** Factures Render ou Supabase

**Solutions :**
1. Render Free = 750h/mois → Largement suffisant
2. Supabase Free = 500MB → Vérifiez votre usage
3. Si dépassement Supabase :
   - Nettoyez les vieilles données
   - Ou passez à Supabase Pro ($25/mois)
4. Si dépassement Render :
   - Vérifiez que vous êtes bien sur le plan Free
   - Désactivez les anciens services

---

## 📚 Ressources utiles

### Documentation

- **Render** : https://render.com/docs
- **Supabase** : https://supabase.com/docs
- **OpenRouteService** : https://openrouteservice.org/dev/#/api-docs
- **Next.js** : https://nextjs.org/docs

### Support

- **Render Community** : https://community.render.com
- **Supabase Discord** : https://discord.supabase.com
- **GitHub Issues** : https://github.com/LilyDPE/SmartBoitage/issues

---

## 🎉 Félicitations !

Votre application SmartBoitage est maintenant déployée gratuitement sur Render + Supabase !

### Ce que vous avez

- ✅ Application Next.js hébergée gratuitement
- ✅ PostgreSQL + PostGIS gratuit
- ✅ Déploiements automatiques depuis GitHub
- ✅ HTTPS automatique
- ✅ 0€/mois pour toujours

### Prochaines étapes

1. **Créer votre premier utilisateur** via l'interface
2. **Tester les fonctionnalités** :
   - Créer une zone de distribution
   - Ajouter des points de livraison
   - Optimiser un parcours
3. **Partager l'URL** avec vos commerciaux
4. **Monitorer** avec UptimeRobot (optionnel)

### Déploiements automatiques

À partir de maintenant, chaque fois que vous pushez du code sur GitHub :
- ✅ Render détecte le changement
- ✅ Build automatiquement
- ✅ Déploie si le build réussit
- ✅ Garde l'ancienne version si le build échoue

**Profitez de votre application ! 🚀**

---

*Besoin d'aide ? Ouvrez une issue sur GitHub : https://github.com/LilyDPE/SmartBoitage/issues*
