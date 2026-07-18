import { getApps, initializeApp } from "firebase/app";
import { createUserWithEmailAndPassword, getAuth, GoogleAuthProvider, signInAnonymously, signInWithEmailAndPassword, signInWithPopup, signOut, updateProfile } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseDefaults = {
  apiKey: "AIzaSyAyCdokXfpl5bgtlw-q12F-a3x4dFpEELY",
  authDomain: "symposium-alya.firebaseapp.com",
  projectId: "symposium-alya",
  storageBucket: "symposium-alya.firebasestorage.app",
  messagingSenderId: "523094020688",
  appId: "1:523094020688:web:b1e34f48fc849adb153755",
};

function configuredValue(value: string | undefined, fallback: string) {
  if (!value) return fallback;
  const normalised = value.trim().toLowerCase();
  const isPlaceholder = normalised.startsWith("nilai_") || normalised === "project-id" || normalised.startsWith("project-id.");
  return isPlaceholder ? fallback : value.trim();
}

const config = {
  apiKey: configuredValue(process.env.NEXT_PUBLIC_FIREBASE_API_KEY, firebaseDefaults.apiKey),
  authDomain: configuredValue(process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN, firebaseDefaults.authDomain),
  projectId: configuredValue(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID, firebaseDefaults.projectId),
  storageBucket: configuredValue(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET, firebaseDefaults.storageBucket),
  messagingSenderId: configuredValue(process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID, firebaseDefaults.messagingSenderId),
  appId: configuredValue(process.env.NEXT_PUBLIC_FIREBASE_APP_ID, firebaseDefaults.appId),
};

export const firebaseConfigured = Boolean(config.apiKey && config.projectId);
export const firebaseApp = firebaseConfigured ? (getApps()[0] ?? initializeApp(config)) : null;
export const auth = firebaseApp ? getAuth(firebaseApp) : null;
export const db = firebaseApp ? getFirestore(firebaseApp) : null;
export const storage = firebaseApp ? getStorage(firebaseApp) : null;
export async function googleSignIn() {
  if (!auth) throw new Error("Firebase environment variables are not configured.");
  return signInWithPopup(auth, new GoogleAuthProvider());
}

export async function anonymousSignIn() {
  if (!auth) throw new Error("Registration service is not configured.");
  if (auth.currentUser) return auth.currentUser;
  return (await signInAnonymously(auth)).user;
}

export async function firebaseSignOut() {
  if (auth) await signOut(auth);
}

export async function emailSignIn(email:string,password:string) {
  if (!auth) throw new Error("Firebase environment variables are not configured.");
  return signInWithEmailAndPassword(auth,email,password);
}

export async function emailSignUp(fullName:string,email:string,password:string) {
  if (!auth) throw new Error("Firebase environment variables are not configured.");
  const credential=await createUserWithEmailAndPassword(auth,email,password);
  await updateProfile(credential.user,{displayName:fullName.trim()});
  return credential;
}
