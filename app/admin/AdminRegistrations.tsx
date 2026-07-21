"use client";
import { useEffect, useMemo, useState } from "react";
import { collection, doc, onSnapshot, query, runTransaction, serverTimestamp } from "firebase/firestore";
import { deleteObject, getDownloadURL, ref } from "firebase/storage";
import { Check, Download, Eye, FileDown, Search, Trash2, X } from "lucide-react";
import { auth, db, storage } from "../lib/firebase";
import { PROGRAM_ID, maskIdentification } from "../lib/registration";
import { rm } from "../lib/finance";
import { requestRegistrationEmail } from "../lib/registration-email";
import { downloadConfirmationLetterPdf } from "../lib/registration-documents";

type Registration={id:string;referenceNumber:string;fullName:string;identificationNumber:string;email:string;organisationType:string;workplace:string;expertise:string;attendanceType:string;attendanceLabel:string;registrationFeeInSen:number;paymentStatus:string;registrationStatus:string;submittedAt?:{toDate:()=>Date};proofOfPaymentPath:string;linkedTransactionId?:string};

export default function AdminRegistrations({notify}:{notify:(message:string)=>void}) {
  const [rows,setRows]=useState<Registration[]>([]),[search,setSearch]=useState(""),[payment,setPayment]=useState("all"),[status,setStatus]=useState("all"),[selected,setSelected]=useState<Registration|null>(null),[error,setError]=useState("");

  useEffect(()=>{
    if(!db)return;
    return onSnapshot(query(collection(db,"programs",PROGRAM_ID,"registrations")),snapshot=>setRows(snapshot.docs.map(item=>({...item.data(),id:item.id}) as Registration)),()=>setError("Registrations could not be loaded. Retry after checking your connection."));
  },[]);

  const filtered=useMemo(()=>rows.filter(row=>(payment==="all"||row.paymentStatus===payment)&&(status==="all"||row.registrationStatus===status)&&`${row.fullName} ${row.email} ${row.referenceNumber}`.toLowerCase().includes(search.toLowerCase())).sort((a,b)=>(b.submittedAt?.toDate().getTime()||0)-(a.submittedAt?.toDate().getTime()||0)),[rows,search,payment,status]);
  const verified=rows.filter(row=>row.paymentStatus==="verified");
  const expected=rows.filter(row=>row.registrationStatus!=="cancelled"&&row.registrationStatus!=="rejected").reduce((sum,row)=>sum+row.registrationFeeInSen,0);

  const verify=async(row:Registration)=>{
    if(!db||!auth?.currentUser||!confirm(`Verify payment for ${row.referenceNumber} and create its income transaction?`))return;
    try {
      const registrationRef=doc(db,"programs",PROGRAM_ID,"registrations",row.id);
      await runTransaction(db,async transaction=>{
        const current=(await transaction.get(registrationRef)).data() as Registration;
        if(current.paymentStatus==="verified"||current.linkedTransactionId)return;
        const transactionId=crypto.randomUUID();
        transaction.set(doc(db,"programs",PROGRAM_ID,"transactions",transactionId),{id:transactionId,programId:PROGRAM_ID,type:"income",amountInSen:current.registrationFeeInSen,category:"Participant Fees",description:`Registration payment - ${current.fullName}`,partyName:current.fullName,paymentMethod:"Bank Transfer",referenceNumber:current.referenceNumber,transactionDate:new Date().toISOString().slice(0,10),status:"paid",createdBy:auth.currentUser!.uid,createdAt:serverTimestamp(),updatedBy:auth.currentUser!.uid,updatedAt:serverTimestamp(),source:"registration",registrationId:row.id});
        transaction.update(registrationRef,{paymentStatus:"verified",registrationStatus:"confirmed",verifiedAt:serverTimestamp(),verifiedBy:auth.currentUser!.uid,linkedTransactionId:transactionId,updatedAt:serverTimestamp()});
      });
      const emailSent=await requestRegistrationEmail(auth.currentUser,row.id,"confirmed");
      notify(emailSent?"Payment verified, income created and confirmation email sent":"Payment verified and income created. Email service is not configured or temporarily unavailable.");
      setSelected(null);
    } catch { setError("Payment verification failed. No financial changes were saved."); }
  };

  const reject=async(row:Registration)=>{
    if(!db||!auth?.currentUser)return;
    const reason=prompt("Reason for rejecting this payment proof:");
    if(!reason)return;
    await runTransaction(db,async transaction=>transaction.update(doc(db,"programs",PROGRAM_ID,"registrations",row.id),{paymentStatus:"rejected",registrationStatus:"rejected",rejectionReason:reason,updatedAt:serverTimestamp(),updatedBy:auth.currentUser!.uid}));
    notify("Registration rejected");
    setSelected(null);
  };

  const removeRegistration=async(row:Registration)=>{
    if(!db||!auth?.currentUser)return;
    const linkedWarning=row.linkedTransactionId?" Its linked income transaction will be cancelled and retained in the financial audit trail.":"";
    if(!confirm(`Permanently delete registration ${row.referenceNumber} for ${row.fullName}? The participant's seat and uploaded payment proof will also be removed.${linkedWarning} This cannot be undone.`))return;
    try {
      await runTransaction(db,async transaction=>{
        const registrationRef=doc(db,"programs",PROGRAM_ID,"registrations",row.id);
        const snapshot=await transaction.get(registrationRef);
        const current=snapshot.data() as Registration|undefined;
        if(!current)throw new Error("Registration not found.");
        const counterRef=doc(db,"programs",PROGRAM_ID,"counters","registrations");
        const counterSnapshot=await transaction.get(counterRef);
        const counter=counterSnapshot.data();
        const linkedTransactionRef=current.linkedTransactionId?doc(db,"programs",PROGRAM_ID,"transactions",current.linkedTransactionId):null;
        const linkedTransactionSnapshot=linkedTransactionRef?await transaction.get(linkedTransactionRef):null;
        if(linkedTransactionRef&&(!linkedTransactionSnapshot||!linkedTransactionSnapshot.exists()))throw new Error("Linked income transaction not found.");
        const attendanceKey=current.attendanceType==="full"?"full":"day1";
        if(linkedTransactionRef)transaction.update(linkedTransactionRef,{status:"cancelled",cancelledBy:auth.currentUser!.uid,cancelledAt:serverTimestamp(),cancellationReason:`Registration ${current.referenceNumber} deleted by administrator`,updatedBy:auth.currentUser!.uid,updatedAt:serverTimestamp()});
        transaction.update(counterRef,{[attendanceKey]:Math.max(0,Number(counter?.[attendanceKey]||0)-1),updatedAt:serverTimestamp()});
        transaction.delete(registrationRef);
      });
      if(storage&&row.proofOfPaymentPath){try{await deleteObject(ref(storage,row.proofOfPaymentPath))}catch{/* Record deletion remains authoritative if the file is already absent. */}}
      notify(row.linkedTransactionId?"Registration deleted, seat released and linked income transaction cancelled":"Registration deleted and its seat released");
      setSelected(null);
    } catch { setError("The registration could not be deleted. No capacity changes were saved."); }
  };

  const viewProof=async(row:Registration)=>{if(!storage||!row.proofOfPaymentPath)return;try{window.open(await getDownloadURL(ref(storage,row.proofOfPaymentPath)),"_blank","noopener,noreferrer")}catch{setError("The payment proof could not be opened.")}};
  const confirmationLetter=(row:Registration)=>downloadConfirmationLetterPdf({referenceNumber:row.referenceNumber,fullName:row.fullName,attendanceLabel:row.attendanceLabel,feeInSen:row.registrationFeeInSen,date:row.submittedAt?.toDate()||new Date()});
  const csv=()=>{const lines=[["Reference Number","Participant Name","Email","Identification (Masked)","Organisation","Workplace","Expertise","Attendance","Fee (RM)","Payment Status","Registration Status","Submission Date"],...filtered.map(row=>[row.referenceNumber,row.fullName,row.email,maskIdentification(row.identificationNumber),row.organisationType,row.workplace,row.expertise,row.attendanceLabel,(row.registrationFeeInSen/100).toFixed(2),row.paymentStatus,row.registrationStatus,row.submittedAt?.toDate().toISOString()||""])].map(line=>line.map(value=>`"${String(value).replaceAll('"','""')}"`).join(",")).join("\n");const anchor=document.createElement("a");anchor.href=URL.createObjectURL(new Blob(["\ufeff",lines],{type:"text/csv;charset=utf-8"}));anchor.download="filtered-registrations.csv";anchor.click();URL.revokeObjectURL(anchor.href)};

  const actions=(row:Registration,mobile=false)=><>
    <button onClick={()=>setSelected(row)} className={mobile?undefined:"row-menu"} aria-label="View registration"><Eye/>{mobile&&"View Details"}</button>
    <button onClick={()=>viewProof(row)} className={mobile?undefined:"row-menu"} aria-label="View payment proof"><Download/>{mobile&&"Payment Proof"}</button>
    {row.paymentStatus==="pending_verification"&&<><button className={mobile?"verify":"row-menu"} onClick={()=>verify(row)} aria-label="Verify payment"><Check/>{mobile&&"Verify Payment"}</button><button className={mobile?"reject":"row-menu danger"} onClick={()=>reject(row)} aria-label="Reject payment"><X/>{mobile&&"Reject"}</button></>}
    {row.paymentStatus==="verified"&&<button className={mobile?"verify wide":"row-menu"} onClick={()=>confirmationLetter(row)} aria-label="Download confirmation letter"><FileDown/>{mobile&&"Confirmation Letter"}</button>}
    <button className={mobile?"reject wide":"row-menu danger"} onClick={()=>removeRegistration(row)} aria-label={`Delete registration ${row.referenceNumber}`} title={row.linkedTransactionId?"Delete registration and cancel its linked income transaction":"Delete registration"}><Trash2/>{mobile&&"Delete Registration"}</button>
  </>;

  return <>
    <div className="page-heading"><div><span className="eyebrow">PARTICIPANT ADMINISTRATION</span><h1>Registrations</h1><p>Review submissions, verify payments and confirm participant places.</p></div><button className="premium-btn primary" onClick={csv}><Download/>Export CSV</button></div>
    <section className="budget-overview phase4-summary">{[["TOTAL REGISTRATIONS",rows.length],["PENDING VERIFICATION",rows.filter(row=>row.paymentStatus==="pending_verification").length],["CONFIRMED",rows.filter(row=>row.registrationStatus==="confirmed").length],["REJECTED",rows.filter(row=>row.registrationStatus==="rejected").length],["DAY 1 ONLY",rows.filter(row=>row.attendanceType==="day1").length],["FULL PROGRAMME",rows.filter(row=>row.attendanceType==="full").length],["EXPECTED INCOME",rm(expected)],["VERIFIED INCOME",rm(verified.reduce((sum,row)=>sum+row.registrationFeeInSen,0))]].map(([label,value])=><div key={label}><small>{label}</small><b>{value}</b></div>)}</section>
    {error&&<div className="budget-warning"><span>{error}</span><button onClick={()=>setError("")}><X/></button></div>}
    <div className="filter-bar"><div className="search-box"><Search/><input value={search} onChange={event=>setSearch(event.target.value)} placeholder="Search name, email or reference"/></div><select value={payment} onChange={event=>setPayment(event.target.value)}><option value="all">All payment statuses</option><option value="pending_verification">Pending verification</option><option value="verified">Verified</option><option value="rejected">Rejected</option></select><select value={status} onChange={event=>setStatus(event.target.value)}><option value="all">All registration statuses</option><option value="submitted">Submitted</option><option value="confirmed">Confirmed</option><option value="rejected">Rejected</option><option value="cancelled">Cancelled</option></select></div>
    <article className="finance-panel table-panel"><div className="table-meta"><b>{filtered.length} registrations</b><span>Identification numbers are masked by default</span></div><div className="transaction-table"><table><thead><tr><th>Reference</th><th>Participant</th><th>Organisation</th><th>Attendance</th><th>Fee</th><th>Payment</th><th>Registration</th><th>Submitted</th><th>Actions</th></tr></thead><tbody>{filtered.map(row=><tr key={row.id}><td><b>{row.referenceNumber}</b><small>{maskIdentification(row.identificationNumber)}</small></td><td><b>{row.fullName}</b><small>{row.email}</small></td><td><b>{row.organisationType}</b><small>{row.workplace}</small></td><td>{row.attendanceType==="full"?"Day 1 + 2":"Day 1"}</td><td>{rm(row.registrationFeeInSen)}</td><td><span className={`status ${row.paymentStatus}`}>{row.paymentStatus.replaceAll("_"," ")}</span></td><td><span className={`status ${row.registrationStatus}`}>{row.registrationStatus}</span></td><td>{row.submittedAt?.toDate().toLocaleDateString("en-MY")||"—"}</td><td>{actions(row)}</td></tr>)}</tbody></table></div></article>
    <section className="mobile-registrations" aria-label="Mobile registration list">{filtered.length===0?<div className="mobile-registration-empty"><Search/><b>No registrations found</b><span>Clear or change the filters to see registrations.</span></div>:filtered.map(row=><article className="mobile-registration-card" key={row.id}><header><div><span>{row.referenceNumber}</span><h3>{row.fullName}</h3><p>{row.email}</p></div><span className={`status ${row.paymentStatus}`}>{row.paymentStatus.replaceAll("_"," ")}</span></header><dl><div><dt>Organisation</dt><dd>{row.organisationType}<small>{row.workplace}</small></dd></div><div><dt>Identification</dt><dd>{maskIdentification(row.identificationNumber)}</dd></div><div><dt>Attendance</dt><dd>{row.attendanceType==="full"?"Day 1 + 2":"Day 1"}</dd></div><div><dt>Fee</dt><dd>{rm(row.registrationFeeInSen)}</dd></div><div><dt>Registration</dt><dd><span className={`status ${row.registrationStatus}`}>{row.registrationStatus}</span></dd></div><div><dt>Submitted</dt><dd>{row.submittedAt?.toDate().toLocaleDateString("en-MY")||"—"}</dd></div></dl><div className="mobile-registration-actions">{actions(row,true)}</div></article>)}</section>
    {selected&&<><div className="modal-backdrop" onClick={()=>setSelected(null)}/><div className="confirm-dialog registration-detail"><button className="row-menu detail-close" aria-label="Close registration details" onClick={()=>setSelected(null)}><X/></button><h3>{selected.referenceNumber}</h3><p><b>{selected.fullName}</b><br/>{selected.email}</p><dl><div><dt>Identification</dt><dd>{selected.identificationNumber}</dd></div><div><dt>Organisation</dt><dd>{selected.organisationType}</dd></div><div><dt>Workplace</dt><dd>{selected.workplace}</dd></div><div><dt>Expertise</dt><dd>{selected.expertise}</dd></div><div><dt>Attendance</dt><dd>{selected.attendanceLabel}</dd></div><div><dt>Fee</dt><dd>{rm(selected.registrationFeeInSen)}</dd></div><div><dt>Payment</dt><dd><span className={`status ${selected.paymentStatus}`}>{selected.paymentStatus.replaceAll("_"," ")}</span></dd></div></dl><div className="registration-detail-actions"><button className="premium-btn ghost" onClick={()=>viewProof(selected)}><Download/>View Payment Proof</button>{selected.paymentStatus==="pending_verification"&&<><button className="premium-btn primary" onClick={()=>verify(selected)}><Check/>Verify Payment</button><button className="premium-btn danger" onClick={()=>reject(selected)}><X/>Reject Payment</button></>}{selected.paymentStatus==="verified"&&<button className="premium-btn primary" onClick={()=>confirmationLetter(selected)}><FileDown/>Download Confirmation Letter</button>}<button className="premium-btn danger" onClick={()=>removeRegistration(selected)}><Trash2/>Delete Registration</button></div></div></>}
  </>;
}
