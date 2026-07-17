export type TransactionType = "income" | "expense" | "refund" | "adjustment";
export type TransactionStatus = "pending" | "approved" | "paid" | "cancelled";

export interface Transaction {
  id: string; type: TransactionType; amountInSen: number; category: string;
  description: string; partyName: string; paymentMethod: string;
  referenceNumber: string; transactionDate: string; status: TransactionStatus;
  createdBy: string; receiptName?: string; relatedTransactionId?: string;
  deletedAt?: string; updatedBy?: string; updatedAt?: string;
}

export interface BudgetAllocation {
  id: string; category: string; allocatedAmountInSen: number; notes?: string;
  createdAt: string; updatedAt: string; createdBy: string; updatedBy: string;
}

export type BudgetStatus = "On Track" | "Watch" | "Near Limit" | "Over Budget";

export const rm = (sen: number) => new Intl.NumberFormat("en-MY", {
  style: "currency", currency: "MYR", minimumFractionDigits: 2,
}).format(sen / 100).replace("MYR", "RM");

export const myDate = (date: string) => new Intl.DateTimeFormat("en-MY", {
  day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kuala_Lumpur",
}).format(new Date(`${date}T00:00:00+08:00`));

export function totals(items: Transaction[], approvedBudgetInSen: number, openingBalanceInSen: number) {
  const active = items.filter(t => t.status !== "cancelled" && !t.deletedAt);
  const actual = active.filter(t => t.status === "approved" || t.status === "paid");
  const income = actual.filter(t => t.type === "income").reduce((s,t) => s + t.amountInSen, 0);
  const expenses = actual.filter(t => t.type === "expense").reduce((s,t) => s + t.amountInSen, 0);
  const refunds = actual.filter(t => t.type === "refund").reduce((s,t) => s + t.amountInSen, 0);
  const expenseRefunds = actual.filter(t => t.type === "refund" && relatedType(t, items) === "expense").reduce((s,t) => s + t.amountInSen, 0);
  const incomeRefunds = actual.filter(t => t.type === "refund" && relatedType(t, items) === "income").reduce((s,t) => s + t.amountInSen, 0);
  const adjustments = actual.filter(t => t.type === "adjustment").reduce((s,t) => s + t.amountInSen, 0);
  const committed = active.filter(t => t.type === "expense" && t.status === "pending").reduce((s,t) => s + t.amountInSen, 0);
  const netIncome = income - incomeRefunds;
  const netExpenses = expenses - expenseRefunds;
  return {
    income: netIncome, grossIncome: income, expenses: netExpenses, grossExpenses: expenses,
    refunds, expenseRefunds, incomeRefunds, adjustments, committed,
    netMovement: netIncome + adjustments - netExpenses,
    balance: openingBalanceInSen + netIncome + adjustments - netExpenses,
    remaining: approvedBudgetInSen - netExpenses,
    usedPercentage: approvedBudgetInSen ? netExpenses / approvedBudgetInSen * 100 : 0,
    transactionCount: active.length,
  };
}

function relatedType(refund: Transaction, items: Transaction[]): TransactionType | undefined {
  if (refund.relatedTransactionId) return items.find(t => t.id === refund.relatedTransactionId)?.type;
  return refund.category && expenseCategories.includes(refund.category) ? "expense" : "income";
}

export function categoryBudget(category: string, allocatedAmountInSen: number, items: Transaction[]) {
  const active = items.filter(t => t.category === category && t.status !== "cancelled" && !t.deletedAt);
  const approved = active.filter(t => t.type === "expense" && ["approved","paid"].includes(t.status)).reduce((s,t)=>s+t.amountInSen,0);
  const refunded = active.filter(t => t.type === "refund" && ["approved","paid"].includes(t.status) && relatedType(t, items) === "expense").reduce((s,t)=>s+t.amountInSen,0);
  const actual = Math.max(0, approved - refunded);
  const committed = active.filter(t => t.type === "expense" && t.status === "pending").reduce((s,t)=>s+t.amountInSen,0);
  const exposure = actual + committed;
  const usedPercentage = allocatedAmountInSen > 0 ? actual / allocatedAmountInSen * 100 : 0;
  const exposurePercentage = allocatedAmountInSen > 0 ? exposure / allocatedAmountInSen * 100 : 0;
  const status: BudgetStatus = exposurePercentage > 100 ? "Over Budget" : usedPercentage >= 90 ? "Near Limit" : exposurePercentage >= 70 ? "Watch" : "On Track";
  return { actual, committed, exposure, remaining: allocatedAmountInSen - actual, availableAfterCommitments: allocatedAmountInSen - exposure, variance: allocatedAmountInSen - actual, usedPercentage, exposurePercentage, status };
}

