import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAnalytics, isSupported, Analytics } from "firebase/analytics";
import { getFirestore, Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

let app: FirebaseApp;
let analytics: Analytics | undefined;
let firestore: Firestore;

export function getFirebaseApp() {
  if (!getApps().length) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApp();
  }
  return app;
}

export async function getFirebaseAnalytics() {
  if (typeof window === "undefined") return undefined;
  const app = getFirebaseApp();
  if (!analytics && (await isSupported())) {
    analytics = getAnalytics(app);
  }
  return analytics;
}

export function getFirebaseFirestore() {
  const app = getFirebaseApp();
  if (!firestore) {
    firestore = getFirestore(app);
  }
  return firestore;
}

export const db = getFirebaseFirestore();

