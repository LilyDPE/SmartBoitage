# 🔥 Guide de Configuration Firebase pour DPE Pro

## 📋 Étapes de Configuration

### 1. Créer un projet Firebase

1. Allez sur [Firebase Console](https://console.firebase.google.com/)
2. Cliquez sur **"Ajouter un projet"**
3. Nommez le projet: **"DPE-Pro"**
4. Désactivez Google Analytics (optionnel)
5. Créez le projet

### 2. Activer Authentication

1. Dans le menu latéral, cliquez sur **"Authentication"**
2. Cliquez sur **"Get started"**
3. Onglet **"Sign-in method"**
4. Activez **"Email/Password"**
5. Cliquez sur **"Enregistrer"**

### 3. Créer les premiers utilisateurs

Dans l'onglet **"Users"** d'Authentication:

**Administrateur:**
- Email: `admin@dpe-pro.fr`
- Mot de passe: `admin123`

**Commercial (exemple):**
- Email: `commercial@dpe-pro.fr`
- Mot de passe: `commercial123`

### 4. Activer Firestore Database

1. Dans le menu latéral, cliquez sur **"Firestore Database"**
2. Cliquez sur **"Créer une base de données"**
3. Choisissez **"Démarrer en mode production"**
4. Sélectionnez la région: **"europe-west"** (ou la plus proche)
5. Créez la base de données

### 5. Configurer les règles de sécurité Firestore

Dans l'onglet **"Règles"** de Firestore, remplacez par:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Fonction helper pour vérifier si l'utilisateur est admin
    function isAdmin() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    // Fonction helper pour vérifier si l'utilisateur est connecté
    function isAuthenticated() {
      return request.auth != null;
    }

    // Collection users
    match /users/{userId} {
      // Lecture: utilisateur connecté peut lire son propre profil, admin peut tout lire
      allow read: if isAuthenticated() && (request.auth.uid == userId || isAdmin());
      // Écriture: utilisateur peut modifier son lastActive, admin peut tout modifier
      allow update: if isAuthenticated() && (request.auth.uid == userId || isAdmin());
      // Création: seulement admin
      allow create: if isAdmin();
    }

    // Collection activities
    match /activities/{activityId} {
      // Lecture: admin peut tout lire
      allow read: if isAdmin();
      // Écriture: utilisateur connecté peut créer ses propres activités
      allow create: if isAuthenticated();
      // Update/Delete: interdit
      allow update, delete: if false;
    }

    // Collection userNotes
    match /userNotes/{userId} {
      // Lecture/Écriture: utilisateur peut accéder à ses propres notes, admin peut tout lire
      allow read, write: if isAuthenticated() && (request.auth.uid == userId || isAdmin());
    }
  }
}
```

### 6. Créer la collection "users" manuellement

Dans Firestore, créez les documents suivants:

**Document pour l'admin:**
- Collection: `users`
- Document ID: `[UID de admin@dpe-pro.fr]` (copiez depuis Authentication)
- Champs:
  ```
  email: "admin@dpe-pro.fr"
  name: "Administrateur"
  role: "admin"
  createdAt: [Timestamp actuel]
  lastActive: [Timestamp actuel]
  ```

**Document pour le commercial:**
- Collection: `users`
- Document ID: `[UID de commercial@dpe-pro.fr]`
- Champs:
  ```
  email: "commercial@dpe-pro.fr"
  name: "Commercial Demo"
  role: "commercial"
  createdAt: [Timestamp actuel]
  lastActive: [Timestamp actuel]
  ```

### 7. Obtenir la configuration Firebase

1. Dans **"Paramètres du projet"** (icône engrenage)
2. Section **"Vos applications"**
3. Cliquez sur l'icône **"</>"** (Web)
4. Nommez l'app: **"DPE-Pro-Web"**
5. **Ne pas** cocher "Firebase Hosting" pour l'instant
6. Cliquez sur **"Enregistrer l'application"**
7. Copiez la configuration `firebaseConfig`

### 8. Configurer le fichier firebase-config.js

Ouvrez `firebase-config.js` et remplacez:

```javascript
const firebaseConfig = {
    apiKey: "VOTRE_API_KEY",
    authDomain: "VOTRE_PROJECT_ID.firebaseapp.com",
    projectId: "VOTRE_PROJECT_ID",
    storageBucket: "VOTRE_PROJECT_ID.appspot.com",
    messagingSenderId: "VOTRE_MESSAGING_SENDER_ID",
    appId: "VOTRE_APP_ID"
};
```

Par vos vraies valeurs copiées depuis Firebase.

## 🚀 Déploiement sur Firebase Hosting

### 1. Installer Firebase CLI

```bash
npm install -g firebase-tools
```

### 2. Se connecter à Firebase

```bash
firebase login
```

### 3. Initialiser le projet

Dans le dossier DPE-App:

```bash
firebase init hosting
```

Répondez:
- **Projet:** Sélectionnez "DPE-Pro"
- **Public directory:** Tapez `.` (point)
- **Single-page app:** `No`
- **GitHub deploys:** `No`

### 4. Créer firebase.json

Créez un fichier `firebase.json` à la racine:

```json
{
  "hosting": {
    "public": ".",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**",
      "FIREBASE_SETUP.md",
      "README.md"
    ],
    "rewrites": [
      {
        "source": "/",
        "destination": "/login.html"
      }
    ]
  }
}
```

### 5. Déployer

```bash
firebase deploy --only hosting
```

Votre application sera disponible à:
`https://[votre-project-id].web.app`

