import { getApps, initializeApp } from "firebase/app";
import { createUserWithEmailAndPassword, getAuth, GoogleAuthProvider, signInAnonymously, signInWithEmailAndPassword, signInWithPopup, signOut, updateProfile } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
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
