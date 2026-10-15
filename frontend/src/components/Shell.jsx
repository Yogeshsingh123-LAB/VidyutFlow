import { useEffect, useMemo, useState } from 'react';
import { Zap, LayoutDashboard, Plug, Wrench, Bot, BarChart3, ScrollText, Search, Bell, Moon, Sun, Plane, RefreshCw, LogOut, Menu, X } from 'lucide-react';

export const NAV = {
  consumer: [['dashboard','Dashboard',LayoutDashboard],['new','New Connection',Plug],['requests','My Requests',ScrollText],['assistant','AI Assistant',Bot],['insights','Insights',BarChart3]],
  officer: [['dashboard','Dashboard',LayoutDashboard],['requests','Application Queue',ScrollText],['field','Field Tasks',Wrench],['assistant','AI Assistant',Bot],['insights','Insights',BarChart3],['audit','Audit Log',ScrollText]],
  engineer: [['dashboard','Dashboard',LayoutDashboard],['field','My Field Tasks',Wrench],['requests','Assigned Requests',ScrollText],['assistant','AI Assistant',Bot],['insights','Insights',BarChart3]],
  admin: [['dashboard','Executive Dashboard',LayoutDashboard],['requests','All Requests',ScrollText],['field','Field Operations',Wrench],['assistant','AI Assistant',Bot],['insights','Insights',BarChart3],['audit','Audit Log',ScrollText]],
};
const TITLES = { dashboard:'Dashboard', new:'New Connection', requests:'Requests', field:'Field Operations', assistant:'AI Assistant', insights:'ML Insights', audit:'Audit Log' };

export function Shell({ user, tab, setTab, dark, setDark, airplane, setAirplane, queueCount, onSync, onLogout, alerts, children, onCommand }) {
  const [mobile, setMobile] = useState(false); const [showAlerts, setShowAlerts] = useState(false);
  const items = NAV[user.role] || NAV.consumer;
  const Sidebar = (<div className="flex h-full flex-col bg-[#101C35] text-slate-200 w-64 shrink-0">
    <div className="flex items-center gap-2 px-5 py-5 border-b border-white/10"><span className="p-2 rounded-xl bg-blue-600 text-white"><Zap size={18}/></span>
      <div><p className="font-extrabold text-white leading-none">VidyutOS <span className="text-teal-300">Lite</span></p><p className="text-[11px] text-slate-400 mt-1">UGVCL · PS000125</p></div></div>
    <nav className="p-3 space-y-1 flex-1">{items.map(([id,label,Icon]) => (
      <button key={id} onClick={()=>{setTab(id); setMobile(false);}} className={`w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${tab===id ? 'bg-blue-600 text-white' : 'hover:bg-white/10 text-slate-300'}`}><Icon size={17}/>{label}
        {id==='field' && queueCount>0 && <span className="ml-auto rounded-full bg-amber-400 text-black text-[11px] px-2 py-0.5 font-bold">{queueCount}</span>}</button>))}
      <button onClick={onCommand} className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-300 hover:bg-white/10"><Search size={17}/>Command Palette<kbd className="ml-auto text-[10px] bg-white/10 rounded px-1.5 py-0.5">Ctrl K</kbd></button></nav>
    <div className="p-4 border-t border-white/10 text-xs"><p className="font-semibold text-white">{user.name}</p><p className="text-slate-400 capitalize mt-0.5">{user.role} · {user.zone} zone</p>
      <p className="mt-3 rounded-lg bg-white/5 p-2 text-slate-400">Synthetic demo data only.<br/>Roadmap items are labelled.</p></div></div>);

  return (<div className="min-h-screen bg-[#F5F7FB] dark:bg-[#0B1120] text-slate-900 dark:text-slate-100 flex">
    <div className="hidden lg:block sticky top-0 h-screen">{Sidebar}</div>
    {mobile && <div className="fixed inset-0 z-[70] flex bg-black/50 lg:hidden"><div className="h-full">{Sidebar}</div><button className="p-3 text-white" onClick={()=>setMobile(false)}><X/></button></div>}
    <div className="flex-1 min-w-0">
      <header className="sticky top-0 z-40 flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-[#0B1120]/90 backdrop-blur px-4 py-3">
        <button className="lg:hidden p-2 rounded-lg bg-slate-100 dark:bg-slate-800" onClick={()=>setMobile(true)}><Menu size={17}/></button>
        <div className="min-w-0"><h1 className="font-bold truncate">{TITLES[tab]||'Dashboard'}</h1><p className="text-[11px] text-slate-400">Enter Once, Use Everywhere · {airplane ? 'Airplane mode — queueing offline' : 'Online'}</p></div>
        <div className="ml-auto flex items-center gap-2">
          <button title="Command palette (Ctrl+K)" onClick={onCommand} className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800"><Search size={16}/></button>
          <span className="relative"><button title="Notifications" onClick={()=>setShowAlerts(s=>!s)} className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800"><Bell size={16}/></button>
            {alerts.length>0 && <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-red-500 text-white text-[10px] grid place-items-center">{alerts.length}</span>}</span>
          <button title="Toggle dark mode" onClick={()=>setDark(d=>!d)} className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800">{dark ? <Sun size={16}/> : <Moon size={16}/>}</button>
          <button onClick={()=>setAirplane(a=>!a)} className={`hidden sm:flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold ${airplane ? 'bg-amber-400 text-black' : 'bg-slate-100 dark:bg-slate-800'}`}><Plane size={14}/>{airplane?'Airplane ON':'Airplane'}</button>
          <button onClick={onSync} className="hidden sm:flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold bg-teal-600 text-white"><RefreshCw size={14}/>Sync{queueCount?` (${queueCount})`:''}</button>
          <button onClick={onLogout} className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800" title="Logout"><LogOut size={16}/></button></div></header>
      {showAlerts && <div className="mx-4 mt-3 rounded-2xl border border-amber-200 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-900 p-4"><p className="text-sm font-bold mb-2">Notifications ({alerts.length})</p>
        {alerts.length ? <ul className="text-sm space-y-1">{alerts.map((a,i)=><li key={i}>• {a}</li>)}</ul> : <p className="text-sm text-slate-500">No active alerts.</p>}</div>}
      <main className="p-4 md:p-6 max-w-7xl mx-auto w-full">{children}</main></div></div>);
}

export function CommandPalette({ open, onClose, actions }) {
  const [q, setQ] = useState('');
  useEffect(()=>{ if(open) setQ(''); },[open]);
  const list = useMemo(()=>actions.filter(a=>a.label.toLowerCase().includes(q.toLowerCase())),[actions,q]);
  if (!open) return null;
  return (<div className="fixed inset-0 z-[85] bg-black/50 flex items-start justify-center pt-24 px-4" onClick={onClose}>
    <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-[#101C35] shadow-2xl overflow-hidden" onClick={e=>e.stopPropagation()}>
      <input autoFocus value={q} onChange={e=>setQ(e.target.value)} placeholder="Type a command or search…" className="w-full px-4 py-3.5 outline-none bg-transparent border-b border-slate-200 dark:border-slate-700"/>
      <div className="max-h-80 overflow-y-auto p-2">{list.map(a=><button key={a.label} onClick={()=>{a.run(); onClose();}} className="w-full text-left rounded-xl px-3 py-2.5 text-sm hover:bg-slate-100 dark:hover:bg-slate-800">{a.label}<span className="block text-xs text-slate-400">{a.hint}</span></button>)}
      {!list.length && <p className="p-3 text-sm text-slate-400">No matching command.</p>}</div></div></div>);
}
