// Configuration Firebase
// INSTRUCTIONS:
// 1. Allez sur https://console.firebase.google.com/
// 2. Créez un nouveau projet "DPE-Pro"
// 3. Activez Authentication (Email/Password)
// 4. Activez Firestore Database
// 5. Dans Paramètres du projet > Général, copiez votre configuration
// 6. Remplacez les valeurs ci-dessous par vos propres clés

const firebaseConfig = {
    apiKey: "VOTRE_API_KEY",
    authDomain: "VOTRE_PROJECT_ID.firebaseapp.com",
    projectId: "VOTRE_PROJECT_ID",
    storageBucket: "VOTRE_PROJECT_ID.appspot.com",
    messagingSenderId: "VOTRE_MESSAGING_SENDER_ID",
    appId: "VOTRE_APP_ID"
};

// Initialiser Firebase
let app, auth, db;

function initFirebase() {
    try {
        app = firebase.initializeApp(firebaseConfig);
        auth = firebase.auth();
        db = firebase.firestore();

        console.log('✅ Firebase initialisé');
        return true;
    } catch (error) {
        console.error('❌ Erreur Firebase:', error);
        return false;
    }
}

// Vérifier si l'utilisateur est authentifié
function checkAuth() {
    return new Promise((resolve) => {
        auth.onAuthStateChanged((user) => {
            if (user) {
                resolve(user);
            } else {
                resolve(null);
            }
        });
    });
}

// Récupérer le profil utilisateur depuis Firestore
async function getUserProfile(uid) {
    try {
        const doc = await db.collection('users').doc(uid).get();
        if (doc.exists) {
            return doc.data();
        }
        return null;
    } catch (error) {
        console.error('Erreur getUserProfile:', error);
        return null;
    }
}
