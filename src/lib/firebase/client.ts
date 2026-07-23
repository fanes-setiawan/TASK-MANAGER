import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, Auth } from "firebase/auth";
import { getFirestore, Firestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyCjY1BtMXbFMzgJHxcqFqijJwGpC32tkJA",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "task-manager-b52bb.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "task-manager-b52bb",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "task-manager-b52bb.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "326695732751",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:326695732751:web:573dcabc3b98eef9f9857a",
  measurementId: "G-FHXQFPVRNB"
};

const app = typeof window !== "undefined" ? (!getApps().length ? initializeApp(firebaseConfig) : getApp()) : null as any;
const auth = (typeof window !== "undefined" ? getAuth(app) : null) as unknown as Auth;
const db = (typeof window !== "undefined" ? getFirestore(app) : null) as unknown as Firestore;

export { app, auth, db };
