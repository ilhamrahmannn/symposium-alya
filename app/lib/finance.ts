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
