/* ============================================================
   ANIVERSE — Configuração Firebase (chaves públicas de cliente)
   Estas chaves são de configuração pública do Firebase Web SDK.
   A segurança real é garantida pelas Firestore Security Rules
   (ver arquivo config/firestore.rules).
   ============================================================ */
const firebaseConfig = {
  apiKey: "AIzaSyDtOi7YC4qjFMQZsoxChqK5Yaii2ez8Qmo",
  authDomain: "aniverse-7f72c.firebaseapp.com",
  projectId: "aniverse-7f72c",
  storageBucket: "aniverse-7f72c.firebasestorage.app",
  messagingSenderId: "499518692674",
  appId: "1:499518692674:web:1f5d8a971f4d53aad13cdb",
  measurementId: "G-M2F4QMXJY5"
};

firebase.initializeApp(firebaseConfig);
window.auth = firebase.auth();
window.db = firebase.firestore();

/* Persistência de sessão */
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(() => {});
