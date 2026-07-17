export const ATTENDANCE = {
  day1: { label: "Day 1 Only: Symposium", feeInSen: 15000 },
  full: { label: "Day 1 and Day 2: Symposium and Workshop on Fabrication of OAP", feeInSen: 30000 },
} as const;
export function maskIdentification(value:string){const clean=value.trim();if(clean.length<=4)return "••••";return `${clean.slice(0,2)}${"•".repeat(Math.max(4,clean.length-4))}${clean.slice(-2)}`}
export function safeFileName(name:string){return name.normalize("NFKD").replace(/[^a-zA-Z0-9._-]/g,"-").replace(/-+/g,"-").slice(-100)}
export function validateProof(file:File|null){if(!file)return "Proof of payment is required.";if(file.size>10*1024*1024)return "File must not exceed 10 MB.";if(!["application/pdf","image/jpeg","image/png"].includes(file.type))return "Only PDF, JPG, JPEG and PNG files are accepted.";return ""}