## 🔐 Gestion des Utilisateurs

### Créer un nouveau commercial

1. **Via Firebase Console:**
   - Authentication > Users > Add user
   - Entrez email et mot de passe
   - Copiez l'UID généré

2. **Créer le profil Firestore:**
   - Firestore Database > Collection "users"
   - Nouveau document avec l'UID copié
   - Champs:
     ```
     email: "[email du commercial]"
     name: "[Nom du commercial]"
     role: "commercial"
     createdAt: [Timestamp]
     ```

### Modifier le rôle d'un utilisateur

1. Firestore Database > Collection "users"
2. Trouvez le document de l'utilisateur
3. Modifiez le champ `role` en `"admin"` ou `"commercial"`

## 📊 Structure de la Base de Données

### Collections Firestore:

**users**
```
{
  email: string,
  name: string,
  role: "admin" | "commercial",
  createdAt: timestamp,
  lastActive: timestamp
}
```

**activities**
```
{
  userId: string,
  userName: string,
  action: "visited" | "interested" | "not-interested" | "note",
  address: string,
  city: string,
  postalCode: string,
  latitude: number (optionnel),
  longitude: number (optionnel),
  note: string (optionnel),
  timestamp: timestamp
}
```

**userNotes**
```
{
  userId: string,
  notes: object,
  lastSync: timestamp
}
```

## 🧪 Test Local

Pour tester en local avant déploiement:

```bash
firebase serve
```

Puis ouvrez: `http://localhost:5000`

## 📈 Monitoring

### Voir les logs en temps réel:
```bash
firebase functions:log
```

### Voir les statistiques d'usage:
Console Firebase > Analytics

## 🆘 Dépannage

### Erreur "Permission denied"
- Vérifiez les règles Firestore
- Vérifiez que le document user existe dans Firestore
- Vérifiez que le champ `role` est correctement défini

### Erreur "Firebase not configured"
- Vérifiez que `firebase-config.js` contient les bonnes clés
- Vérifiez que les scripts Firebase sont bien chargés

### L'utilisateur ne peut pas se connecter
- Vérifiez que l'utilisateur existe dans Authentication
- Vérifiez que le document user existe dans Firestore
- Vérifiez que l'email/mot de passe sont corrects

## 🎯 Prochaines Étapes

1. ✅ Configurer Firebase
2. ✅ Créer les utilisateurs
3. ✅ Déployer l'application
4. 📱 Tester avec plusieurs commerciaux
5. 📊 Vérifier le dashboard admin
6. 🔧 Personnaliser selon vos besoins

---

**Support:** Pour toute question, consultez la [documentation Firebase](https://firebase.google.com/docs)
