"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, CircleDollarSign, LogIn, UserPlus } from "lucide-react";
import type { User } from "firebase/auth";
import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db, emailSignIn, emailSignUp, firebaseSignOut, googleSignIn } from "../../lib/firebase";
import { PROGRAM_ID } from "../../lib/registration";
import "../../public.css";

function authMessage(error: unknown) {
  const code = typeof error === "object" && error && "code" in error
    ? String((error as { code: string }).code)
    : "";
  if (code.includes("invalid-credential") || code.includes("wrong-password") || code.includes("user-not-found")) return "Incorrect email or password.";
  if (code.includes("email-already-in-use")) return "An account already exists for this email.";
  if (code.includes("weak-password")) return "Use a password with at least 6 characters.";
  if (code.includes("unauthorized-domain")) return "This website domain is not authorised in Firebase Authentication.";
  if (code.includes("popup-closed")) return "The Google sign-in window was closed before completion.";
  if (code.includes("operation-not-allowed")) return "This sign-in method has not been enabled in Firebase Authentication.";
  if (code.includes("invalid-api-key") || code.includes("configuration-not-found")) return "Firebase configuration is invalid. Please contact the website administrator.";
  if (code.includes("permission-denied")) return "Your login is valid, but the account does not have access to this program.";
  if (code.includes("network-request-failed")) return "The sign-in service could not be reached. Check your internet connection and try again.";
  return "Sign-in could not be completed. Please try again.";
}

async function createAccessRequest(user: User, fullName?: string) {
  if (!db) return;
  const member = await getDoc(doc(db, "programs", PROGRAM_ID, "members", user.uid));
  if (member.exists()) return;
  const requestRef = doc(db, "programs", PROGRAM_ID, "accessRequests", user.uid);
  if ((await getDoc(requestRef)).exists()) return;
  await setDoc(requestRef, {
    uid: user.uid,
    email: user.email || "",
    fullName: (fullName || user.displayName || "").trim(),
    status: "pending",
    requestedRole: "viewer",
    requestedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

async function authorised(user: User) {
  if (!db) return false;
  const member = await getDoc(doc(db, "programs", PROGRAM_ID, "members", user.uid));
  const data = member.data();
  return Boolean(member.exists() && data?.active === true && ["admin", "viewer"].includes(data?.role));
}

export default function AdminLogin() {
  const router = useRouter();
  const params = useSearchParams();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [warning, setWarning] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const requested = params.get("redirect");
  const destination = requested?.startsWith("/admin/") && !requested.startsWith("//") ? requested : "/admin/dashboard";

  const finishLogin = async (user: User) => {
    if (await authorised(user)) {
      router.replace(destination);
      return;
    }
    await createAccessRequest(user);
    await firebaseSignOut();
    setWarning("Not authorised. This Firebase account has not been activated as a program member.");
  };

  const submit = async () => {
    setBusy(true);
    setError("");
    setWarning("");
    setMessage("");
    try {
      if (mode === "signup") {
        if (!fullName.trim()) throw { code: "name-required" };
        const result = await emailSignUp(fullName, email, password);
        await createAccessRequest(result.user, fullName);
        await firebaseSignOut();
        setMessage("Account created. An administrator must approve your access before you can sign in.");
        setMode("login");
        setPassword("");
      } else {
        const result = await emailSignIn(email.trim(), password);
        await finishLogin(result.user);
      }
    } catch (caught) {
      setError((caught as { code?: string }).code === "name-required" ? "Full name is required." : authMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setBusy(true);
    setError("");
    setWarning("");
    try {
      const result = await googleSignIn();
      await finishLogin(result.user);
    } catch (caught) {
      setError(authMessage(caught));
    } finally {
      setBusy(false);
    }
  };

  return <main className="admin-login"><section>
    <div className="login-brand"><span><CircleDollarSign /></span><small>PRS SYMPOSIUM 2026</small></div>
    <h1>{mode === "login" ? "Admin Sign In" : "Request Access"}</h1>
    <p>{mode === "login" ? "Sign in to the protected accounting and registration system." : "Create an account. An existing administrator will approve you as a Viewer or Admin."}</p>
    <div className="auth-tabs">
      <button className={mode === "login" ? "active" : ""} onClick={() => { setMode("login"); setError(""); setWarning(""); }}>Sign In</button>
      <button className={mode === "signup" ? "active" : ""} onClick={() => { setMode("signup"); setError(""); setWarning(""); }}>Sign Up</button>
    </div>
    <div className="email-auth-form">
      {mode === "signup" && <label>Full Name<input value={fullName} onChange={event => setFullName(event.target.value)} autoComplete="name" /></label>}
      <label>Email Address<input type="email" value={email} onChange={event => setEmail(event.target.value)} autoComplete="email" /></label>
      <label>Password<input type="password" value={password} onChange={event => setPassword(event.target.value)} autoComplete={mode === "login" ? "current-password" : "new-password"} /></label>
      <button className="gold-button" onClick={submit} disabled={busy || !email || !password}>{mode === "login" ? <LogIn /> : <UserPlus />}{busy ? "Please wait…" : mode === "login" ? "Sign In with Email" : "Create Account"}</button>
      {warning && <div className="auth-warning" role="alert"><AlertTriangle /><div><b>Not authorised</b><span>{warning}</span></div></div>}
    </div>
    <div className="auth-divider"><span>or</span></div>
    <button className="outline-button google-auth" onClick={google} disabled={busy}>Continue with Google</button>
    {error && <p className="form-error" role="alert">{error}</p>}
    {message && <p className="auth-success" role="status">{message}</p>}
    <Link href="/">← Back to Event Homepage</Link>
  </section></main>;
}
