"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../lib/firebase";
import { PROGRAM_ID } from "../lib/registration";
export default function AdminGate({children}:{children:React.ReactNode}){const router=useRouter(),path=usePathname(),[allowed,setAllowed]=useState<boolean|null>(auth&&db?null:false);useEffect(()=>{if(!auth||!db)return;return onAuthStateChanged(auth,async user=>{if(!user||user.isAnonymous){router.replace(`/admin/login?redirect=${encodeURIComponent(path)}`);return}try{const member=await getDoc(doc(db,"programs",PROGRAM_ID,"members",user.uid));const data=member.data();const adminOnly=path.startsWith("/admin/users")||path.startsWith("/admin/settings")||path.startsWith("/admin/registrations");setAllowed(Boolean(member.exists()&&data?.active&&["admin","viewer"].includes(data.role)&&(!adminOnly||data.role==="admin")))}catch{setAllowed(false)}})},[path,router]);if(allowed===null)return <div className="admin-auth-state">Checking secure access…</div>;if(!allowed)return <div className="admin-auth-state"><h1>You do not have permission</h1><p>Your account is awaiting approval or does not have permission for this page.</p><Link href="/">Return to event homepage</Link></div>;return children}
