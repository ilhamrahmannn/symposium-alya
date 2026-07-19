"use client";
import { useEffect, useState } from "react";
import { collection, doc, onSnapshot, runTransaction, serverTimestamp } from "firebase/firestore";
import { Check, ShieldCheck, UserCheck, UserMinus, UserX } from "lucide-react";
import { auth, db } from "../lib/firebase";
import { PROGRAM_ID } from "../lib/registration";

type Request={uid:string;email:string;fullName:string;status:string;requestedAt?:{toDate:()=>Date}};
type Member={uid:string;email:string;fullName?:string;role:"admin"|"viewer";active:boolean};

export default function AdminUsers({notify}:{notify:(s:string)=>void}) {
  const [requests,setRequests]=useState<Request[]>([]),[members,setMembers]=useState<Member[]>([]),[error,setError]=useState("");
  useEffect(()=>{
    if(!db)return;
    const requestSubscription=onSnapshot(collection(db,"programs",PROGRAM_ID,"accessRequests"),snapshot=>setRequests(snapshot.docs.map(item=>item.data() as Request).filter(item=>item.status==="pending")),()=>setError("Access requests could not be loaded."));
    const memberSubscription=onSnapshot(collection(db,"programs",PROGRAM_ID,"members"),snapshot=>setMembers(snapshot.docs.map(item=>({...item.data(),uid:item.id}) as Member)),()=>setError("Program members could not be loaded."));
    return()=>{requestSubscription();memberSubscription()};
  },[]);

  const approve=async(request:Request,role:"admin"|"viewer")=>{
    if(!db||!auth?.currentUser||!confirm(`Approve ${request.email} as ${role}?`))return;
    try {
      await runTransaction(db,async transaction=>{
        transaction.set(doc(db,"programs",PROGRAM_ID,"members",request.uid),{uid:request.uid,email:request.email,fullName:request.fullName||"",role,active:true,createdAt:serverTimestamp(),createdBy:auth.currentUser!.uid,updatedAt:serverTimestamp(),updatedBy:auth.currentUser!.uid});
        transaction.update(doc(db,"programs",PROGRAM_ID,"accessRequests",request.uid),{status:"approved",approvedRole:role,approvedAt:serverTimestamp(),approvedBy:auth.currentUser!.uid,updatedAt:serverTimestamp()});
      });
      notify(`Access approved as ${role}`);
    } catch { setError("Approval failed. No access changes were saved."); }
  };
  const reject=async(request:Request)=>{if(!db||!auth?.currentUser||!confirm(`Reject access request from ${request.email}?`))return;await runTransaction(db,async transaction=>transaction.update(doc(db,"programs",PROGRAM_ID,"accessRequests",request.uid),{status:"rejected",rejectedAt:serverTimestamp(),rejectedBy:auth.currentUser!.uid,updatedAt:serverTimestamp()}));notify("Access request rejected")};
  const change=async(member:Member,role:"admin"|"viewer")=>{if(!db||!auth?.currentUser||member.uid===auth.currentUser.uid)return alert("You cannot change your own role.");await runTransaction(db,async transaction=>transaction.update(doc(db,"programs",PROGRAM_ID,"members",member.uid),{role,updatedAt:serverTimestamp(),updatedBy:auth.currentUser!.uid}));notify("Member role updated")};
  const remove=async(member:Member)=>{
    if(!db||!auth?.currentUser)return;
    if(member.uid===auth.currentUser.uid)return alert("You cannot remove your own account.");
    if(member.role==="admin"&&members.filter(item=>item.active&&item.role==="admin").length<=1)return alert("The final active Admin cannot be removed.");
    if(!confirm(`Remove ${member.fullName||member.email} from this program? They will immediately lose access.`))return;
    try {
      await runTransaction(db,async transaction=>transaction.delete(doc(db,"programs",PROGRAM_ID,"members",member.uid)));
      notify("User access removed");
    } catch { setError("The user could not be removed. No access changes were saved."); }
  };

  return <>
    <div className="page-heading"><div><span className="eyebrow">ACCESS CONTROL</span><h1>Users and permissions</h1><p>Approve account requests and assign Viewer or Admin access.</p></div></div>
    {error&&<div className="budget-warning"><span>{error}</span></div>}
    <section className="dashboard-panels">
      <article className="finance-panel access-requests"><div className="panel-title"><div><span>PENDING APPROVAL</span><h3>Access requests</h3></div><b>{requests.length}</b></div>{requests.length===0?<div className="admin-empty"><UserCheck/><b>No pending requests</b><span>New account requests will appear here.</span></div>:requests.map(request=><div className="access-request" key={request.uid}><span>{(request.fullName||request.email).slice(0,2).toUpperCase()}</span><div><b>{request.fullName||"New user"}</b><small>{request.email}</small></div><div className="request-actions"><button onClick={()=>approve(request,"viewer")}><Check/>Approve Viewer</button><button onClick={()=>approve(request,"admin")}><ShieldCheck/>Approve Admin</button><button className="danger" onClick={()=>reject(request)}><UserX/>Reject</button></div></div>)}</article>
      <article className="finance-panel member-list"><div className="panel-title"><div><span>PROGRAM MEMBERS</span><h3>Current access</h3></div><b>{members.length}</b></div>{members.map(member=>{const current=member.uid===auth?.currentUser?.uid;return <div className="member-row" key={member.uid}><span>{(member.fullName||member.email).slice(0,2).toUpperCase()}</span><div><b>{member.fullName||member.email}{current&&<em className="current-account">You</em>}</b><small>{member.email}</small></div><select value={member.role} disabled={current} title={current?"You cannot change your own role":"Change member role"} aria-label={`Role for ${member.fullName||member.email}`} onChange={event=>change(member,event.target.value as "admin"|"viewer")}><option value="viewer">Viewer</option><option value="admin">Admin</option></select><i className={`status ${member.active?member.role:"cancelled"}`}>{member.active?member.role:"inactive"}</i><button className="remove-member" disabled={current} title={current?"You cannot remove your own account":"Remove user access"} aria-label={`Remove ${member.fullName||member.email}`} onClick={()=>remove(member)}><UserMinus/><span>Remove</span></button></div>})}</article>
    </section>
  </>;
}