export interface TransactionFilters { startDate?: string; endDate?: string; type?: string; status?: string; category?: string; paymentMethod?: string; createdBy?: string; }
export function filterTransactions(items: Transaction[], filters: TransactionFilters) {
  return items.filter(t => !t.deletedAt &&
    (!filters.startDate || t.transactionDate >= filters.startDate) &&
    (!filters.endDate || t.transactionDate <= filters.endDate) &&
    (!filters.type || filters.type === "all" || t.type === filters.type) &&
    (!filters.status || filters.status === "all" || t.status === filters.status) &&
    (!filters.category || filters.category === "all" || t.category === filters.category) &&
    (!filters.paymentMethod || filters.paymentMethod === "all" || t.paymentMethod === filters.paymentMethod) &&
    (!filters.createdBy || filters.createdBy === "all" || t.createdBy === filters.createdBy));
}

export function toSen(ringgit: number) {
  if (!Number.isFinite(ringgit) || ringgit <= 0) throw new Error("Amount must be greater than RM0.");
  return Math.round(ringgit * 100);
}

export const incomeCategories = ["Participant Fees","Sponsorship","Donations","Grants","Merchandise Sales","Vendor Contributions","Other Income"];
export const expenseCategories = ["Venue","Equipment","Food and Beverages","Transportation","Accommodation","Marketing","Printing","Staff and Crew","Prizes","Gifts","Decorations","Photography and Videography","Technical Services","Permits and Licences","Emergency Expenses","Other Expenses"];

export const demoTransactions: Transaction[] = [
  {id:"t1",type:"income",amountInSen:500000,category:"Sponsorship",description:"Main clinical partner sponsorship",partyName:"MediCare Foundation",paymentMethod:"Bank Transfer",referenceNumber:"INC-001",transactionDate:"2026-07-03",status:"paid",createdBy:"Dr Anisa Alya"},
  {id:"t2",type:"income",amountInSen:250000,category:"Participant Fees",description:"Early-bird delegate registrations",partyName:"Delegates",paymentMethod:"E-wallet",referenceNumber:"INC-002",transactionDate:"2026-07-05",status:"paid",createdBy:"Dr Anisa Alya"},
  {id:"t3",type:"income",amountInSen:100000,category:"Donations",description:"Clinical education donation",partyName:"Anonymous Donor",paymentMethod:"Bank Transfer",referenceNumber:"INC-003",transactionDate:"2026-07-07",status:"approved",createdBy:"Dr Anisa Alya"},
  {id:"t4",type:"expense",amountInSen:150000,category:"Venue",description:"Symposium hall deposit",partyName:"Orchid Convention Centre",paymentMethod:"Bank Transfer",referenceNumber:"EXP-001",transactionDate:"2026-07-08",status:"paid",createdBy:"Dr Anisa Alya",receiptName:"venue-deposit.pdf"},
  {id:"t5",type:"expense",amountInSen:120000,category:"Food and Beverages",description:"Delegate catering deposit",partyName:"Savour Events",paymentMethod:"Credit Card",referenceNumber:"EXP-002",transactionDate:"2026-07-10",status:"paid",createdBy:"Dr Anisa Alya",receiptName:"catering.jpg"},
  {id:"t6",type:"expense",amountInSen:80000,category:"Equipment",description:"Airway simulation equipment",partyName:"Clinical Sim Supplies",paymentMethod:"Bank Transfer",referenceNumber:"EXP-003",transactionDate:"2026-07-11",status:"approved",createdBy:"Dr Anisa Alya"},
  {id:"t7",type:"expense",amountInSen:35000,category:"Marketing",description:"Digital programme promotion",partyName:"Studio Rose",paymentMethod:"Debit Card",referenceNumber:"EXP-004",transactionDate:"2026-07-13",status:"paid",createdBy:"Dr Anisa Alya"},
  {id:"t8",type:"expense",amountInSen:20000,category:"Printing",description:"Delegate handbook printing",partyName:"PrintHub KL",paymentMethod:"Cheque",referenceNumber:"EXP-005",transactionDate:"2026-07-15",status:"pending",createdBy:"Dr Anisa Alya"},
  {id:"t9",type:"expense",amountInSen:45000,category:"Transportation",description:"Faculty airport transfers",partyName:"KL Executive Transport",paymentMethod:"Bank Transfer",referenceNumber:"EXP-006",transactionDate:"2026-07-16",status:"approved",createdBy:"Dr Anisa Alya"},
];
