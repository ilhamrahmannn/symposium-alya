import assert from "node:assert/strict";
import test from "node:test";
import { ATTENDANCE, maskIdentification, safeFileName, validateProof } from "../app/lib/registration-utils.ts";

test("registration fees are stored as integer sen",()=>{assert.equal(ATTENDANCE.day1.feeInSen,15000);assert.equal(ATTENDANCE.full.feeInSen,30000)});
test("identification numbers are masked",()=>{const masked=maskIdentification("900101-01-1234");assert.equal(masked.startsWith("90"),true);assert.equal(masked.endsWith("34"),true);assert.equal(masked.includes("0101"),false)});
test("payment filenames are sanitised",()=>{assert.equal(safeFileName("My payment (final).pdf"),"My-payment-final-.pdf")});
test("payment proof validation enforces type and size",()=>{assert.match(validateProof(null),/required/);assert.match(validateProof(new File(["x"],"proof.exe",{type:"application/octet-stream"})),/Only PDF/);assert.match(validateProof(new File([new Uint8Array(10*1024*1024+1)],"large.pdf",{type:"application/pdf"})),/10 MB/);assert.equal(validateProof(new File(["ok"],"proof.pdf",{type:"application/pdf"})),"")});
