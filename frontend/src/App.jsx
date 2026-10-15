import { useCallback, useEffect, useMemo, useState } from 'react';
import { ClipboardList, CheckCircle2, AlertTriangle, FileWarning, Gauge, HardHat, PlusCircle } from 'lucide-react';
import { api, json, token } from './api';
import { Shell, CommandPalette } from './components/Shell';
import { Card, StatCard, Bars, WorkflowStepper, Toasts } from './components/ui';
import { RequestTable, NewConnectionWizard, AssistantPanel, FeederPanel } from './components/panels';
import { RequestDrawer } from './components/RequestDrawer';
import { fmtDate } from './lib/format';

const ROLES = [
  { role:'consumer', label:'Consumer', desc:'Apply, upload docs & track status', email:'consumer@vidyut.local', pw:'Consumer@123', icon:'🏠' },
  { role:'officer', label:'Officer / Employee', desc:'Verify, approve & manage SLA queue', email:'officer@vidyut.local', pw:'Officer@123', icon:'🗂️' },
  { role:'engineer', label:'Field Engineer', desc:'Site inspection & offline field work', email:'engineer@vidyut.local', pw:'Engineer@123', icon:'👷' },
  { role:'admin', label:'Admin / Management', desc:'Executive KPIs, audit & system view', email:'admin@vidyut.local', pw:'Admin@123', icon:'📊' }];
