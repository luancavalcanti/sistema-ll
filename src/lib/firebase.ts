import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// 1. Tipagem da configuração para o TypeScript te ajudar
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

// 2. Singleton: Garante que o app só inicialize uma vez
// No Next.js, o "Hot Reload" pode tentar rodar esse arquivo várias vezes
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// 3. Exportando as instâncias já tipadas
export const db = getFirestore(app);
export const auth = getAuth(app);
export default app;