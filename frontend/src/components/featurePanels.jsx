import { useMemo, useState } from 'react';
import { Card, Field, inputCls, Chip, RiskChip, StatusChip, Bars } from './ui';
import { fmtDate, isOverdue } from '../lib/format';

const inr = n => '₹' + Math.round(n).toLocaleString('en-IN');
export function downloadCsv(name, rows) {
  const csv = rows.map(r => r.map(c => `"${String(c ?? '').replaceAll('"','""')}"`).join(',')).join('\n');
  const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type:'text/csv' })); a.download = name; a.click(); URL.revokeObjectURL(a.href);
}

/* Consumer: connections derived from real (completed) requests */
export function ConnectionsPanel({ requests, onOpen }) {
  const done = requests.filter(r => r.status === 'COMPLETED'); const active = requests.filter(r => r.status !== 'COMPLETED' && r.status !== 'REJECTED');
  return (<div className="space-y-4">
    {done.map(r => (<Card key={r.id} className="p-5"><div className="flex flex-wrap gap-3">
      <div><h3 className="font-bold">⚡ {r.applicant_name}</h3><p className="text-xs text-slate-400 font-mono">Case {r.id.slice(0,8)} · {r.zone} subdivision</p></div>
      <span className="ml-auto"><Chip className="bg-emerald-100 text-emerald-800">ACTIVE CONNECTION</Chip></span></div>
      <dl className="grid sm:grid-cols-4 gap-3 mt-4 text-sm">{[['Meter serial', r.meter_serial || '—'],['Sanctioned load', `${r.requested_load_kw} kW`],['Phase', r.phase],['Tariff', r.tariff_category],['Address', r.address],['Connected', fmtDate(r.updated_at)],['Premises', r.premises_type],['Status', r.status]].map(([k,v]) => <div key={k}><dt className="text-[11px] uppercase font-bold text-slate-400">{k}</dt><dd className="font-medium mt-0.5">{v}</dd></div>)}</dl>
      <p className="text-xs text-slate-400 mt-3">Estimated use (demo formula, not metered): ~{Math.round(r.requested_load_kw*110)} kWh/month. Real AMR metering is roadmap.</p>
      <button className="mt-2 text-sm font-bold text-blue-600" onClick={() => onOpen(r)}>View case evidence →</button></Card>))}
    {!done.length && <Card className="p-6 text-sm text-slate-400">No completed connection yet — once a field task completes, it appears here with its meter serial.</Card>}
    {active.length > 0 && <Card className="p-5"><h3 className="font-bold mb-2">In progress</h3>{active.map(r => <button key={r.id} onClick={() => onOpen(r)} className="block w-full text-left py-2 text-sm border-b border-slate-50 dark:border-slate-800">{r.applicant_name} · {r.status} · due {fmtDate(r.sla_due_at)}</button>)}</Card>}
  </div>);
}

