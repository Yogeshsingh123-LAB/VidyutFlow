export const riskLevel = r => r >= .7 ? ['High risk','bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200'] : r >= .4 ? ['Watch','bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200'] : ['On track','bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'];
export const STEPS = ['Submitted','Validated','Routed','Field verified','Approved','Completed'];
export function stepIndex(status) {
  return ({ SUBMITTED:0, NEEDS_CORRECTION:1, ROUTED:2, ASSIGNED:2, IN_PROGRESS:3, FIELD_VERIFIED:3, APPROVED:4, COMPLETED:5, REJECTED:1 })[status] ?? 0;
}
export const fmtDate = iso => iso ? new Date(iso).toLocaleString('en-IN', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' }) : '—';
export const isOverdue = r => r.sla_due_at && r.status !== 'COMPLETED' && r.status !== 'REJECTED' && new Date(r.sla_due_at) < new Date();