const QUEUE_KEY = 'vidyutos_offline_queue';
const loadQueue = () => { try { return JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]'); } catch { return []; } };
const saveQueue = q => localStorage.setItem(QUEUE_KEY, JSON.stringify(q));

export default function App() {
  const [user, setUser] = useState(null); const [tab, setTab] = useState('dashboard');
  const [email, setEmail] = useState(ROLES[0].email); const [password, setPassword] = useState(ROLES[0].pw);
  const [requests, setRequests] = useState([]); const [kpis, setKpis] = useState(null); const [logs, setLogs] = useState([]); const [metrics, setMetrics] = useState(null);
  const [queue, setQueue] = useState(loadQueue); const [airplane, setAirplane] = useState(false); const [online, setOnline] = useState(navigator.onLine);
  const [dark, setDark] = useState(() => localStorage.getItem('vidyutos_theme') === 'dark');
  const [toasts, setToasts] = useState([]); const [selected, setSelected] = useState(null);
  const [palette, setPalette] = useState(false); const [chat, setChat] = useState([]); const [question, setQuestion] = useState('Which requests are likely to breach SLA?');
  const [meter, setMeter] = useState({}); // per-request field inspection inputs
  const offline = airplane || !online;

  const toast = useCallback((text, tone='ok') => { const id = Date.now()+Math.random(); setToasts(t=>[...t,{id,text,tone}]); setTimeout(()=>setToasts(t=>t.filter(x=>x.id!==id)), 4200); },[]);
  useEffect(()=>{ document.documentElement.classList.toggle('dark', dark); localStorage.setItem('vidyutos_theme', dark?'dark':'light'); },[dark]);
  useEffect(()=>{ const h=e=>{ if((e.ctrlKey||e.metaKey) && e.key.toLowerCase()==='k'){ e.preventDefault(); setPalette(p=>!p);} }; window.addEventListener('keydown',h); return ()=>window.removeEventListener('keydown',h); },[]);

  const refresh = useCallback(async () => { if (!token()) return;
    try { const [r,k,m] = await Promise.all([api('/requests'), api('/requests/kpis/summary'), api('/assistant/ml-metrics')]); setRequests(r); setKpis(k); setMetrics(m);
      if (user && (user.role==='officer'||user.role==='admin')) setLogs(await api('/requests/audit/logs')); } catch(e){ toast(e.message,'error'); } },[user, toast]);
  useEffect(()=>{ refresh(); },[user]); // eslint-disable-line
  useEffect(()=>{ const on=()=>setOnline(true), off=()=>setOnline(false); window.addEventListener('online',on); window.addEventListener('offline',off);
    return ()=>{ window.removeEventListener('online',on); window.removeEventListener('offline',off); }; },[]);
  useEffect(()=>{ if (online && !airplane && queue.length && user) syncQueue(); },[online, airplane]); // eslint-disable-line

  async function login(e){ e?.preventDefault();
    try { const r = await fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({username:email,password})});
      if(!r.ok) throw new Error(await r.text()); const d = await r.json(); localStorage.setItem('vidyutos_token', d.access_token); setUser(d); setTab('dashboard'); toast(`Welcome, ${d.name} (${d.role})`); }
    catch(err){ toast('Login failed — check the demo credentials.','error'); } }

  async function submit(form, file){ try { const fd=new FormData(); Object.entries(form).forEach(([k,v])=>fd.append(k,v)); if(file) fd.append('document',file);
      const r=await fetch('/api/requests/with-document',{method:'POST',headers:{Authorization:`Bearer ${token()}`},body:fd}); if(!r.ok) throw new Error(await r.text()); const d=await r.json();
      toast(`Submitted → ${d.status} · ${d.category}/${d.severity} · SLA risk ${d.sla_breach_risk}`); setSelected(d); setTab('requests'); refresh(); } catch(e){ toast('Submit failed: '+e.message,'error'); } }

  async function setStatus(req,status){ try{ await api(`/requests/${req.id}/status`, json('PATCH',{status})); toast(`Case ${req.id.slice(0,8)} → ${status}`); setSelected(s=>s?{...s,status}:s); refresh(); }catch(e){ toast(e.message,'error'); } }

  async function completeTask(req){ const insp = meter[req.id]||{};
    const item={ client_uuid:crypto.randomUUID(), request_id:req.id, task_status:'COMPLETED', notes:insp.notes||'Site verified, meter installed, seal intact', meter_serial:insp.serial||('MTR-'+Math.floor(Math.random()*9000+1000)), created_offline_at:new Date().toISOString() };
    if (offline){ const q=[...loadQueue(),item]; saveQueue(q); setQueue(q); toast(`✈ Offline — inspection queued on device (${item.client_uuid.slice(0,8)}…).`,'warn'); return; }
    try{ const r=await api('/requests/field-sync', json('POST',item)); toast(r.duplicate?'Duplicate ignored — already synced':'Inspection synced to server'); refresh(); }
    catch{ const q=[...loadQueue(),item]; saveQueue(q); setQueue(q); toast('Network failed — queued for sync','warn'); } }

  async function syncQueue(){ const q=loadQueue(); if(!q.length) return toast('Offline queue is empty');
    let done=0; for(const item of q){ try{ await api('/requests/field-sync', json('POST',item)); done++; }catch{ break; } }
    const rest=q.slice(done); saveQueue(rest); setQueue(rest); toast(`Synced ${done} queued entr${done===1?'y':'ies'} · ${rest.length} remaining · UUID de-duplication prevents duplicates`); refresh(); }

  async function ask(e){ e?.preventDefault(); if(!question.trim()) return;
    try{ const r=await api('/assistant/chat', json('POST',{question})); setChat(c=>[...c,{q:question,a:r.answer,data:r.data||[],sources:r.sources||[]}]); }catch(err){ toast(err.message,'error'); } }

  const alerts = useMemo(()=>{ const a=[];
    requests.filter(r=>r.sla_breach_risk>=.7 && !['COMPLETED','REJECTED'].includes(r.status)).forEach(r=>a.push(`High SLA risk: ${r.applicant_name} (${r.sla_breach_risk})`));
    requests.filter(r=>r.status==='NEEDS_CORRECTION').forEach(r=>a.push(`Needs correction: ${r.applicant_name} — ${r.validation_notes}`));
    if(queue.length) a.push(`${queue.length} field entr${queue.length===1?'y':'ies'} waiting to sync`); return a; },[requests,queue]);
  const recent = requests.slice(0,5);
  const actions = [
    {label:'Go to Dashboard',hint:'Overview & KPIs',run:()=>setTab('dashboard')}, {label:'Go to Requests',hint:'Search, filter, open a case',run:()=>setTab('requests')},
    ...(user?.role==='consumer'?[{label:'New Connection',hint:'3-step application wizard',run:()=>setTab('new')}]:[]),
    {label:'Open AI Assistant',hint:'SLA risk & policy questions',run:()=>setTab('assistant')}, {label:'View ML Insights',hint:'Synthetic-data model report',run:()=>setTab('insights')},
    {label: airplane?'Turn airplane mode OFF':'Simulate airplane mode',hint:'Test the offline field queue',run:()=>setAirplane(a=>!a)},
    {label:`Sync offline queue (${queue.length})`,hint:'UUID de-duplicated on the server',run:syncQueue},
    {label: dark?'Switch to light mode':'Switch to dark mode',hint:'Saved on this device',run:()=>setDark(d=>!d)},
    {label:'Ask: Which requests are likely to breach SLA?',hint:'Live data query',run:()=>{setQuestion('Which requests are likely to breach SLA?'); setTab('assistant');}}];

  if (!user) return (<main className="min-h-screen bg-[#101C35] text-white">
    <div className="max-w-6xl mx-auto px-4 py-10 grid lg:grid-cols-2 gap-10 items-center min-h-screen">
      <div><div className="flex items-center gap-2 text-teal-300 font-bold">⚡ VidyutOS Lite <span className="text-xs bg-white/10 rounded-full px-2 py-1 text-slate-200">UGVCL · PS000125</span></div>
        <h1 className="text-4xl md:text-5xl font-extrabold leading-tight mt-5">Enter Once,<br/><span className="text-teal-300">Use Everywhere.</span></h1>
        <p className="text-slate-300 mt-4 max-w-md text-sm leading-6">One real end-to-end new-connection flow: FastAPI workflow, two scikit-learn models, policy-RAG assistant and an offline field app with UUID de-duplication. Synthetic demo data only.</p>
        <svg viewBox="0 0 420 90" className="mt-8 w-full max-w-md"><path d="M10 55 H130 L155 25 L185 70 L210 55 H410" fill="none" stroke="#2dd4bf" strokeWidth="2.5" className="electric-line"/><circle cx="155" cy="25" r="5" fill="#38bdf8"/><circle cx="185" cy="70" r="5" fill="#f59e0b"/><circle cx="10" cy="55" r="4" fill="#fff"/><circle cx="410" cy="55" r="4" fill="#fff"/></svg>
        <div className="grid grid-cols-3 gap-3 mt-6 max-w-md text-center">{[['Auto','routing'],['SLA-risk','ML flags'],['Offline','sync, no dupes']].map(([a,b])=><div key={b} className="rounded-xl bg-white/5 p-3"><p className="font-extrabold">{a}</p><p className="text-xs text-slate-400">{b}</p></div>)}</div></div>
      <form onSubmit={login} className="bg-white text-slate-900 rounded-3xl shadow-2xl p-6 space-y-4">
        <div><h2 className="text-xl font-extrabold">Welcome to the portal</h2><p className="text-xs text-slate-500 mt-1">Pick a role — credentials fill in automatically.</p></div>
        <div className="grid grid-cols-2 gap-2">{ROLES.map(r=><button type="button" key={r.role} onClick={()=>{setEmail(r.email); setPassword(r.pw);}} className={`text-left rounded-2xl border p-3 ${email===r.email?'border-blue-600 bg-blue-50 ring-1 ring-blue-600':'border-slate-200'}`}>
          <span className="text-xl">{r.icon}</span><span className="block font-bold text-sm mt-1">{r.label}</span><span className="block text-[11px] text-slate-500">{r.desc}</span></button>)}</div>
        <input className="w-full border rounded-xl px-3 py-2.5 text-sm" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email"/>
        <input className="w-full border rounded-xl px-3 py-2.5 text-sm" type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password"/>
        <button className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl py-2.5 font-bold">Enter platform →</button>
        <button type="button" onClick={()=>setDark(d=>!d)} className="w-full text-xs text-slate-400">Toggle {dark?'light':'dark'} mode</button></form></div>
    <Toasts toasts={toasts}/></main>);

  return (<>
    <Shell user={user} tab={tab} setTab={setTab} dark={dark} setDark={setDark} airplane={airplane} setAirplane={setAirplane} queueCount={queue.length} onSync={syncQueue} alerts={alerts}
      onLogout={()=>{localStorage.removeItem('vidyutos_token'); setUser(null);}} onCommand={()=>setPalette(true)}>
      {tab==='dashboard' && <div className="space-y-4">
        <Card className="p-5 flex flex-wrap items-center gap-4"><div><h2 className="text-lg font-extrabold">Namaste, {user.name} 🙏</h2>
          <p className="text-sm text-slate-400 capitalize">{user.role} workspace · {user.zone} zone · {offline?'Offline — entries will queue':'All systems synced'}</p></div>
          <div className="ml-auto flex gap-2">{user.role==='consumer' && <button className="flex items-center gap-1.5 bg-blue-600 text-white rounded-lg px-3 py-2 text-sm font-bold" onClick={()=>setTab('new')}><PlusCircle size={15}/>New connection</button>}
          <button className="rounded-lg bg-slate-100 dark:bg-slate-800 px-3 py-2 text-sm font-semibold" onClick={refresh}>Refresh data</button></div></Card>
        {kpis && <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <StatCard label="Total requests" value={kpis.total_requests} icon={ClipboardList}/><StatCard label="Pending" value={kpis.pending} icon={Gauge} tone="text-amber-500"/>
          <StatCard label="Completed" value={kpis.completed} icon={CheckCircle2} tone="text-teal-600"/><StatCard label="High SLA risk" value={kpis.high_sla_risk} sub={`Avg open risk ${kpis.avg_sla_risk}`} icon={AlertTriangle} tone="text-red-500"/>
          <StatCard label="Needs correction" value={kpis.needs_correction} icon={FileWarning} tone="text-red-500"/></div>}
        <div className="grid lg:grid-cols-3 gap-4">
          <Card className="p-5"><h3 className="font-bold mb-3">Requests by status</h3><Bars data={kpis?.by_status||{}}/></Card>
          <Card className="p-5"><h3 className="font-bold mb-3">By zone & category</h3><Bars data={kpis?.by_zone||{}}/><div className="mt-4"><Bars data={kpis?.by_category||{}}/></div></Card>
          <Card className="p-5"><h3 className="font-bold mb-3">SLA-risk buckets (open)</h3><Bars data={kpis?.risk_buckets||{}}/></Card></div>
        <div className="grid lg:grid-cols-5 gap-4"><Card className="p-5 lg:col-span-3"><div className="flex justify-between"><h3 className="font-bold">Recent requests</h3><button className="text-sm text-blue-600 font-semibold" onClick={()=>setTab('requests')}>View all →</button></div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">{recent.map(r=><button key={r.id} onClick={()=>setSelected(r)} className="w-full text-left py-3 flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-slate-800 grid place-items-center text-sm font-extrabold text-blue-700 dark:text-blue-300">{r.applicant_name.slice(0,1)}</span>
            <span className="min-w-0"><span className="block font-semibold text-sm truncate">{r.applicant_name}</span><span className="block text-xs text-slate-400">{r.category} · {r.status} · due {fmtDate(r.sla_due_at)}</span></span>
            <span className="ml-auto text-xs font-bold">{Number(r.sla_breach_risk).toFixed(2)}</span></button>)}{!recent.length && <p className="py-4 text-sm text-slate-400">No requests yet.</p>}</div></Card>
          <Card className="p-5 lg:col-span-2"><h3 className="font-bold mb-3">Workflow at a glance</h3><WorkflowStepper status={requests.find(r=>r.status==='ASSIGNED') ? 'ASSIGNED' : 'SUBMITTED'}/>
            <ul className="text-sm mt-4 space-y-2 text-slate-500">{alerts.length?alerts.map((a,i)=><li key={i}>⚠️ {a}</li>):<li>✅ No active alerts.</li>}</ul></Card></div>
        {(user.role==='admin') && <FeederPanel/>}
      </div>}

      {tab==='new' && <NewConnectionWizard onSubmit={submit}/>}
      {tab==='requests' && <RequestTable rows={requests} onOpen={setSelected}/>}

      {tab==='field' && <div className="space-y-4">
        <Card className="p-5 flex flex-wrap gap-3 items-center"><HardHat className="text-amber-500"/><div><h2 className="font-bold">Field Operations Console</h2>
          <p className="text-sm text-slate-400">{offline?'✈ Offline — inspections queue on this device with a UUID':'Online — inspections sync immediately'} · Queue: {queue.length}</p></div>
          <button className="ml-auto bg-teal-600 text-white rounded-lg px-4 py-2 text-sm font-bold" onClick={syncQueue}>Sync queue</button></Card>
        {requests.filter(r=>r.status!=='COMPLETED').map(r=><Card key={r.id} className="p-5">
          <div className="flex flex-wrap gap-3 items-start"><div><p className="font-bold">{r.applicant_name}</p><p className="text-xs text-slate-400">{r.address} · {r.requested_load_kw} kW · {r.tariff_category}</p></div>
          <button className="ml-auto text-sm text-blue-600 font-bold" onClick={()=>setSelected(r)}>Open case →</button></div>
          <div className="grid sm:grid-cols-2 gap-3 mt-4">
            <input className="rounded-lg border px-3 py-2 text-sm dark:bg-[#0B1120]" placeholder="Meter serial (e.g. GEN-SM-2026-9921)" value={meter[r.id]?.serial||''} onChange={e=>setMeter(m=>({...m,[r.id]:{...m[r.id],serial:e.target.value}}))}/>
            <input className="rounded-lg border px-3 py-2 text-sm dark:bg-[#0B1120]" placeholder="Inspection remarks" value={meter[r.id]?.notes||''} onChange={e=>setMeter(m=>({...m,[r.id]:{...m[r.id],notes:e.target.value}}))}/></div>
          <button className="mt-4 bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-bold" onClick={()=>completeTask(r)}>{offline?'Save inspection offline':'Submit inspection & complete'}</button></Card>)}
        {!requests.some(r=>r.status!=='COMPLETED') && <Card className="p-6 text-sm text-slate-400">No open field tasks. 🎉</Card>}
      </div>}

      {tab==='assistant' && <AssistantPanel chat={chat} question={question} setQuestion={setQuestion} onAsk={ask}/>}
      {tab==='insights' && <div className="space-y-4">
        <Card className="p-5"><h2 className="font-bold">ML models — synthetic data only</h2>
          {metrics?.category_classifier ? <div className="grid sm:grid-cols-3 gap-3 mt-4">
            {[['Complaint / fault classifier',metrics.category_classifier],['Severity classifier',metrics.severity_classifier],['SLA-breach predictor',metrics.sla_breach_predictor]].map(([name,m])=>(
              <div key={name} className="rounded-2xl bg-slate-50 dark:bg-slate-900 p-4"><p className="text-xs font-bold text-slate-400 uppercase">{name}</p>
              <p className="text-3xl font-extrabold mt-2">{(m.accuracy*100).toFixed(1)}%</p><p className="text-xs text-slate-400">accuracy vs {(m.majority_baseline*100).toFixed(1)}% majority baseline · n={m.test_size} held-out</p></div>))}
          </div> : <p className="text-sm mt-2">Loading metrics…</p>}
          <p className="text-xs text-amber-600 mt-4">⚠ {metrics?.data_notice||'Synthetic data only.'} Templated synthetic text inflates classifier accuracy — never present as UGVCL real performance.</p></Card>
        <div className="grid lg:grid-cols-2 gap-4"><Card className="p-5"><h3 className="font-bold mb-3">Requests by severity</h3><Bars data={kpis?.by_severity||{}}/></Card>
        <Card className="p-5"><h3 className="font-bold mb-2">Scale-up roadmap (not built)</h3><ul className="text-sm space-y-1.5 text-slate-500">
          {['Kafka event bus + Temporal/Camunda workflows','GraphQL, GIS outage map, WebSockets','Flutter + Couchbase/CRDT offline','Fine-tuned LLM in private VPC','Zero Trust, Vault, multi-AZ failover','Real SCADA predictive maintenance'].map(x=><li key={x}>◻️ {x}</li>)}</ul></Card></div>
        {(user.role!=='admin') && <FeederPanel/>}
      </div>}

      {tab==='audit' && <Card className="p-5"><h2 className="font-bold mb-3">Audit log</h2><ul className="text-xs space-y-2 max-h-[65vh] overflow-y-auto">
        {logs.map(l=><li key={l.id} className="flex gap-3 border-b border-slate-50 dark:border-slate-800 pb-2"><span className="font-mono text-slate-400 shrink-0">{fmtDate(l.created_at)}</span><span><b>{l.action}</b> by {l.actor_role} — {l.detail}</span></li>)}
        {!logs.length && <li className="text-slate-400">No audit entries available for this role.</li>}</ul></Card>}
    </Shell>
    <RequestDrawer req={selected} user={user} onClose={()=>setSelected(null)} onApprove={r=>setStatus(r,'APPROVED')} onReject={r=>setStatus(r,'REJECTED')} onComplete={completeTask}/>
    <CommandPalette open={palette} onClose={()=>setPalette(false)} actions={actions}/>
    <Toasts toasts={toasts}/></>);
}
