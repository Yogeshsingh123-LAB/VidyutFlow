import { useState } from 'react';
import { Card, Field, inputCls, RiskChip, StatusChip } from './ui';
import { fmtDate } from '../lib/format';

export function RequestTable({ rows, onOpen }) {
  const [q, setQ] = useState(''); const [status, setStatus] = useState('ALL'); const [risk, setRisk] = useState('ALL'); const [sort, setSort] = useState('new');
  let list = rows.filter(r => (!q || `${r.applicant_name} ${r.category} ${r.zone} ${r.id}`.toLowerCase().includes(q.toLowerCase())) && (status==='ALL'||r.status===status) && (risk==='ALL'||(risk==='HIGH'?r.sla_breach_risk>=.7:risk==='WATCH'?r.sla_breach_risk>=.4&&r.sla_breach_risk<.7:r.sla_breach_risk<.4)));
  list = [...list].sort((a,b)=> sort==='risk' ? b.sla_breach_risk-a.sla_breach_risk : new Date(b.created_at)-new Date(a.created_at));
  return (<Card className="overflow-hidden"><div className="flex flex-wrap gap-2 p-4 border-b border-slate-100 dark:border-slate-800">
      <input className={`${inputCls} sm:w-64`} placeholder="Search applicant, category, zone…" value={q} onChange={e=>setQ(e.target.value)}/>
      <select className="rounded-lg border px-2 py-2 text-sm dark:bg-[#0B1120]" value={status} onChange={e=>setStatus(e.target.value)}><option>ALL</option>{[...new Set(rows.map(r=>r.status))].map(s=><option key={s}>{s}</option>)}</select>
      <select className="rounded-lg border px-2 py-2 text-sm dark:bg-[#0B1120]" value={risk} onChange={e=>setRisk(e.target.value)}><option value="ALL">All risk</option><option value="HIGH">High ≥0.7</option><option value="WATCH">Watch 0.4–0.7</option><option value="LOW">Low &lt;0.4</option></select>
      <select className="rounded-lg border px-2 py-2 text-sm dark:bg-[#0B1120]" value={sort} onChange={e=>setSort(e.target.value)}><option value="new">Newest first</option><option value="risk">SLA risk first</option></select>
      <span className="ml-auto text-sm text-slate-400 self-center">{list.length} shown</span></div>
    <div className="overflow-x-auto"><table className="w-full text-sm min-w-[820px]"><thead><tr className="text-left text-slate-400 border-b border-slate-100 dark:border-slate-800"><th className="p-3">Applicant</th><th>Tariff / Load</th><th>ML class</th><th>Status</th><th>SLA risk</th><th>Due</th></tr></thead>
    <tbody>{list.map(r=><tr key={r.id} onClick={()=>onOpen(r)} className="border-b border-slate-50 dark:border-slate-800/60 cursor-pointer hover:bg-blue-50/60 dark:hover:bg-white/5">
      <td className="p-3 font-medium">{r.applicant_name}<span className="block text-xs text-slate-400 font-mono">{r.id.slice(0,8)} · {r.zone}</span></td>
      <td>{r.tariff_category}<span className="block text-xs text-slate-400">{r.requested_load_kw} kW · {r.phase}</span></td>
      <td>{r.category}<span className="block text-xs text-slate-400">{r.severity} · {r.priority}</span></td>
      <td><StatusChip status={r.status}/></td><td><RiskChip value={r.sla_breach_risk}/></td><td className="text-xs">{fmtDate(r.sla_due_at)}</td></tr>)}</tbody></table>
    {!list.length && <p className="p-6 text-sm text-slate-400">No requests match these filters.</p>}</div></Card>);
}