/* Consumer: DEMO estimated bill (labelled) with slab breakdown, pay + receipt */
export function BillsPanel({ requests, toast, paymentsOnly = false }) {
  const src = requests.find(r => r.status === 'COMPLETED') || requests[0];
  const [paid, setPaid] = useState(() => localStorage.getItem('vidyutos_bill_paid') === '1');
  const [showPay, setShowPay] = useState(false); const [method, setMethod] = useState('UPI / BHIM'); const [showReceipt, setShowReceipt] = useState(false);
  const bill = useMemo(() => { if (!src) return null; const units = Math.round(src.requested_load_kw * 110);
    const slabs = [['0–100 units', Math.min(units,100), 4.50], ['101–300 units', Math.max(0, Math.min(units,300)-100), 6.00], ['Above 300', Math.max(0, units-300), 7.50]].filter(s => s[1] > 0);
    const energy = slabs.reduce((s,[,u,r]) => s + u*r, 0); const fixed = 150; const duty = energy * 0.10;
    return { no:'BILL-' + src.id.slice(0,8).toUpperCase(), month:'Current cycle (demo)', units, slabs, energy, fixed, duty, total: energy + fixed + duty }; }, [src]);
  if (!src || !bill) return <Card className="p-6 text-sm text-slate-400">Submit a request first — your demo bill estimate is generated from its sanctioned load.</Card>;
  const pay = () => { localStorage.setItem('vidyutos_bill_paid','1'); setPaid(true); setShowPay(false); setShowReceipt(true); toast('Demo payment recorded on this device — no real payment gateway is connected'); };
  if (paymentsOnly) return (<Card className="p-5"><h3 className="font-bold mb-3">Payment history</h3>
    {paid ? <p className="text-sm">✅ {bill.no} · {inr(bill.total)} · {method} · <button className="text-blue-600 font-bold" onClick={() => setShowReceipt(true)}>View receipt</button></p> : <p className="text-sm text-slate-400">No payments yet (demo).</p>}
    {showReceipt && <Receipt bill={bill} method={method} onClose={() => setShowReceipt(false)} toast={toast}/>}</Card>);
  return (<div className="space-y-4"><Card className="p-5">
    <div className="flex flex-wrap gap-2 items-center"><h3 className="font-bold">Electricity bill — {bill.no}</h3><Chip className="bg-amber-100 text-amber-800">DEMO ESTIMATE · NOT A REAL UGVCL BILL</Chip>
    <span className="ml-auto">{paid ? <Chip className="bg-emerald-100 text-emerald-800">PAID (demo)</Chip> : <Chip className="bg-red-100 text-red-800">UNPAID</Chip>}</span></div>
    <div className="grid sm:grid-cols-3 gap-3 my-4 text-sm"><div><p className="text-slate-400 text-xs">Units (estimated)</p><p className="text-xl font-extrabold">{bill.units} kWh</p></div>
    <div><p className="text-slate-400 text-xs">Consumer</p><p className="font-semibold">{src.applicant_name}</p></div><div><p className="text-slate-400 text-xs">Amount</p><p className="text-xl font-extrabold">{inr(bill.total)}</p></div></div>
    <table className="w-full text-sm"><thead><tr className="text-left text-slate-400"><th className="py-1">Slab</th><th>Units</th><th>Rate</th><th>Amount</th></tr></thead>
    <tbody>{bill.slabs.map(([s,u,r]) => <tr key={s} className="border-t border-slate-100 dark:border-slate-800"><td className="py-1.5">{s}</td><td>{u}</td><td>₹{r.toFixed(2)}</td><td>{inr(u*r)}</td></tr>)}
    <tr className="border-t"><td>Fixed charges</td><td>—</td><td>—</td><td>{inr(bill.fixed)}</td></tr><tr><td>Electricity duty (10%)</td><td>—</td><td>—</td><td>{inr(bill.duty)}</td></tr></tbody></table>
    <p className="text-xs text-slate-400 mt-3">Formula is illustrative (load × ~110 h). Real tariff/billing integration is roadmap.</p>
    {!paid && <button className="mt-4 bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-bold" onClick={() => setShowPay(true)}>Pay now (demo)</button>}
    {paid && <button className="mt-4 border rounded-lg px-4 py-2 text-sm font-bold" onClick={() => setShowReceipt(true)}>View receipt</button>}</Card>
    {showPay && <div className="fixed inset-0 z-[80] bg-black/50 grid place-items-center px-4"><Card className="p-6 w-full max-w-sm">
      <h3 className="font-bold">Pay {inr(bill.total)} (demo)</h3><div className="space-y-2 my-4">{['UPI / BHIM','Net Banking','Debit Card','Bill Desk Counter'].map(m => <label key={m} className="flex gap-2 text-sm items-center"><input type="radio" checked={method===m} onChange={() => setMethod(m)}/>{m}</label>)}</div>
      <div className="flex gap-2"><button className="flex-1 bg-teal-600 text-white rounded-lg py-2 font-bold" onClick={pay}>Authorize & pay</button><button className="flex-1 border rounded-lg py-2" onClick={() => setShowPay(false)}>Cancel</button></div></Card></div>}
    {showReceipt && <Receipt bill={bill} method={method} onClose={() => setShowReceipt(false)} toast={toast}/>}
  </div>);
}
function Receipt({ bill, method, onClose, toast }) {
  return (<div className="fixed inset-0 z-[80] bg-black/50 grid place-items-center px-4"><Card className="p-6 w-full max-w-sm">
    <h3 className="font-bold">🧾 Payment receipt (demo)</h3><dl className="text-sm space-y-2 my-4">{[['Bill',bill.no],['Method',method],['Amount',inr(bill.total)],['Reference','TXN-DEMO-' + bill.no],['Status','Successful (simulated)']].map(([k,v]) => <div key={k} className="flex justify-between"><dt className="text-slate-400">{k}</dt><dd className="font-mono font-semibold">{v}</dd></div>)}</dl>
    <div className="flex gap-2"><button className="flex-1 bg-blue-600 text-white rounded-lg py-2 text-sm font-bold" onClick={() => { window.print(); toast('Use your browser dialog to save/print this receipt'); }}>Print</button><button className="flex-1 border rounded-lg py-2 text-sm" onClick={onClose}>Close</button></div></Card></div>);
}

