"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import "./public.css";

export default function PublicLayout({children}:{children:React.ReactNode}){
  const [open,setOpen]=useState(false);
  useEffect(()=>{document.body.style.overflow=open?"hidden":"";return()=>{document.body.style.overflow=""}},[open]);
  const links=[["/","Home"],["/#about","About"],["/#programme","Programme"],["/#attendance","Attendance Options"],["/register","Registration"],["/#contact","Contact"]];
  return <div className="public-site"><header className="public-nav"><Link className="public-brand" href="/"><span>PRS</span><div><b>Symposium 2026</b><small>Airway to Oral Rehabilitation</small></div></Link><nav>{links.map(([href,label])=><Link key={label} href={href}>{label}</Link>)}<Link className="admin-signin" href="/admin/login">Admin Sign In</Link><Link className="gold-button small" href="/register">Register Now</Link></nav><button className="public-menu" aria-label="Open menu" aria-expanded={open} onClick={()=>setOpen(!open)}>{open?<X/>:<Menu/>}</button></header><AnimatePresence>{open&&<motion.nav className="public-mobile-menu" initial={{opacity:0,y:-12}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}}>{links.map(([href,label])=><Link key={label} href={href} onClick={()=>setOpen(false)}>{label}</Link>)}<Link href="/admin/login" onClick={()=>setOpen(false)}>Admin Sign In</Link><Link className="gold-button" href="/register" onClick={()=>setOpen(false)}>Register Now</Link></motion.nav>}</AnimatePresence>{children}<footer className="public-footer" id="contact"><div><b>Symposium on Management of Pierre Robin Sequence in Infants 2026</b><p>From Airway to Oral Rehabilitation: A Collaborative Approach</p><p>Contact Us: <a href="mailto:paeddental@hsi.gov.my">paeddental@hsi.gov.my</a></p></div><div className="footer-links"><Link href="/privacy">Privacy Notice</Link><Link href="/terms">Registration Terms</Link><Link href="/admin/login">Admin Sign In</Link></div><small>© 2026 PRS Symposium & Workshop. All rights reserved.</small></footer></div>
}
