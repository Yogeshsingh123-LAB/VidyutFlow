import { X } from 'lucide-react';
import { Card, WorkflowStepper, RiskChip, StatusChip } from './ui';
import { fmtDate, isOverdue } from '../lib/format';

export function RequestDrawer({ req, user, onClose, onApprove, onReject, onComplete }) {
  if (!req) return null;
  const rows = [['Applicant', req.applicant_name], ['Phone', req.phone], ['Address', req.address], ['Zone / PIN', `${req.zone} · ${req.pin_code||'—'}`],
    ['Tariff', req.tariff_category], ['Phase / Premises', `${req.phase} · ${req.premises_type}`], ['Requested load', `${req.requested_load_kw} kW`],
    ['Document', req.document_name || '—'], ['ML category', `${req.category} · ${req.severity} · ${req.priority}`],
    ['Assigned officer', (req.assigned_officer_id||'—').slice(0,8)], ['Assigned engineer', (req.assigned_engineer_id||'—').slice(0,8)],
    ['Created', fmtDate(req.created_at)], ['SLA due', fmtDate(req.sla_due_at) + (isOverdue(req) ? ' · OVERDUE' : '')], ['Validation', req.validation_notes]];
  return (<div className="fixed inset-0 z-[80] flex justify-end bg-black/40" onClick={onClose}>
    <aside className="w-[min(94vw,460px)] h-full overflow-y-auto bg-white dark:bg-[#0B1120] p-5 space-y-4" onClick={e=>e.stopPropagation()}>
      <div className="flex items-start justify-between"><div><h2 className="font-bold text-lg text-slate-900 dark:text-white">Case {req.id.slice(0,8)}</h2>
      <div className="flex gap-2 mt-2"><StatusChip status={req.status}/><RiskChip value={req.sla_breach_risk}/></div></div>
      <button onClick={onClose} className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800"><X size={16}/></button></div>
      <Card className="p-4"><h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Workflow</h3><WorkflowStepper status={req.status}/></Card>
      <Card className="p-4"><dl className="space-y-2 text-sm">{rows.map(([k,v]) => <div key={k} className="flex justify-between gap-4"><dt className="text-slate-400">{k}</dt><dd className="text-right font-medium text-slate-800 dark:text-slate-100">{v||'—'}</dd></div>)}</dl></Card>
      <Card className="p-4"><h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Why this SLA risk?</h3>
        <ul className="list-disc ml-5 text-sm space-y-1">{(req.sla_risk_reasons||[]).map((r,i)=><li key={i}>{r}</li>)}</ul>
        <p className="text-xs text-slate-400 mt-3">Model trained on synthetic data — see Insights tab.</p></Card>
      <div className="flex flex-wrap gap-2">
        {(user.role==='officer'||user.role==='admin') && !['COMPLETED','REJECTED'].includes(req.status) && <>{['ROUTED','ASSIGNED','IN_PROGRESS','FIELD_VERIFIED','APPROVED'].includes(req.status) && <button className="px-3 py-2 rounded-lg bg-teal-600 text-white text-sm" onClick={()=>onApprove(req)}>Approve</button>}{req.status!=='APPROVED' && <button className="px-3 py-2 rounded-lg bg-red-600 text-white text-sm" onClick={()=>onReject(req)}>Reject</button>}</>}
        {(user.role==='engineer'||user.role==='admin') && ['ASSIGNED','IN_PROGRESS','FIELD_VERIFIED','APPROVED','BLOCKED'].includes(req.status) && <button className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm" onClick={()=>onComplete(req)}>Complete field task</button>}
      </div>
    </aside></div>);
}