/* Consumer + officer complaint desk (real requests API) */
const COMPLAINT_TYPES = ['Power Outage','Voltage Fluctuation','Meter Fault','Billing Dispute','Sparking / Hazardous Wire','Streetlight Failure'];
export function ComplaintPanel({ requests, onSubmit, onOpen, staff = false }) {
  const [f, setF] = useState({ category:'Power Outage', description:'No power since morning in our street', zone:'North' });
  const list = requests.filter(r => r.request_type !== 'new_connection');
  return (<div className="grid lg:grid-cols-5 gap-4">
    {!staff && <Card className="p-5 lg:col-span-2"><h3 className="font-bold mb-3">Register a complaint</h3>
      <div className="space-y-3"><Field label="Category"><select className={inputCls} value={f.category} onChange={e => setF({...f, category:e.target.value})}>{COMPLAINT_TYPES.map(c => <option key={c}>{c}</option>)}</select></Field>
      <Field label="Describe the problem (ML classifier reads this)"><textarea className={inputCls} rows={3} value={f.description} onChange={e => setF({...f, description:e.target.value})}/></Field>
      <Field label="Zone"><select className={inputCls} value={f.zone} onChange={e => setF({...f, zone:e.target.value})}><option>North</option><option>South</option></select></Field>
      <button className="w-full bg-red-600 text-white rounded-lg py-2 font-bold text-sm" onClick={() => onSubmit(f)}>Submit complaint</button>
      <p className="text-xs text-slate-400">Real flow: the classifier sets category/severity, the workflow routes it to an officer + engineer with an SLA clock.</p></div></Card>}
    <Card className={`p-5 ${staff ? 'lg:col-span-5' : 'lg:col-span-3'}`}><h3 className="font-bold mb-3">{staff ? 'Complaint queue' : 'My complaints'} ({list.length})</h3>
      <div className="divide-y divide-slate-100 dark:divide-slate-800">{list.map(r => <button key={r.id} onClick={() => onOpen(r)} className="w-full text-left py-3 flex gap-3 items-center">
        <span className="text-xl">{r.severity==='CRITICAL' ? '🚨' : r.category==='OUTAGE' ? '🔌' : '⚠️'}</span>
        <span className="min-w-0"><span className="block font-semibold text-sm truncate">{r.description || r.category}</span><span className="block text-xs text-slate-400">{r.category} · {r.severity} · {r.status} · due {fmtDate(r.sla_due_at)}</span></span>
        <span className="ml-auto"><RiskChip value={r.sla_breach_risk}/></span></button>)}
      {!list.length && <p className="text-sm text-slate-400 py-3">No complaints filed yet.</p>}</div></Card></div>);
}

export function NotificationsPanel({ items, readIds, onRead, onReadAll }) {
  return (<Card className="p-5"><div className="flex items-center gap-3"><h3 className="font-bold">Notifications</h3>
    <button className="ml-auto text-sm font-bold text-blue-600" onClick={onReadAll}>Mark all read</button></div>
    <div className="divide-y divide-slate-100 dark:divide-slate-800 mt-2">{items.map(n => <button key={n.id} onClick={() => onRead(n.id)} className="w-full text-left py-3 flex gap-3">
      <span>{n.icon}</span><span><span className={`block text-sm ${readIds.includes(n.id) ? 'text-slate-400' : 'font-semibold'}`}>{n.text}</span><span className="block text-xs text-slate-400">{n.time}</span></span>
      {!readIds.includes(n.id) && <span className="ml-auto w-2.5 h-2.5 rounded-full bg-blue-600 mt-1.5"/>}</button>)}
    {!items.length && <p className="text-sm text-slate-400 py-3">No notifications.</p>}</div></Card>);
}

