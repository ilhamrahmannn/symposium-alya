"use client";

import { useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import CountUp from "react-countup";
import {
  ArrowRight, CalendarDays, Check, ChevronRight, Clock3, FileText,
  HeartPulse, LayoutDashboard, MapPin, Menu, Mic2, Plus, Search,
  Sparkles, Stethoscope, TicketCheck, Users, X, Bell, Award,
} from "lucide-react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const agenda = [
  { time: "08:30", title: "Registration & welcome coffee", type: "Arrival", room: "Grand Foyer" },
  { time: "09:15", title: "The PRS infant: from airway to feeding", type: "Keynote", room: "Orchid Hall" },
  { time: "10:30", title: "Multidisciplinary assessment in practice", type: "Panel", room: "Orchid Hall" },
  { time: "13:30", title: "Airway simulation & positioning lab", type: "Workshop", room: "Clinical Lab 2" },
];

const attendance = [
  { day: "Early", value: 84 }, { day: "May", value: 136 }, { day: "Jun", value: 188 },
  { day: "Jul", value: 234 }, { day: "Now", value: 268 },
];

const speakers = [
  { initials: "AR", name: "Dr Amelia Rahman", role: "Paediatric Craniofacial Surgeon", colour: "rose" },
  { initials: "JL", name: "Prof Jonathan Lee", role: "Neonatal Airway Specialist", colour: "blue" },
  { initials: "SN", name: "Dr Sofia Nordin", role: "Paediatric Sleep Physician", colour: "amber" },
];

