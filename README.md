# 🏠 DPE Pro - Application de Prospection Intelligente

Application web progressive (PWA) pour la prospection DPE avec géolocalisation, zones smart et suivi d'activité en temps réel.

## ✨ Fonctionnalités

### Pour les Commerciaux
- 🔍 Recherche de DPE par code postal ou géolocalisation
- 📍 Zones Smart avec carte interactive
- 📝 Prise de notes et statuts (visité, intéressé, etc.)
- 🗺️ Création de zones de prospection optimisées
- 🏙️ Découpage intelligent de villes en zones de 2h de boitage
- 📱 Interface mobile-first responsive
- ☁️ Synchronisation cloud automatique

### Pour les Administrateurs
- 👥 Dashboard de suivi de l'équipe
- 📊 Statistiques en temps réel
- 🗺️ Carte géographique des activités
- 📥 Export des données
- ⚡ Activité en temps réel de tous les commerciaux

## 🚀 Démarrage Rapide

### Mode Local (sans authentification)
1. Ouvrez `index.html` dans votre navigateur
2. L'application fonctionne en mode local

### Mode Cloud (avec authentification)
1. Suivez le guide `FIREBASE_SETUP.md` pour configurer Firebase
2. Configurez `firebase-config.js` avec vos clés
3. Déployez sur Firebase Hosting

## 🔐 Comptes de Démonstration

**Administrateur:**
- Email: `admin@dpe-pro.fr`
- Mot de passe: `admin123`

**Commercial:**
- Email: `commercial@dpe-pro.fr`
- Mot de passe: `commercial123`

## 📁 Structure du Projet

```
DPE-App/
├── index.html              # Application principale (commerciaux)
├── login.html              # Page de connexion
├── admin.html              # Dashboard administrateur
├── firebase-config.js      # Configuration Firebase
├── firebase.json           # Config déploiement
├── FIREBASE_SETUP.md       # Guide configuration Firebase
├── manifest.webmanifest    # PWA manifest
└── icon-512.png           # Icône de l'app
```

## 🛠️ Technologies

- **Frontend:** HTML5, CSS3, JavaScript (Vanilla)
- **Cartographie:** Leaflet.js, Leaflet Draw
- **Backend:** Firebase (Auth + Firestore)
- **APIs:**
  - ADEME DPE (données énergétiques)
  - Geo.gouv.fr (codes postaux, communes)
  - OpenStreetMap / Nominatim (géocodage)
  - Overpass API (données routières)

## 📊 Base de Données

### Collections Firestore

**users**
- Profils utilisateurs (admin/commercial)
- Dernière activité

**activities**
- Journal des actions (visites, notes, etc.)
- Horodatage et géolocalisation

**userNotes**
- Notes personnelles par utilisateur
- Synchronisation automatique

## 🔧 Configuration

Voir le guide détaillé : [FIREBASE_SETUP.md](FIREBASE_SETUP.md)

## 📱 Installation PWA

L'application peut être installée sur mobile/desktop:
1. Ouvrez l'app dans Chrome/Safari
2. Menu > "Ajouter à l'écran d'accueil"
3. L'app s'ouvre comme une application native

## 🚀 Déploiement

### Firebase Hosting

```bash
# Installer Firebase CLI
npm install -g firebase-tools

# Se connecter
firebase login

# Déployer
firebase deploy --only hosting
```

### Autres plateformes

L'application fonctionne sur n'importe quel hébergement statique:
- Vercel
- Netlify
- GitHub Pages
- Cloudflare Pages

## 🤝 Support

Pour toute question ou problème:
1. Consultez `FIREBASE_SETUP.md`
2. Vérifiez la console navigateur (F12)
3. Vérifiez les logs Firebase Console

## 📝 Licence

Propriétaire - Tous droits réservés

## 🎯 Roadmap

- [ ] Export PDF des rapports
- [ ] Notifications push
- [ ] Mode hors ligne complet
- [ ] Intégration calendrier
- [ ] Analytics avancés

---

**Version:** 5.0
**Dernière mise à jour:** 2025