export function ProfilePanel({ user, requests }) {
  const mine = requests;
  return (<div className="grid md:grid-cols-2 gap-4"><Card className="p-6"><div className="w-14 h-14 rounded-2xl bg-blue-600 text-white grid place-items-center text-xl font-extrabold">{user.name.slice(0,1)}</div>
    <h3 className="font-bold text-lg mt-3">{user.name}</h3><dl className="text-sm space-y-2 mt-3">{[['Role', user.role],['Zone / subdivision', user.zone],['User ID', user.user_id || user.id || '—'],['Session', 'JWT (demo credentials)']].map(([k,v]) => <div key={k} className="flex justify-between gap-3"><dt className="text-slate-400">{k}</dt><dd className="font-medium capitalize text-right">{v}</dd></div>)}</dl></Card>
    <Card className="p-6"><h3 className="font-bold mb-3">My activity</h3><div className="grid grid-cols-3 gap-3 text-center">{[['Requests', mine.length],['Completed', mine.filter(r => r.status==='COMPLETED').length],['Open', mine.filter(r => !['COMPLETED','REJECTED'].includes(r.status)).length]].map(([k,v]) => <div key={k} className="rounded-xl bg-slate-50 dark:bg-slate-900 p-3"><p className="text-xl font-extrabold">{v}</p><p className="text-xs text-slate-400">{k}</p></div>)}</div>
    <p className="text-xs text-slate-400 mt-4">KYC documents, multiple connections per consumer and profile editing are roadmap (master-data management).</p></Card></div>);
}

export function LedgerPanel({ requests, onOpen }) {
  const groups = useMemo(() => { const g = {}; requests.forEach(r => { const k = r.phone || r.applicant_name; (g[k] ||= []).push(r); }); return Object.entries(g); }, [requests]);
  return (<Card className="p-5"><h3 className="font-bold mb-1">Consumer ledger</h3><p className="text-xs text-slate-400 mb-3">Derived live from the requests database (grouped by phone) — the full consumer master is roadmap MDM.</p>
    <div className="overflow-x-auto"><table className="w-full text-sm min-w-[640px]"><thead><tr className="text-left text-slate-400"><th className="p-2">Consumer</th><th>Phone</th><th>Cases</th><th>Open</th><th>Total load</th><th>Latest</th></tr></thead>
    <tbody>{groups.map(([phone, rs]) => <tr key={phone} className="border-t border-slate-100 dark:border-slate-800 cursor-pointer" onClick={() => onOpen(rs[0])}><td className="p-2 font-medium">{rs[0].applicant_name}</td><td className="font-mono text-xs">{phone}</td><td>{rs.length}</td><td>{rs.filter(r => !['COMPLETED','REJECTED'].includes(r.status)).length}</td><td>{rs.reduce((s,r) => s + r.requested_load_kw, 0)} kW</td><td className="text-xs">{fmtDate(rs[0].created_at)}</td></tr>)}</tbody></table></div></Card>);
}

export function ApprovalsPanel({ requests, onOpen, onApprove, onReject }) {
  const pending = requests.filter(r => ['ASSIGNED','FIELD_VERIFIED','ROUTED','IN_PROGRESS'].includes(r.status));
  return (<Card className="p-5"><h3 className="font-bold mb-3">Approval center ({pending.length} awaiting decision)</h3>
    {pending.map(r => <div key={r.id} className="flex flex-wrap items-center gap-3 py-3 border-b border-slate-100 dark:border-slate-800">
      <button className="text-left min-w-0" onClick={() => onOpen(r)}><span className="block font-semibold text-sm truncate">{r.applicant_name} · {r.requested_load_kw} kW</span><span className="block text-xs text-slate-400">{r.category} · {r.severity} · {r.status}</span></button>
      <span className="ml-auto flex items-center gap-2"><RiskChip value={r.sla_breach_risk}/><button className="bg-teal-600 text-white rounded-lg px-3 py-1.5 text-sm font-bold" onClick={() => onApprove(r)}>Approve</button><button className="bg-red-600 text-white rounded-lg px-3 py-1.5 text-sm font-bold" onClick={() => onReject(r)}>Reject</button></span></div>)}
    {!pending.length && <p className="text-sm text-slate-400">Nothing awaiting approval. 🎉</p>}</Card>);
}