function StatCard({ icon: Icon, label, value, suffix = "", note, featured = false }: any) {
  return (
    <motion.article whileHover={{ y: -3 }} className={`stat-card ${featured ? "featured" : ""}`}>
      <div className="stat-top"><span className="icon-box"><Icon size={19}/></span><span className="trend">+12.4%</span></div>
      <p>{label}</p><h3><CountUp end={value} duration={1.25} separator="," suffix={suffix}/></h3><small>{note}</small>
    </motion.article>
  );
}

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [registered, setRegistered] = useState(false);
  const reduce = useReducedMotion();
  const enter = { initial: { opacity: 0, y: reduce ? 0 : 14 }, animate: { opacity: 1, y: 0 }, transition: { duration: reduce ? 0 : .35 } };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark"><HeartPulse size={23}/></span><span><b>PRS</b><small>Symposium 2026</small></span></div>
        <nav aria-label="Main navigation">
          <a className="active" href="#overview"><LayoutDashboard/>Overview</a>
          <a href="#programme"><CalendarDays/>Programme</a>
          <a href="#faculty"><Mic2/>Faculty</a>
          <a href="#workshops"><Stethoscope/>Workshops</a>
          <a href="#resources"><FileText/>Resources</a>
        </nav>
        <div className="side-card"><Sparkles size={21}/><b>Clinical Workshop</b><p>Hands-on airway management with limited seats.</p><button onClick={() => setRegistered(true)}>Reserve a seat <ArrowRight size={15}/></button></div>
        <div className="profile"><span>IL</span><div><b>Dr Ilham</b><small>Delegate</small></div><ChevronRight size={17}/></div>
      </aside>

      <main>
        <header className="topbar">
          <button className="mobile-menu" onClick={() => setMenuOpen(true)} aria-label="Open menu"><Menu/></button>
          <div className="search"><Search size={18}/><input aria-label="Search programme" placeholder="Search sessions, speakers..."/></div>
          <div className="top-actions"><span className="event-date"><CalendarDays size={17}/> 24–25 October 2026</span><button className="icon-button" aria-label="Notifications"><Bell size={19}/><i/></button><button className="avatar">IL</button></div>
        </header>

        <motion.div className="content" {...enter}>
          <section className="welcome" id="overview">
            <div><span className="eyebrow"><i/> Registration is open</span><h1>Good morning, Dr Ilham.</h1><p>Here’s what’s happening at the Pierre Robin Sequence Symposium & Workshop.</p></div>
            <button className="primary-button" onClick={() => setRegistered(true)}><TicketCheck size={18}/> Register now</button>
          </section>

          <section className="hero-card">
            <div className="hero-copy"><span className="edition">2026 CLINICAL SYMPOSIUM</span><h2>Pierre Robin Sequence<br/><em>Symposium & Workshop</em></h2><p>Management of Pierre Robin Sequence in Infants</p>
              <div className="hero-meta"><span><CalendarDays/>24–25 October</span><span><MapPin/>Kuala Lumpur</span><span><Users/>300 delegates</span></div>
              <button onClick={() => document.querySelector("#programme")?.scrollIntoView({behavior:"smooth"})}>Explore programme <ArrowRight size={17}/></button>
            </div>
            <div className="hero-art" aria-hidden="true"><div className="orbit one"/><div className="orbit two"/><HeartPulse/><span className="pulse-dot"/></div>
          </section>

          <section className="stats-grid">
            <StatCard icon={Users} label="Registered delegates" value={268} note="32 places remaining" featured/>
            <StatCard icon={Mic2} label="Expert faculty" value={18} note="Across 6 specialties"/>
            <StatCard icon={CalendarDays} label="Clinical sessions" value={24} note="Over two focused days"/>
            <StatCard icon={Award} label="CPD points" value={12} suffix=" hrs" note="Accreditation pending"/>
          </section>

          <section className="dashboard-grid" id="programme">
            <article className="panel schedule-panel"><div className="panel-head"><div><span className="section-kicker">DAY ONE · SATURDAY</span><h3>Today’s programme</h3></div><button>View full agenda <ChevronRight size={16}/></button></div>
              <div className="agenda-list">{agenda.map((item, i) => <motion.div initial={{opacity:0,y:reduce?0:8}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{delay:i*.07}} className="agenda-item" key={item.time}><time>{item.time}</time><span className={`agenda-icon i${i}`}><Clock3/></span><div><b>{item.title}</b><small>{item.room}</small></div><span className="type-badge">{item.type}</span><ChevronRight className="row-arrow" size={17}/></motion.div>)}</div>
            </article>
            <article className="panel chart-panel"><div className="panel-head"><div><span className="section-kicker">ATTENDANCE</span><h3>Registration pace</h3></div><span className="live-badge"><i/> Live</span></div><div className="chart-total"><b>268</b><span>of 300 places</span></div>
              <div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><AreaChart data={attendance}><defs><linearGradient id="pinkFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#DB7093" stopOpacity={.32}/><stop offset="100%" stopColor="#DB7093" stopOpacity={0}/></linearGradient></defs><CartesianGrid stroke="#f4e6eb" vertical={false}/><XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill:"#A48F97",fontSize:11}}/><YAxis hide/><Tooltip contentStyle={{borderRadius:14,border:"1px solid #F1CBD8",boxShadow:"0 12px 35px rgba(65,31,44,.12)"}}/><Area type="monotone" dataKey="value" stroke="#BE5678" strokeWidth={3} fill="url(#pinkFill)" isAnimationActive={!reduce}/></AreaChart></ResponsiveContainer></div>
              <div className="capacity"><span><i style={{width:"89%"}}/></span><small>89% capacity reached</small></div>
            </article>
          </section>

          <section className="faculty-section" id="faculty"><div className="section-title"><div><span className="section-kicker">MULTIDISCIPLINARY EXPERTISE</span><h3>Meet the faculty</h3><p>Learn from clinicians shaping contemporary PRS care.</p></div><button>View all faculty <ArrowRight size={16}/></button></div>
            <div className="speaker-grid">{speakers.map((s, i) => <motion.article whileHover={{y:-3}} className="speaker" key={s.name}><div className={`speaker-photo ${s.colour}`}>{s.initials}<span><Check size={12}/></span></div><div><b>{s.name}</b><p>{s.role}</p><small>View profile <ArrowRight size={13}/></small></div></motion.article>)}</div>
          </section>
        </motion.div>
      </main>

      <nav className="bottom-nav"><a className="active" href="#overview"><LayoutDashboard/><span>Home</span></a><a href="#programme"><CalendarDays/><span>Programme</span></a><button onClick={() => setRegistered(true)} aria-label="Register"><Plus/></button><a href="#faculty"><Mic2/><span>Faculty</span></a><a href="#resources"><FileText/><span>Resources</span></a></nav>

      <AnimatePresence>{menuOpen && <><motion.div className="backdrop" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={()=>setMenuOpen(false)}/><motion.aside className="mobile-drawer" initial={{x:"-100%"}} animate={{x:0}} exit={{x:"-100%"}} transition={{type:"spring",stiffness:320,damping:34}}><div className="brand"><span className="brand-mark"><HeartPulse/></span><span><b>PRS</b><small>Symposium 2026</small></span></div><button className="close" onClick={()=>setMenuOpen(false)}><X/></button>{["Overview","Programme","Faculty","Workshops","Resources"].map(x=><a key={x} href={`#${x.toLowerCase()}`} onClick={()=>setMenuOpen(false)}>{x}<ChevronRight/></a>)}</motion.aside></>}</AnimatePresence>
      <AnimatePresence>{registered && <><motion.div className="backdrop" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={()=>setRegistered(false)}/><motion.div className="success-modal" role="dialog" aria-modal="true" initial={{opacity:0,scale:.94,y:12}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:.96}}><motion.div className="success-check" initial={{scale:0}} animate={{scale:1}} transition={{type:"spring",stiffness:350,damping:18}}><Check/></motion.div><span className="section-kicker">REGISTRATION INTEREST</span><h3>You’re on the list.</h3><p>We’ve recorded your interest. The registration team will share the delegate pack and payment details shortly.</p><button className="primary-button" onClick={()=>setRegistered(false)}>Done</button></motion.div></>}</AnimatePresence>
    </div>
  );
}
