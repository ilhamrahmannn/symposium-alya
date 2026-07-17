import assert from "node:assert/strict";
import test from "node:test";
import { categoryBudget, filterTransactions, rm, toSen, totals } from "../app/lib/finance.ts";

const tx = (overrides = {}) => ({ id: crypto.randomUUID(), type:"expense", amountInSen:10000, category:"Venue", description:"Test", partyName:"Supplier", paymentMethod:"Bank Transfer", referenceNumber:"T-1", transactionDate:"2026-07-17", status:"paid", createdBy:"admin", ...overrides });

test("income increases and expense decreases balance",()=>{const value=totals([tx({type:"income",amountInSen:50000}),tx({amountInSen:20000})],100000,0);assert.equal(value.balance,30000)});
test("cancelled and soft-deleted records are excluded",()=>{const value=totals([tx({amountInSen:20000,status:"cancelled"}),tx({amountInSen:30000,deletedAt:"2026-07-17"})],100000,0);assert.equal(value.expenses,0)});
test("pending expense is committed, not actual",()=>{const value=totals([tx({amountInSen:25000,status:"pending"})],100000,0);assert.equal(value.expenses,0);assert.equal(value.committed,25000)});
test("approved and paid expenses are actual",()=>{const value=totals([tx({amountInSen:10000,status:"approved"}),tx({amountInSen:15000,status:"paid"})],100000,0);assert.equal(value.expenses,25000)});
test("expense refund reduces related spending",()=>{const expense=tx({id:"e1",amountInSen:50000});const refund=tx({type:"refund",amountInSen:12000,relatedTransactionId:"e1"});const value=totals([expense,refund],100000,0);assert.equal(value.expenses,38000)});
test("income refund reduces related income",()=>{const income=tx({id:"i1",type:"income",category:"Sponsorship",amountInSen:50000});const refund=tx({type:"refund",category:"Sponsorship",amountInSen:10000,relatedTransactionId:"i1"});const value=totals([income,refund],100000,0);assert.equal(value.income,40000)});
test("editing and deleting update totals",()=>{const original=[tx({id:"e",amountInSen:10000})];assert.equal(totals(original,100000,0).expenses,10000);assert.equal(totals([{...original[0],amountInSen:18000}],100000,0).expenses,18000);assert.equal(totals([{...original[0],deletedAt:"now"}],100000,0).expenses,0)});
test("budget percentages and over-budget status",()=>{assert.equal(categoryBudget("Venue",100000,[tx({amountInSen:75000})]).status,"Watch");assert.equal(categoryBudget("Venue",100000,[tx({amountInSen:110000})]).status,"Over Budget");assert.equal(categoryBudget("Venue",0,[]).usedPercentage,0)});
test("sen conversion and RM formatting",()=>{assert.equal(toSen(120.5),12050);assert.match(rm(12050),/120\.50/);assert.throws(()=>toSen(-1))});
test("date filters include both boundaries",()=>{const items=[tx({id:"a",transactionDate:"2026-07-01"}),tx({id:"b",transactionDate:"2026-07-31"}),tx({id:"c",transactionDate:"2026-08-01"})];assert.deepEqual(filterTransactions(items,{startDate:"2026-07-01",endDate:"2026-07-31"}).map(x=>x.id),["a","b"])});
test("dashboard, budget and fund usage share expense totals",()=>{const items=[tx({amountInSen:40000}),tx({amountInSen:10000,status:"pending"})];const dashboard=totals(items,100000,0);const budget=categoryBudget("Venue",100000,items);assert.equal(dashboard.expenses,budget.actual);assert.equal(dashboard.committed,budget.committed)});