export function CoordinationPanel({ requests }) {
  const [notes, setNotes] = useState(() => localStorage.getItem('vidyutos_coord_notes') || 'Metering squad: prioritise high-load (≥10 kW) verifications this week.');
  const open = requests.filter(r => !['COMPLETED','REJECTED'].includes(r.status));
  const depts = [['Metering & Testing Squad', requests.filter(r => r.requested_load_kw >= 10).length + ' high-load verification(s) in queue'],['Civil & Pole Erection', open.filter(r => r.zone==='South').length + ' open South-zone case(s)'],['Line Squad (Emergency)', requests.filter(r => r.severity==='CRITICAL').length + ' critical case(s) on standby'],['Billing Desk', requests.filter(r => r.status==='NEEDS_CORRECTION').length + ' correction(s) awaiting consumer']];
  return (<div className="grid md:grid-cols-2 gap-4">{depts.map(([name, sub]) => <Card key={name} className="p-5"><h3 className="font-bold text-sm">🏢 {name}</h3><p className="text-sm text-slate-400 mt-1">{sub}</p><p className="text-xs mt-3"><Chip className="bg-teal-50 text-teal-700 dark:bg-teal-950">Coordinated via shared case record</Chip></p></Card>)}
    <Card className="p-5 md:col-span-2"><h3 className="font-bold text-sm mb-2">Coordination notes (saved on this device)</h3>
    <textarea className={inputCls} rows={3} value={notes} onChange={e => { setNotes(e.target.value); localStorage.setItem('vidyutos_coord_notes', e.target.value); }}/>
    <p className="text-xs text-slate-400 mt-2">Shared inter-department requisition workflow (with SLAs per desk) is roadmap; today every desk reads the same case record — Enter Once, Use Everywhere.</p></Card></div>);
}

export function ReportsPanel({ requests, kpis, logs, toast }) {
  const exportRequests = () => { downloadCsv('vidyutos-requests.csv', [['id','applicant','phone','zone','tariff','load_kw','category','severity','status','sla_risk','sla_due','created'], ...requests.map(r => [r.id, r.applicant_name, r.phone, r.zone, r.tariff_category, r.requested_load_kw, r.category, r.severity, r.status, r.sla_breach_risk, r.sla_due_at, r.created_at])]); toast('Requests CSV exported (real data)'); };
  const exportAudit = () => { downloadCsv('vidyutos-audit.csv', [['time','actor_role','action','detail'], ...logs.map(l => [l.created_at, l.actor_role, l.action, l.detail])]); toast('Audit CSV exported (real data)'); };
  return (<div className="space-y-4"><div className="grid sm:grid-cols-3 gap-3">{[['Requests', requests.length],['Completed', requests.filter(r => r.status==='COMPLETED').length],['Audit entries', logs.length]].map(([k,v]) => <Card key={k} className="p-4 text-center"><p className="text-2xl font-extrabold">{v}</p><p className="text-xs text-slate-400">{k}</p></Card>)}</div>
    <Card className="p-5"><h3 className="font-bold mb-2">Exports (generated in your browser from live API data)</h3><div className="flex flex-wrap gap-2">
    <button className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-bold" onClick={exportRequests}>⬇ Requests CSV</button>
    <button className="bg-slate-800 text-white rounded-lg px-4 py-2 text-sm font-bold" onClick={exportAudit}>⬇ Audit CSV</button>
    <button className="border rounded-lg px-4 py-2 text-sm font-bold" onClick={() => window.print()}>🖨 Print this view</button></div>
    {kpis && <div className="mt-4"><Bars data={kpis.by_status || {}}/></div>}<p className="text-xs text-slate-400 mt-3">Scheduled PDF executive reports & email delivery are roadmap.</p></Card></div>);
}

export function SLAPanel({ requests, onOpen }) {
  const open = [...requests.filter(r => !['COMPLETED','REJECTED'].includes(r.status))].sort((a,b) => new Date(a.sla_due_at) - new Date(b.sla_due_at));
  return (<Card className="p-5"><h3 className="font-bold mb-3">SLA redressal — open cases by deadline ({open.length})</h3>
    {open.map(r => <button key={r.id} onClick={() => onOpen(r)} className="w-full text-left py-3 flex flex-wrap gap-2 items-center border-b border-slate-100 dark:border-slate-800">
      <span className="font-semibold text-sm">{r.applicant_name}</span><StatusChip status={r.status}/><RiskChip value={r.sla_breach_risk}/>
      <span className={`ml-auto text-xs font-bold ${isOverdue(r) ? 'text-red-600' : 'text-slate-400'}`}>{isOverdue(r) ? '⏰ OVERDUE · ' : ''}due {fmtDate(r.sla_due_at)}</span></button>)}
    {!open.length && <p className="text-sm text-slate-400">No open cases.</p>}</Card>);
}

