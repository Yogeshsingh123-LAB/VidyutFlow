import { useEffect, useState } from 'react';
import { api, json, token } from './api';

const DEMO = [
  ['consumer@vidyut.local','Consumer@123','Consumer'],
  ['officer@vidyut.local','Officer@123','Officer (North)'],
  ['engineer@vidyut.local','Engineer@123','Engineer (North)'],
  ['admin@vidyut.local','Admin@123','Admin'],
];
const QUEUE_KEY = 'vidyutos_offline_queue';
const loadQueue = () => JSON.parse(localStorage.getItem(QUEUE_KEY) || '[]');
const saveQueue = q => localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
const riskBadge = r => r >= .7 ? 'bg-red-100 text-red-800' : r >= .5 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800';

export default function App() {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState(DEMO[0][0]); const [password, setPassword] = useState(DEMO[0][1]);
  const [requests, setRequests] = useState([]); const [kpis, setKpis] = useState(null);
  const [logs, setLogs] = useState([]); const [metrics, setMetrics] = useState(null);
  const [queue, setQueue] = useState(loadQueue());
  const [airplane, setAirplane] = useState(false); const [online, setOnline] = useState(navigator.onLine);
  const [msg, setMsg] = useState('');
  const [form, setForm] = useState({ applicant_name:'Demo Consumer', phone:'9876543210', address:'Plot 12, Mehsana, Gujarat', zone:'North', pin_code:'384002', request_type:'new_connection', description:'need new electricity connection for my home', requested_load_kw:3 });
  const [file, setFile] = useState(null);
  const [chat, setChat] = useState([]); const [question, setQuestion] = useState('Which requests are likely to breach SLA?');
  const offline = airplane || !online;

  async function login(e) { e?.preventDefault();
    try { const r = await fetch('/api/auth/login', { method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'}, body:new URLSearchParams({username:email, password}) });
      if (!r.ok) throw new Error(await r.text()); const d = await r.json();
      localStorage.setItem('vidyutos_token', d.access_token); setUser(d); setMsg(`Logged in as ${d.role}`); }
    catch (err) { setMsg('Login failed: ' + err.message); } }

  async function refresh() { if (!token()) return;
    try { setRequests(await api('/requests')); setKpis(await api('/requests/kpis/summary')); setMetrics(await api('/assistant/ml-metrics'));
      if (user?.role === 'officer' || user?.role === 'admin') setLogs(await api('/requests/audit/logs')); } catch (e) { setMsg(e.message); } }
  useEffect(() => { refresh(); }, [user]);
  useEffect(() => { const on = () => setOnline(true), off = () => setOnline(false);
    window.addEventListener('online', on); window.addEventListener('offline', off);
    if (online && !airplane && queue.length) syncQueue();
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); }; }, [online, airplane]);

  async function submit(e) { e.preventDefault();
    try { const fd = new FormData(); Object.entries(form).forEach(([k,v]) => fd.append(k, v)); if (file) fd.append('document', file);
      const r = await fetch('/api/requests/with-document', { method:'POST', headers:{ Authorization:`Bearer ${token()}` }, body: fd });
      if (!r.ok) throw new Error(await r.text()); const d = await r.json();
      setMsg(`Submitted → ${d.status} · ${d.category}/${d.severity} · SLA risk ${d.sla_breach_risk}`); refresh(); }
    catch (err) { setMsg('Submit failed: ' + err.message); } }

  async function setStatus(id, status) { try { await api(`/requests/${id}/status`, json('PATCH', { status })); setMsg(`Request ${status}`); refresh(); } catch(e){ setMsg(e.message);} }

  // Field work: offline -> queue with a device UUID; online -> send now. Server de-duplicates by UUID.
  async function completeTask(req) {
    const item = { client_uuid: crypto.randomUUID(), request_id: req.id, task_status:'COMPLETED', notes:'Site verified, meter installed', meter_serial:'MTR-'+Math.floor(Math.random()*9000+1000), created_offline_at:new Date().toISOString() };
    if (offline) { const q = [...loadQueue(), item]; saveQueue(q); setQueue(q); setMsg(`✈ Offline — queued on device (${item.client_uuid.slice(0,8)}…). Reconnect and Sync.`); return; }
    try { const r = await api('/requests/field-sync', json('POST', item)); setMsg(r.duplicate ? 'Duplicate ignored — already synced' : 'Field update synced'); refresh(); }
    catch(e){ const q=[...loadQueue(), item]; saveQueue(q); setQueue(q); setMsg('Network failed — queued for sync'); } }

  async function syncQueue() { const q = loadQueue(); if (!q.length) return setMsg('Offline queue is empty');
    let done = 0; for (const item of q) { try { await api('/requests/field-sync', json('POST', item)); done++; } catch { break; } }
    const rest = q.slice(done); saveQueue(rest); setQueue(rest); setMsg(`Synced ${done} queued entr${done===1?'y':'ies'} · ${rest.length} remaining · no duplicates (UUID check)`); refresh(); }

  async function ask(e) { e?.preventDefault(); if (!question.trim()) return;
    try { const r = await api('/assistant/chat', json('POST', { question })); setChat(c => [...c, { q: question, a: r.answer, data: r.data }]); }
    catch(err){ setMsg(err.message); } }

  function logout() { localStorage.removeItem('vidyutos_token'); setUser(null); }

  if (!user) return (<main className="min-h-screen bg-slate-100 flex items-center justify-center p-4"><form onSubmit={login} className="bg-white rounded-2xl shadow p-6 w-full max-w-md space-y-3">
    <h1 className="text-2xl font-bold text-teal-800">⚡ VidyutOS Lite</h1>
    <p className="text-sm text-slate-600">PS000125 demo — “Enter Once, Use Everywhere”. Synthetic demo data only.</p>
    <input className="w-full border rounded p-2" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email"/>
    <input className="w-full border rounded p-2" type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password"/>
    <button className="w-full bg-teal-700 text-white rounded p-2">Login</button>
    <div className="grid grid-cols-2 gap-2">{DEMO.map(([em,pw,label]) => <button type="button" key={em} className="border rounded p-2 text-sm" onClick={()=>{setEmail(em);setPassword(pw);}}>{label}</button>)}</div>
    {msg && <p className="text-sm text-slate-700">{msg}</p>}</form></main>);

  return (<main className="min-h-screen bg-slate-100">
    <header className="bg-teal-800 text-white p-4 flex flex-wrap gap-3 items-center justify-between">
      <div><h1 className="text-xl font-bold">⚡ VidyutOS Lite</h1><p className="text-xs opacity-80">{user.name} · {user.role} · {user.zone} · {offline ? '✈ OFFLINE (queueing)' : '● Online'}</p></div>
      <div className="flex gap-2">
        <button className={`rounded px-3 py-1 ${airplane?'bg-amber-400 text-black':'bg-white/20'}`} onClick={()=>setAirplane(a=>!a)}>{airplane?'✈ Airplane mode ON':'Simulate airplane mode'}</button>
        <button className="bg-white/20 rounded px-3 py-1" onClick={syncQueue}>Sync queue ({queue.length})</button>
        <button className="bg-white/20 rounded px-3 py-1" onClick={refresh}>Refresh</button>
        <button className="bg-white/20 rounded px-3 py-1" onClick={logout}>Logout</button></div></header>

    <div className="p-4 grid gap-4 max-w-7xl mx-auto">
      {msg && <div className="bg-white border-l-4 border-teal-600 rounded p-3 text-sm">{msg}</div>}
      {kpis && <section className="grid grid-cols-2 md:grid-cols-5 gap-3">{[['Total',kpis.total_requests],['Pending',kpis.pending],['Completed',kpis.completed],['High SLA risk',kpis.high_sla_risk],['Needs correction',kpis.needs_correction]].map(([k,v])=><div key={k} className="bg-white rounded-xl p-4 shadow"><div className="text-2xl font-bold">{v}</div><div className="text-xs text-slate-500">{k}</div></div>)}</section>}

      {user.role==='consumer' && <section className="bg-white rounded-xl shadow p-4"><h2 className="font-semibold mb-3">New connection request</h2>
        <form onSubmit={submit} className="grid md:grid-cols-3 gap-3">
          {Object.entries(form).map(([k,v]) => <label key={k} className="text-xs text-slate-600">{k.replaceAll('_',' ')}<input className="w-full border rounded p-2 mt-1 text-sm" value={v} onChange={e=>setForm({...form,[k]:e.target.value})}/></label>)}
          <label className="text-xs text-slate-600">Document (ID / address proof)<input type="file" className="w-full border rounded p-2 mt-1 text-sm" onChange={e=>setFile(e.target.files[0])}/></label>
          <button className="bg-teal-700 text-white rounded p-2 md:col-span-3">Submit (Enter Once, Use Everywhere)</button></form></section>}

      <section className="bg-white rounded-xl shadow p-4 overflow-x-auto"><h2 className="font-semibold mb-3">{user.role==='engineer'?'My field tasks':'Requests'} ({requests.length})</h2>
        <table className="w-full text-sm min-w-[760px]"><thead><tr className="text-left text-slate-500"><th className="p-2">Applicant</th><th>Zone / Load</th><th>ML category · severity</th><th>Status</th><th>SLA risk</th><th>Actions</th></tr></thead>
        <tbody>{requests.map(r => <tr key={r.id} className="border-t"><td className="p-2">{r.applicant_name}<div className="text-xs text-slate-400">{r.id.slice(0,8)}</div></td>
          <td>{r.zone} · {r.requested_load_kw} kW</td><td>{r.category} · {r.severity}<div className="text-xs">{r.priority}</div></td><td><span className="bg-slate-100 rounded px-2 py-1">{r.status}</span></td>
          <td><span className={`rounded px-2 py-1 ${riskBadge(r.sla_breach_risk)}`}>{r.sla_breach_risk}</span><div className="text-xs max-w-[260px]">{(r.sla_risk_reasons||[]).join('; ')}</div></td>
          <td className="space-x-1 whitespace-nowrap">
            {(user.role==='officer'||user.role==='admin') && <><button className="border rounded px-2 py-1" onClick={()=>setStatus(r.id,'APPROVED')}>Approve</button><button className="border rounded px-2 py-1" onClick={()=>setStatus(r.id,'REJECTED')}>Reject</button></>}
            {(user.role==='engineer'||user.role==='admin') && <button className="bg-teal-700 text-white rounded px-2 py-1" onClick={()=>completeTask(r)}>Complete field task</button>}
          </td></tr>)}</tbody></table>
        {queue.length>0 && <p className="text-sm mt-3">📥 Offline queue on this device: {queue.length} entr{queue.length===1?'y':'ies'} waiting — turn airplane mode off, then “Sync queue”. Syncing twice is safe.</p>}
      </section>

      <section className="grid md:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl shadow p-4"><h2 className="font-semibold">🤖 AI assistant (policy RAG + live data)</h2>
          <form onSubmit={ask} className="flex gap-2 my-3"><input className="flex-1 border rounded p-2 text-sm" value={question} onChange={e=>setQuestion(e.target.value)}/><button className="bg-teal-700 text-white rounded px-3">Ask</button></form>
          <div className="flex gap-2 flex-wrap">{['Which requests are likely to breach SLA?','What is the procedure for a new connection?','How does offline field work sync?'].map(q=><button key={q} className="border rounded-full px-2 py-1 text-xs" onClick={()=>setQuestion(q)}>{q}</button>)}</div>
          <div className="space-y-3 mt-3">{chat.map((c,i)=><div key={i} className="text-sm"><p className="font-medium">Q: {c.q}</p><p className="text-slate-700">{c.a}</p>{c.data?.length>0 && <ul className="list-disc ml-5 text-xs">{c.data.map(d=><li key={d.id}>{d.applicant} — risk {d.sla_breach_risk}: {d.reasons.join('; ')}</li>)}</ul>}</div>)}</div></div>
        <div className="bg-white rounded-xl shadow p-4"><h2 className="font-semibold">📊 ML models — synthetic data only</h2>
          {metrics?.category_classifier ? <ul className="text-sm space-y-2 mt-2">
            <li>Complaint/fault classifier: accuracy <b>{metrics.category_classifier.accuracy}</b> vs majority baseline {metrics.category_classifier.majority_baseline}</li>
            <li>Severity classifier: accuracy <b>{metrics.severity_classifier.accuracy}</b> vs baseline {metrics.severity_classifier.majority_baseline}</li>
            <li>SLA-breach predictor: accuracy <b>{metrics.sla_breach_predictor.accuracy}</b> vs baseline {metrics.sla_breach_predictor.majority_baseline}</li>
            <li className="text-xs text-amber-700">⚠ {metrics.data_notice} Templated synthetic text inflates classifier accuracy — not UGVCL real-world performance.</li></ul>
          : <p className="text-sm">Metrics loading…</p>}
          <p className="text-xs mt-3 text-slate-500">Roadmap (not built): GraphQL, GIS map, WebSockets, Temporal/Camunda, Kafka, Flutter/Couchbase/CRDT, fine-tuned LLM, Zero Trust/multi-AZ — see docs/ROADMAP.md.</p></div>
      </section>

      {(user.role==='officer'||user.role==='admin') && logs.length>0 && <section className="bg-white rounded-xl shadow p-4"><h2 className="font-semibold mb-2">Audit log</h2>
        <ul className="text-xs space-y-1 max-h-48 overflow-auto">{logs.map(l=><li key={l.id}><b>{l.action}</b> by {l.actor_role} · {l.detail} · {new Date(l.created_at).toLocaleString()}</li>)}</ul></section>}
    </div></main>);
}
