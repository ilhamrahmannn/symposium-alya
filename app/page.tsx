"use client";
import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { ArrowRight, Baby, Bone, Brain, HeartPulse, Sparkles, Stethoscope, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import PublicLayout from "./PublicLayout";
import { db } from "./lib/firebase";
import { PROGRAM_ID } from "./lib/registration";

const disciplines=[
  {icon:Baby,label:"Neonatology",speakers:[
    {name:"Dr Chia Le Ser",role:"Paediatric Neonatology Consultant",organisation:"Hospital Sultan Ismail, Johor Bahru",image:"/speakers/speaker-3.webp",topics:[
      "Embryology and how Pierre Robin Sequence develops",
      "Clinical presentation of Pierre Robin Sequence and the severity of the condition",
      "Differential diagnosis",
      "Issues faced by the paediatric team when managing patients and the interventions involved",
      "Current treatment modalities and their effects on the quality of life of babies and parents",
    ]},
  ]},
  {icon:HeartPulse,label:"Paediatric Respiratory",speakers:[
    {name:"Dr Liew Zheyi",role:"Paediatric Respiratory Specialist",organisation:"Hospital Sultanah Aminah, Johor Bahru",image:"/speakers/speaker-5.webp",topics:[
      "How to detect the level of airway obstruction in a baby with Pierre Robin Sequence",
      "Common findings associated with the airway obstruction",
      "Managing cases according to the anatomical abnormality, based on clinical experience",
      "When a tracheotomy should be considered",
      "Benefits, risks and potential complications of a tracheotomy",
      "Perspectives on non-surgical intervention using an orthodontic airway plate and surgical intervention using mandibular distraction",
    ]},
  ]},
  {icon:Bone,label:"Oral and Maxillofacial Surgery",speakers:[
    {name:"Prof Dr Firdaus Bin Hariri",role:"Professor & Consultant Oral and Maxillofacial Surgeon",organisation:"University Malaya Medical Centre (UMMC)",image:"/speakers/speaker-2.webp",tag:"Keynote Speaker"},
    {name:"Dr Sundrarajan Naidu Ramasamy",role:"Oral Maxillofacial Surgeon",organisation:"Hospital Sultan Ismail, Johor Bahru",image:"/speakers/speaker-6.webp"},
  ]},
  {icon:Stethoscope,label:"Otorhinolaryngology",speakers:[
    {name:"Dr Selvamalar Vengathajalam",role:"Paediatric Otorhinolaryngology Specialist",organisation:"Hospital Pulau Pinang",image:"/speakers/speaker-4.webp",topics:[
      "How to detect the level of airway obstruction in babies with Pierre Robin Sequence",
      "Common findings associated with the obstruction",
      "Management approaches based on the anatomical abnormality",
      "When a tracheotomy should be considered",
      "Benefits, risks and potential complications of tracheotomy",
      "Perspectives on non-surgical intervention with an orthodontic airway plate and surgical intervention with mandibular distraction",
    ]},
  ]},
  {icon:Sparkles,label:"Paediatric Dentistry",speakers:[
    {name:"Dr Halimah Binti Mohamed Noor",role:"Paediatric Dental Specialist",organisation:"Hospital Sultan Ismail, Johor Bahru",image:"/speakers/speaker-7.webp"},
  ]},
] as const;
const dayOneProgramme=[
  ["8:00am - 8:30am","Registration & Breakfast"],
  ["8:30am - 9:30am","Lecture 1: Current Perspectives in the Multidisciplinary Management of Pierre Robin Sequence","Prof Dr Firdaus Hariri"],
  ["9:30am - 9:45am","Opening Ceremony","Officiated by Dr Juana Bahadun, Paediatric Dental Consultant, Johor"],
  ["9:45am - 10:30am","Lecture 2: Early Recognition and Neonatal Management of Pierre Robin Sequence","Dr Chia Le Ser"],
  ["10:30am - 10:45am","Morning Break"],
  ["10:45am - 11:30am","Lecture 3: Airway Assessment and Respiratory Management in Infants with Pierre Robin Sequence","Dr Liew Zheyi"],
  ["11:30am - 12:15pm","Lecture 4: Airway Evaluation and Intervention in Pierre Robin Sequence","Dr Selvamalar Vengathajalam"],
  ["12:15pm - 1:00pm","Lecture 5: Non-Surgical Management of Infants with Pierre Robin Sequence","Dr Halimah Mohamed Noor"],
  ["1:00pm - 2:00pm","Lunch, Prayer & Break"],
  ["2:00pm - 2:45pm","Lecture 6: Surgical Considerations in Pierre Robin Sequence","Dr Sundararajan Naidu Ramasamy"],
  ["2:45pm - 3:30pm","Case Discussion"],
  ["3:30pm - 4:00pm","Session to be announced"],
  ["4:00pm - 4:15pm","Q&A"],
  ["4:15pm","End of Programme"],
] as const;
const dayTwoProgramme=[
  ["8:00am - 8:30am","Registration & Breakfast"],
  ["8:30am - 9:30am","Lecture 1: From Impression to Insertion - Fabrication of Orthodontic Airway Plates for Infants with Pierre Robin Sequence","Dr Halimah Mohamed Noor"],
  ["9:30am - 10:30am","Lecture 2: Mastering Orthodontic Airway Plate Fabrication - Tips, Tricks and Common Pitfalls","Charmien Sim Siaw Yuin"],
  ["10:30am - 11:00am","Morning Break"],
  ["11:00am - 1:00pm","Workshop 1: Orthodontic Airway Plate Fabrication","HSIJB Dental Laboratory"],
  ["1:00pm - 2:00pm","Lunch, Prayer & Break"],
  ["2:00pm - 4:00pm","Workshop 2: Orthodontic Airway Plate Fabrication","HSIJB Dental Laboratory"],
  ["4:00pm - 4:30pm","Panel Discussion & Q&A Session"],
  ["4:30pm","End of Programme"],
] as const;
type PublicEventSettings={introduction?:string;eventDate?:string;venue?:string;registrationClosingDate?:string};
type Discipline=(typeof disciplines)[number];
type SpeakerBrief={name:string;topics:readonly string[]};
export default function EventHomepage(){
  const [settings,setSettings]=useState<PublicEventSettings>({});
  const [selectedDiscipline,setSelectedDiscipline]=useState<Discipline|null>(null);
  const [speakerBrief,setSpeakerBrief]=useState<SpeakerBrief|null>(null);
  const [activeProgrammeDay,setActiveProgrammeDay]=useState<1|2>(1);
  const lastTrigger=useRef<HTMLButtonElement|null>(null);
  useEffect(()=>{if(!db)return;return onSnapshot(doc(db,"programs",PROGRAM_ID,"public","event"),snap=>setSettings(snap.data()||{}))},[]);
  useEffect(()=>{if(!selectedDiscipline)return;const previous=document.body.style.overflow;document.body.style.overflow="hidden";const escape=(event:KeyboardEvent)=>{if(event.key!=="Escape")return;if(speakerBrief){setSpeakerBrief(null);return}setSelectedDiscipline(null);requestAnimationFrame(()=>lastTrigger.current?.focus())};window.addEventListener("keydown",escape);return()=>{document.body.style.overflow=previous;window.removeEventListener("keydown",escape)}},[selectedDiscipline,speakerBrief]);
  const closeSpeakers=()=>{setSpeakerBrief(null);setSelectedDiscipline(null);requestAnimationFrame(()=>lastTrigger.current?.focus())};
  return <PublicLayout><main>
  <section className="public-hero"><div className="hero-pattern"/><motion.div className="hero-copy" initial={{opacity:0,y:24}} animate={{opacity:1,y:0}} transition={{duration:.55}}><span className="gold-kicker">SYMPOSIUM &amp; WORKSHOP</span><h1>Symposium on Management of <em>Pierre Robin Sequence</em> in Infants 2026</h1><p>From Airway to Oral Rehabilitation: A Collaborative Approach</p><div className="hero-event-meta"><span>{settings.eventDate?new Date(`${settings.eventDate}T00:00:00`).toLocaleDateString("en-MY",{dateStyle:"long"}):"8-9 September 2026"}</span><span>{settings.venue||"Johor Bahru"}</span>{settings.registrationClosingDate&&<span>Register by {new Date(`${settings.registrationClosingDate}T00:00:00`).toLocaleDateString("en-MY",{dateStyle:"long"})}</span>}</div><div className="hero-actions"><Link className="gold-button" href="/register">Register Now <ArrowRight/></Link><a className="outline-button" href="#programme">View Programme</a></div></motion.div><motion.div className="medical-orbit" initial={{opacity:0,scale:.9}} animate={{opacity:1,scale:1}} transition={{delay:.2,duration:.7}} aria-hidden="true"><span/><span/><span/><div><Brain/><b>Multidisciplinary<br/>Infant Care</b></div></motion.div></section>
  <section className="public-section about" id="about"><div><span className="gold-kicker">ABOUT THE EVENT</span><h2>One patient journey.<br/><em>Many clinical perspectives.</em></h2></div><p>{settings.introduction||"This symposium brings together healthcare professionals involved in the multidisciplinary care of infants with Pierre Robin Sequence. The programme explores the patient journey from early airway management to feeding support and oral rehabilitation through collaborative clinical practice."}</p></section>
  <section className="event-facts" aria-label="Confirmed event details"><article><span>EVENT DATE</span><b>8-9 September 2026</b><small>Two-day symposium and hands-on workshop</small></article><article><span>DAY 1 · SYMPOSIUM</span><b>Auditorium, Hospital Pasir Gudang</b><small>Johor Bahru · RM150</small></article><article><span>DAY 2 · HANDS-ON WORKSHOP</span><b>Seminar Room & Dental Lab, Hospital Sultan Ismail</b><small>Johor Bahru · Full programme RM300</small></article><article><span>CPD POINT</span><b>To be announced</b><small>Final allocation is pending confirmation</small></article></section>
  <section className="public-section disciplines"><div className="section-heading"><span className="gold-kicker">COLLABORATIVE APPROACH</span><h2>Disciplines connected by better outcomes</h2><p>Select a discipline to meet its symposium speakers.</p></div><div className="discipline-grid">{disciplines.map((discipline,i)=>{const Icon=discipline.icon;return <motion.button type="button" className="discipline-card" key={discipline.label} initial={{opacity:0,y:16}} whileInView={{opacity:1,y:0}} viewport={{once:true}} transition={{delay:i*.06}} whileHover={{y:-4}} whileTap={{scale:.99}} aria-haspopup="dialog" onClick={event=>{lastTrigger.current=event.currentTarget;setSelectedDiscipline(discipline)}}><Icon/><b>{discipline.label}</b><span>{discipline.speakers.length} {discipline.speakers.length===1?"speaker":"speakers"} · View profile</span></motion.button>})}</div></section>
  <AnimatePresence>{selectedDiscipline&&<div className="speaker-modal-root"><motion.button className="speaker-modal-backdrop" aria-label="Close speaker profiles" onClick={closeSpeakers} initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}/><motion.section className="speaker-modal" role="dialog" aria-modal="true" aria-labelledby="speaker-modal-title" initial={{opacity:0,y:22,scale:.97}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:14,scale:.98}} transition={{duration:.28,ease:[.22,1,.36,1]}}><header><div><span>SYMPOSIUM SPEAKERS</span><h2 id="speaker-modal-title">{selectedDiscipline.label}</h2></div><button type="button" aria-label="Close speaker profiles" onClick={closeSpeakers} autoFocus><X/></button></header><div className="speaker-modal-grid">{selectedDiscipline.speakers.map(speaker=><article className="speaker-profile" key={speaker.name}><Image src={speaker.image} alt={`${speaker.name}, ${speaker.role}`} width={960} height={540} sizes="(max-width: 700px) 92vw, 640px" unoptimized/><div>{"tag" in speaker&&speaker.tag&&<span>{speaker.tag}</span>}<strong>{speaker.name}</strong><p>{speaker.role}</p><small>{speaker.organisation}</small>{"topics" in speaker&&speaker.topics&&<button type="button" className="speaker-description-link" onClick={()=>setSpeakerBrief({name:speaker.name,topics:speaker.topics})}>View description <ArrowRight/></button>}</div></article>)}</div></motion.section><AnimatePresence>{speakerBrief&&<div className="speaker-brief-root"><motion.button type="button" className="speaker-modal-backdrop" aria-label="Close lecture overview" onClick={()=>setSpeakerBrief(null)} initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}/><motion.section className="speaker-brief" role="dialog" aria-modal="true" aria-labelledby="speaker-brief-title" initial={{opacity:0,y:18,scale:.96}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:12,scale:.98}} transition={{duration:.24,ease:[.22,1,.36,1]}}><header><div><span>LECTURE OVERVIEW</span><h2 id="speaker-brief-title">{speakerBrief.name}</h2></div><button type="button" aria-label="Close lecture overview" onClick={()=>setSpeakerBrief(null)} autoFocus><X/></button></header><ul>{speakerBrief.topics.map(topic=><li key={topic}>{topic}</li>)}</ul></motion.section></div>}</AnimatePresence></div>}</AnimatePresence>
  <section className="public-section programme" id="programme"><div className="section-heading"><span className="gold-kicker">TENTATIVE PROGRAMME</span><h2>Two focused days of shared practice</h2><p>The programme below is based on the official event brochure and remains subject to organiser updates.</p></div><div className="programme-day-selector" role="tablist" aria-label="Select programme day"><button type="button" role="tab" aria-selected={activeProgrammeDay===1} aria-controls="programme-day-panel" className={activeProgrammeDay===1?"active":""} onClick={()=>setActiveProgrammeDay(1)}><span>DAY 01 · 8 SEPTEMBER 2026</span><strong>Symposium</strong><small>Across diagnosis, multidisciplinary input and concern and treatment approaches</small></button><button type="button" role="tab" aria-selected={activeProgrammeDay===2} aria-controls="programme-day-panel" className={activeProgrammeDay===2?"active":""} onClick={()=>setActiveProgrammeDay(2)}><span>DAY 02 · 9 SEPTEMBER 2026</span><strong>Hands-on Workshop</strong><small>A focused practical workshop focusing on non-surgical approach by Paediatric Dental Speciality</small></button></div><AnimatePresence mode="wait" initial={false}><motion.article key={activeProgrammeDay} id="programme-day-panel" className={`programme-day${activeProgrammeDay===2?" featured":""}`} role="tabpanel" initial={{opacity:0,y:12}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-8}} transition={{duration:.25,ease:[.22,1,.36,1]}}><header><div><span>{activeProgrammeDay===1?"DAY 01 · 8 SEPTEMBER 2026":"DAY 02 · 9 SEPTEMBER 2026"}</span><h3>{activeProgrammeDay===1?"Symposium":"Hands-on Workshop"}</h3></div><p>{activeProgrammeDay===1?"Auditorium, Hospital Pasir Gudang, Johor Bahru":"Seminar Room and Dental Lab, Hospital Sultan Ismail, Johor Bahru"}</p></header><div className="programme-list">{(activeProgrammeDay===1?dayOneProgramme:dayTwoProgramme).map(([time,title,detail])=><div key={`${time}-${title}`}><time>{time}</time><p><b>{title}</b>{detail&&<small>{detail}</small>}</p></div>)}</div></motion.article></AnimatePresence></section>
  <section className="public-section attendance" id="attendance"><div className="section-heading"><span className="gold-kicker">ATTENDANCE OPTIONS</span><h2>Choose your learning experience</h2></div><div className="price-grid"><article><span>DAY 1 ONLY</span><h3>Symposium</h3><strong>RM150</strong><small>Limited to 150 participants</small><Link className="outline-button" href="/register?attendance=day1">Select and Register</Link></article><article className="recommended"><i>FULL PROGRAMME</i><span>DAY 1 &amp; DAY 2</span><h3>Symposium and Workshop on Fabrication of OAP</h3><strong>RM300</strong><small>Limited to 15 participants</small><Link className="gold-button" href="/register?attendance=full">Select and Register</Link></article></div></section>
  <section className="public-section audience"><div className="section-heading"><span className="gold-kicker">WHO SHOULD ATTEND</span><h2>Designed for the multidisciplinary care team</h2></div><ul>{["Neonatologists","Paediatric Respiratory","Oral and Maxillofacial Surgeons","Otorhinolaryngologists","Paediatric Dentists","Other related healthcare professionals"].map(x=><li key={x}>{x}</li>)}</ul></section>
  <section className="public-cta"><span className="gold-kicker">REGISTRATION IS OPEN</span><h2>Join the conversation shaping collaborative PRS care.</h2><p>Submit your registration and proof of payment for organiser verification.</p><Link className="gold-button" href="/register">Register Now <ArrowRight/></Link></section>
  </main></PublicLayout>}