export function SystemPanel({ status }) {
  if (!status) return <Card className="p-6 text-sm text-slate-400">Loading system status… (officer/admin only)</Card>;
  return (<div className="space-y-4"><div className="grid sm:grid-cols-4 gap-3">{[['API', status.status],['Database', status.database.dialect],['Users', status.counts.users],['Audit entries', status.counts.audit_logs]].map(([k,v]) => <Card key={k} className="p-4 text-center"><p className="text-lg font-extrabold capitalize">{v}</p><p className="text-xs text-slate-400">{k}</p></Card>)}</div>
    <Card className="p-5"><h3 className="font-bold mb-3">Service status (live checks)</h3>{status.services.map(s => <div key={s.name} className="flex items-center gap-3 py-2.5 border-b border-slate-100 dark:border-slate-800 text-sm"><span>{s.name}</span><span className="ml-auto"><Chip className={s.status==='Operational' ? 'bg-emerald-100 text-emerald-800' : s.status.startsWith('Simulated') ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}>{s.status}</Chip></span></div>)}
    <p className="text-xs text-slate-400 mt-3">Policy documents indexed: {status.assistant.policy_documents} · Process uptime (this server run): {status.process_uptime_seconds}s · No invented 90-day uptime — measured monitoring is roadmap (Prometheus).</p></Card></div>);
}

export function UsersPanel({ users }) {
  return (<Card className="p-5"><h3 className="font-bold mb-3">Users & roles ({users.length}) — live from the database</h3>
    <div className="overflow-x-auto"><table className="w-full text-sm min-w-[560px]"><thead><tr className="text-left text-slate-400"><th className="p-2">Name</th><th>Email</th><th>Role</th><th>Zone</th><th>Status</th></tr></thead>
    <tbody>{users.map(u => <tr key={u.id} className="border-t border-slate-100 dark:border-slate-800"><td className="p-2 font-medium">{u.name}</td><td className="font-mono text-xs">{u.email}</td><td className="capitalize">{u.role}</td><td>{u.zone}</td><td>{u.is_active ? 'Active' : 'Disabled'}</td></tr>)}</tbody></table></div>
    <p className="text-xs text-slate-400 mt-3">Creating/disabling users from this screen (with forced password change) is roadmap; registration exists via <span className="font-mono">POST /auth/register</span>.</p></Card>);
}

const ACCESS = [['Submit new connection / complaint',1,0,0,0],['View own cases & bills',1,0,0,0],['Approve / reject cases',0,1,0,1],['Field inspection + offline sync',0,0,1,1],['Executive KPIs & exports',0,1,0,1],['Audit log',0,1,0,1],['User directory & system status',0,0,0,1]];
export function AccessPanel() {
  return (<Card className="p-5"><h3 className="font-bold mb-3">RBAC access matrix (as enforced by the API)</h3>
    <div className="overflow-x-auto"><table className="w-full text-sm min-w-[560px]"><thead><tr className="text-left text-slate-400"><th className="p-2">Capability</th><th>Consumer</th><th>Officer</th><th>Engineer</th><th>Admin</th></tr></thead>
    <tbody>{ACCESS.map(([cap,...v]) => <tr key={cap} className="border-t border-slate-100 dark:border-slate-800"><td className="p-2">{cap}</td>{v.map((x,i) => <td key={i}>{x ? '✅' : '—'}</td>)}</tr>)}</tbody></table></div>
    <p className="text-xs text-slate-400 mt-3">Plus assignment-level rules: an engineer can only sync/update cases assigned to them (403 tested).</p></Card>);
}

export function SettingsPanel({ dark, setDark, airplane, setAirplane, onReplayIntro, toast }) {
  const [saved, setSaved] = useState(false);
  return (<Card className="p-6 max-w-xl"><h3 className="font-bold mb-4">System settings (this device)</h3>
    {[['Dark mode', dark, setDark],['Start in airplane-mode simulation', airplane, setAirplane]].map(([label, val, set]) => (
      <label key={label} className="flex items-center gap-3 py-3 border-b border-slate-100 dark:border-slate-800 text-sm"><span>{label}</span>
      <input type="checkbox" className="ml-auto w-5 h-5" checked={val} onChange={e => set(e.target.checked)}/></label>))}
    <button className="mt-4 border rounded-lg px-4 py-2 text-sm font-bold" onClick={onReplayIntro}>↺ Replay welcome intro</button>
    <button className="mt-4 ml-2 bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-bold" onClick={() => { setSaved(true); toast('Settings saved on this device'); }}>Save settings</button>
    {saved && <p className="text-xs text-teal-600 mt-2">Saved locally. Server-side organisation settings (SLA hours, routing rules) are roadmap configuration, not device toggles.</p>}
    <p className="text-xs text-slate-400 mt-4">SLA hours today: CRITICAL 24 · HIGH 48 · MEDIUM 72 · LOW 120 (in <span className="font-mono">backend/app/workflow.py</span>).</p></Card>);
}
