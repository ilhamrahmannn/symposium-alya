import { doc, runTransaction, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytesResumable } from "firebase/storage";
import { anonymousSignIn, db, storage } from "./firebase";
import { requestRegistrationEmail } from "./registration-email";
export { ATTENDANCE, maskIdentification, safeFileName, validateProof } from "./registration-utils";
import { ATTENDANCE, safeFileName } from "./registration-utils";

export const PROGRAM_ID = process.env.NEXT_PUBLIC_PROGRAM_ID || "prs-symposium-2026";
export type AttendanceType = keyof typeof ATTENDANCE;
export type RegistrationDraft = {
  fullName:string; identificationNumber:string; email:string; phoneNumber:string;
  organisationType:string; organisationTypeOther:string; workplace:string;
  expertise:string; expertiseOther:string; foodPreference:string; foodPreferenceOther:string;
  attendanceType:AttendanceType; proofFile:File|null;
  informationConfirmation:boolean; privacyConsent:boolean; termsAccepted:boolean;
};

export const emptyRegistration: RegistrationDraft = {
  fullName:"",identificationNumber:"",email:"",phoneNumber:"",organisationType:"",organisationTypeOther:"",workplace:"",
  expertise:"",expertiseOther:"",foodPreference:"",foodPreferenceOther:"",attendanceType:"day1",proofFile:null,
  informationConfirmation:false,privacyConsent:false,termsAccepted:false,
};

export async function submitRegistration(draft:RegistrationDraft,onProgress:(value:number)=>void){
  if(!db||!storage)throw new Error("Registration service is currently unavailable.");
  const user=await anonymousSignIn();
  const registrationId=crypto.randomUUID();
  const registrationRef=doc(db,"programs",PROGRAM_ID,"registrations",registrationId);
  const counterRef=doc(db,"programs",PROGRAM_ID,"counters","registrations");
  const attendance=ATTENDANCE[draft.attendanceType];
  const referenceNumber=await runTransaction(db,async tx=>{
    const counter=await tx.get(counterRef); const counterData=counter.data();
    const next=(counterData?.value||0)+1;
    const attendanceCount=(counterData?.[draft.attendanceType]||0)+1;
    if(attendanceCount>attendance.capacity)throw new Error(`The ${attendance.label} option has reached its participant limit.`);
    tx.set(counterRef,{value:next,[draft.attendanceType]:attendanceCount,updatedAt:serverTimestamp()},{merge:true});
    tx.set(registrationRef,{
      id:registrationId,programId:PROGRAM_ID,ownerUid:user.uid,referenceNumber:`PRS2026-${String(next).padStart(4,"0")}`,
      fullName:draft.fullName.trim().toUpperCase(),identificationNumber:draft.identificationNumber.trim(),email:draft.email.trim().toLowerCase(),phoneNumber:draft.phoneNumber.trim(),
      organisationType:draft.organisationType,organisationTypeOther:draft.organisationTypeOther.trim(),workplace:draft.workplace.trim(),
      expertise:draft.expertise,expertiseOther:draft.expertiseOther.trim(),foodPreference:draft.foodPreference,foodPreferenceOther:draft.foodPreferenceOther.trim(),
      attendanceType:draft.attendanceType,attendanceLabel:attendance.label,registrationFeeInSen:attendance.feeInSen,
      proofOfPaymentPath:"",proofOfPaymentFileName:safeFileName(draft.proofFile!.name),paymentStatus:"pending_verification",registrationStatus:"submitted",
      privacyConsent:draft.privacyConsent,informationConfirmation:draft.informationConfirmation,termsAccepted:draft.termsAccepted,
      submittedAt:serverTimestamp(),createdAt:serverTimestamp(),updatedAt:serverTimestamp(),verifiedAt:null,verifiedBy:null,rejectionReason:null,linkedTransactionId:null,
    }); return `PRS2026-${String(next).padStart(4,"0")}`;
  });
  const fileName=safeFileName(draft.proofFile!.name);
  const path=`programs/${PROGRAM_ID}/registration-payments/${user.uid}/${registrationId}/${fileName}`;
  await new Promise<void>((resolve,reject)=>{const task=uploadBytesResumable(ref(storage,path),draft.proofFile!,{contentType:draft.proofFile!.type,customMetadata:{registrationId,ownerUid:user.uid}});task.on("state_changed",s=>onProgress(Math.round(s.bytesTransferred/s.totalBytes*100)),reject,()=>resolve())});
  await runTransaction(db,async tx=>tx.update(registrationRef,{proofOfPaymentPath:path,updatedAt:serverTimestamp()}));
  await requestRegistrationEmail(user,registrationId,"received");
  return {registrationId,referenceNumber,fullName:draft.fullName.trim().toUpperCase(),attendanceLabel:attendance.label,feeInSen:attendance.feeInSen,submittedAt:new Date().toISOString()};
}
