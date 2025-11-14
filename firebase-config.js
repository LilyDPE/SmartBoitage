// Configuration Firebase - DPE Pro
const firebaseConfig = {
    apiKey: "AIzaSyBddup87fRdUTs143H0T0FJAUnOHMRGYqs",
    authDomain: "dpe-pro.firebaseapp.com",
    projectId: "dpe-pro",
    storageBucket: "dpe-pro.firebasestorage.app",
    messagingSenderId: "481777621642",
    appId: "1:481777621642:web:26b2ee92e799cb6e832b73"
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