const TARIFFS = ['Residential (RGPU)','Commercial (NRGP)','Industrial (LTMD)','Agricultural (AG)'];
export function NewConnectionWizard({ onSubmit }) {
  const [step, setStep] = useState(1); const [file, setFile] = useState(null);
  const [f, setF] = useState({ applicant_name:'Demo Consumer', phone:'9876543210', address:'Plot 12, Mehsana, Gujarat', zone:'North', pin_code:'384002', request_type:'new_connection', description:'need new electricity connection for my home', requested_load_kw:3, tariff_category:TARIFFS[0], phase:'1-Phase', premises_type:'Owned' });
  const set = (k,v)=>setF(s=>({...s,[k]:v, ...(k==='requested_load_kw' ? { phase: Number(v)>=10 ? '3-Phase':'1-Phase' } : {})}));
  const steps = ['Applicant & premises','Load & document','Review & submit'];
  return (<Card className="p-5"><ol className="flex flex-wrap gap-2 mb-5">{steps.map((s,i)=><li key={s} className={`rounded-full px-3 py-1.5 text-xs font-bold ${step===i+1?'bg-blue-600 text-white':'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>{i+1}. {s}</li>)}</ol>
    {step===1 && <div className="grid md:grid-cols-2 gap-4">
      <Field label="Applicant name"><input className={inputCls} value={f.applicant_name} onChange={e=>set('applicant_name',e.target.value)}/></Field>
      <Field label="Phone (10-digit)"><input className={inputCls} value={f.phone} onChange={e=>set('phone',e.target.value)}/></Field>
      <Field label="Address"><input className={inputCls} value={f.address} onChange={e=>set('address',e.target.value)}/></Field>
      <Field label="Zone / Subdivision"><select className={inputCls} value={f.zone} onChange={e=>set('zone',e.target.value)}><option>North</option><option>South</option></select></Field>
      <Field label="PIN code"><input className={inputCls} value={f.pin_code} onChange={e=>set('pin_code',e.target.value)}/></Field>
      <Field label="Premises type"><select className={inputCls} value={f.premises_type} onChange={e=>set('premises_type',e.target.value)}><option>Owned</option><option>Rented</option><option>Government Leased</option></select></Field></div>}
    {step===2 && <div className="grid md:grid-cols-2 gap-4">
      <Field label="Tariff category"><select className={inputCls} value={f.tariff_category} onChange={e=>set('tariff_category',e.target.value)}>{TARIFFS.map(t=><option key={t}>{t}</option>)}</select></Field>
      <Field label="Requested load (kW)"><input type="number" min="0.5" step="0.5" className={inputCls} value={f.requested_load_kw} onChange={e=>set('requested_load_kw',e.target.value)}/></Field>
      <Field label="Phase (auto: ≥10 kW → 3-Phase)"><select className={inputCls} value={f.phase} onChange={e=>set('phase',e.target.value)}><option>1-Phase</option><option>3-Phase</option></select></Field>
      <Field label="Describe the need (ML classifier reads this)"><input className={inputCls} value={f.description} onChange={e=>set('description',e.target.value)}/></Field>
      <Field label="Identity / address proof (required)"><input type="file" className={inputCls} onChange={e=>setFile(e.target.files[0])}/></Field></div>}
    {step===3 && <div className="text-sm space-y-2"><p className="font-bold">Review — this single entry will be reused by officer, engineer and admin (Enter Once, Use Everywhere).</p>
      <pre className="rounded-xl bg-slate-50 dark:bg-slate-900 p-4 overflow-auto text-xs">{JSON.stringify({...f, document:file?.name||'—'},null,2)}</pre>
      {!file && <p className="text-amber-600 text-xs font-semibold">No document selected — the workflow will mark this NEEDS_CORRECTION, which is also a valid demo path.</p>}</div>}
    <div className="flex gap-2 mt-5">{step>1 && <button className="px-4 py-2 rounded-lg border" onClick={()=>setStep(s=>s-1)}>Back</button>}
      {step<3 ? <button className="px-4 py-2 rounded-lg bg-blue-600 text-white" onClick={()=>setStep(s=>s+1)}>Continue</button>
      : <button className="px-4 py-2 rounded-lg bg-teal-600 text-white font-bold" onClick={()=>onSubmit(f,file)}>Submit request</button>}</div></Card>);
}

export function AssistantPanel({ chat, question, setQuestion, onAsk, compact=false }) {
  return (<Card className="p-5"><h2 className="font-bold flex items-center gap-2">🤖 AI Assistant <span className="text-[11px] font-semibold rounded-full bg-teal-50 dark:bg-teal-950 text-teal-700 dark:text-teal-200 px-2 py-0.5">Policy RAG + live data · no external LLM</span></h2>
    <div className="flex flex-wrap gap-2 my-3">{['Which requests are likely to breach SLA?','What is the procedure for a new connection?','How does offline field work sync?','How many pending requests are there?'].map(q=><button key={q} onClick={()=>setQuestion(q)} className="rounded-full border px-3 py-1.5 text-xs hover:bg-slate-50 dark:hover:bg-slate-800">{q}</button>)}</div>
    <form onSubmit={onAsk} className="flex gap-2"><input className={inputCls} value={question} onChange={e=>setQuestion(e.target.value)} placeholder="Ask about SLA risk or policy…"/><button className="px-4 rounded-lg bg-blue-600 text-white text-sm font-bold">Ask</button></form>
    <div className={`space-y-4 mt-4 ${compact?'max-h-64 overflow-y-auto':''}`}>{chat.map((c,i)=><div key={i} className="rounded-xl bg-slate-50 dark:bg-slate-900 p-4 text-sm"><p className="font-bold">Q: {c.q}</p><p className="mt-1 text-slate-600 dark:text-slate-300">{c.a}</p>
      {c.data?.length>0 && <ul className="list-disc ml-5 mt-2 text-xs space-y-1">{c.data.map(d=><li key={d.id}><b>{d.applicant}</b> — risk {d.sla_breach_risk}: {d.reasons.join('; ')}</li>)}</ul>}
      {c.sources?.length>0 && <p className="text-[11px] text-slate-400 mt-2">Policy sources: {c.sources.join(', ')}</p>}</div>)}
    {!chat.length && <p className="text-sm text-slate-400">Try one of the suggested questions.</p>}</div></Card>);
}

// Clearly-labelled simulated feeder panel (roadmap: real SCADA feeds)
export const SIM_FEEDERS = [
  { name:'Mehsana North F-11', util:62, status:'Optimal' }, { name:'Visnagar F-07', util:84, status:'Warning' },
  { name:'Kadi F-03', util:93, status:'Critical Overload' }, { name:'Unjha F-09', util:48, status:'Optimal' }];
export function FeederPanel() {
  return (<Card className="p-5"><div className="flex items-center justify-between"><h3 className="font-bold">Feeder health</h3><span className="text-[11px] font-bold rounded bg-amber-100 text-amber-800 px-2 py-1">SIMULATED — not SCADA</span></div>
    <div className="grid sm:grid-cols-2 gap-3 mt-3">{SIM_FEEDERS.map(f=><div key={f.name} className="rounded-xl border border-slate-100 dark:border-slate-800 p-3">
      <p className="text-sm font-semibold">{f.name}</p><div className="h-2 rounded bg-slate-100 dark:bg-slate-800 mt-2 overflow-hidden"><span className={`block h-full ${f.util>90?'bg-red-500':f.util>75?'bg-amber-500':'bg-teal-500'}`} style={{width:`${f.util}%`}}/></div>
      <p className="text-xs text-slate-400 mt-1.5">{f.util}% utilised · {f.status}</p></div>)}</div>
    <p className="text-xs text-slate-400 mt-3">Real feeder/SCADA integration is roadmap only.</p></Card>);
}
