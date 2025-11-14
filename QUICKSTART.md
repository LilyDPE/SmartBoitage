# 🚀 Guide Rapide de Configuration

## ✅ Étape Actuelle : Créer les profils utilisateurs dans Firestore

### 📋 Vous avez déjà :
- ✅ Projet Firebase créé (dpe-pro)
- ✅ Authentication activée
- ✅ Comptes créés :
  - Admin : `admin@dpe-pro.fr` (UID: `nDFggYyZq5S7vZsCGiFhNGCOVbe2`)
  - Commercial : `commercial@dpe-pro.fr` (UID: `VFDK2Y2sFGODRXZNCj6PCE2B2g63`)
- ✅ Firestore activé
- ✅ Configuration mise à jour dans `firebase-config.js`

---

## 🎯 Prochaine étape : Créer les profils dans Firestore

### 1. Allez dans Firestore Database

https://console.firebase.google.com/project/dpe-pro/firestore

### 2. Créer le profil ADMINISTRATEUR

Cliquez sur **"Commencer la collection"** ou **"+ Ajouter une collection"**

**ID de la collection :** `users`

**ID du document :** `nDFggYyZq5S7vZsCGiFhNGCOVbe2`

**Champs à ajouter :**

| Champ | Type | Valeur |
|-------|------|--------|
| `email` | string | `admin@dpe-pro.fr` |
| `name` | string | `Administrateur` |
| `role` | string | `admin` |
| `createdAt` | timestamp | *Cliquez sur l'horloge pour "maintenant"* |
| `lastActive` | timestamp | *Cliquez sur l'horloge pour "maintenant"* |

Cliquez **"Enregistrer"**

### 3. Créer le profil COMMERCIAL

Dans la collection `users`, cliquez **"Ajouter un document"**

**ID du document :** `VFDK2Y2sFGODRXZNCj6PCE2B2g63`

**Champs à ajouter :**

| Champ | Type | Valeur |
|-------|------|--------|
| `email` | string | `commercial@dpe-pro.fr` |
| `name` | string | `Commercial Demo` |
| `role` | string | `commercial` |
| `createdAt` | timestamp | *Cliquez sur l'horloge pour "maintenant"* |
| `lastActive` | timestamp | *Cliquez sur l'horloge pour "maintenant"* |

Cliquez **"Enregistrer"**

### 4. Configurer les règles de sécurité Firestore

Allez dans l'onglet **"Règles"** de Firestore Database

Remplacez tout le contenu par les règles du fichier `firestore.rules` :

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isAdmin() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    function isAuthenticated() {
      return request.auth != null;
    }

    match /users/{userId} {
      allow read: if isAuthenticated() && (request.auth.uid == userId || isAdmin());
      allow update: if isAuthenticated() && (request.auth.uid == userId || isAdmin());
      allow create: if isAdmin();
    }

    match /activities/{activityId} {
      allow read: if isAdmin();
      allow create: if isAuthenticated();
      allow update, delete: if false;
    }

    match /userNotes/{userId} {
      allow read, write: if isAuthenticated() && (request.auth.uid == userId || isAdmin());
    }
  }
}
```

Cliquez **"Publier"**

---

## 🧪 TEST LOCAL

```bash
cd /home/user/DPE-App
python3 -m http.server 8000
```

Ouvrez : http://localhost:8000

**Testez la connexion :**
- Admin : `admin@dpe-pro.fr` / `admin123`
- Commercial : `commercial@dpe-pro.fr` / `commercial123`

---

## 🚀 DÉPLOIEMENT EN LIGNE

Une fois que tout fonctionne en local :

```bash
# Installer Firebase CLI (si pas déjà fait)
npm install -g firebase-tools

# Se connecter à Firebase
firebase login

# Déployer
cd /home/user/DPE-App
firebase deploy --only hosting
```

Votre app sera en ligne à : **https://dpe-pro.web.app**

---

## ✅ Checklist Complète

- [x] Projet Firebase créé
- [x] Authentication activée
- [x] Comptes créés (admin + commercial)
- [x] Firestore activé
- [x] Configuration firebase-config.js mise à jour
- [ ] **→ Profils créés dans Firestore** ← VOUS ÊTES ICI
- [ ] Règles Firestore configurées
- [ ] Test local
- [ ] Déploiement en ligne

---

## 🆘 Besoin d'aide ?

**Problème de connexion :**
- Vérifiez que les documents users existent dans Firestore
- Vérifiez que les UID correspondent exactement
- Vérifiez que le champ `role` est bien renseigné

**Erreur "Permission denied" :**
- Vérifiez les règles Firestore
- Vérifiez que le document user a bien le champ `role`

**L'admin ne voit pas le dashboard :**
- Vérifiez que `role: "admin"` (pas "administrateur")
- Videz le cache du navigateur (Ctrl+Shift+R)
