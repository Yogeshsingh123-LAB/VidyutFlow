import { STEPS, stepIndex, riskLevel } from '../lib/format';

export const Card = ({ className = '', children }) => (
  <section className={`bg-white dark:bg-[#101C35] border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm ${className}`}>{children}</section>);

export function StatCard({ label, value, sub, icon: Icon, tone = 'text-blue-600' }) {
  return (<Card className="p-4"><div className="flex items-start justify-between">
    <div><p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
    <p className="text-2xl font-extrabold tabular mt-1 text-slate-900 dark:text-white">{value}</p>
    {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}</div>
    {Icon && <span className={`p-2 rounded-xl bg-slate-100 dark:bg-slate-800 ${tone}`}><Icon size={18}/></span>}</div></Card>);
}

export const Chip = ({ children, className = '' }) => <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${className}`}>{children}</span>;
export const RiskChip = ({ value }) => { const [label, cls] = riskLevel(value); return <Chip className={cls}>{label} · {Number(value).toFixed(2)}</Chip>; };
export const StatusChip = ({ status }) => <Chip className={status==='COMPLETED' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200' : status==='NEEDS_CORRECTION'||status==='REJECTED' ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200' : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-200'}>{status.replaceAll('_',' ')}</Chip>;

export function Bars({ data = {}, suffix = '' }) {
  const entries = Object.entries(data); const max = Math.max(1, ...entries.map(([,v]) => v));
  if (!entries.length) return <p className="text-sm text-slate-400">No data yet.</p>;
  return <div className="space-y-2">{entries.map(([k,v]) => (
    <div key={k} className="grid grid-cols-[130px_1fr_36px] items-center gap-2 text-xs">
      <span className="truncate text-slate-500" title={k}>{k.replaceAll('_',' ')}</span>
      <span className="h-2.5 rounded bg-slate-100 dark:bg-slate-800 overflow-hidden"><span className="block h-full rounded bg-gradient-to-r from-blue-600 to-teal-500" style={{ width:`${(v/max)*100}%` }}/></span>
      <span className="text-right font-semibold tabular">{v}{suffix}</span></div>))}</div>;
}

export function WorkflowStepper({ status }) {
  const idx = stepIndex(status); const failed = status === 'REJECTED' || status === 'NEEDS_CORRECTION';
  return (<ol className="flex flex-wrap items-center gap-y-2">{STEPS.map((s,i) => (
    <li key={s} className="flex items-center">
      <span className={`flex items-center gap-1.5 text-[11px] font-semibold ${i<=idx ? 'text-teal-700 dark:text-teal-300' : 'text-slate-400'}`}>
        <span className={`w-5 h-5 rounded-full grid place-items-center text-[10px] ${failed && i===idx ? 'bg-red-500 text-white' : i<=idx ? 'bg-teal-600 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>{i+1}</span>{s}</span>
      {i<STEPS.length-1 && <span className={`mx-2 h-px w-5 ${i<idx ? 'bg-teal-500' : 'bg-slate-300 dark:bg-slate-700'}`}/>}</li>))}</ol>);
}

export function Toasts({ toasts }) {
  return (<div className="fixed bottom-4 right-4 z-[90] space-y-2 w-[min(92vw,360px)]">{toasts.map(t => (
    <div key={t.id} className={`rounded-xl px-4 py-3 text-sm shadow-lg text-white ${t.tone==='error' ? 'bg-red-600' : t.tone==='warn' ? 'bg-amber-500' : 'bg-slate-900'}`}>{t.text}</div>))}</div>);
}

export const Field = ({ label, children }) => (<label className="block text-xs font-semibold text-slate-500">{label}<span className="block mt-1">{children}</span></label>);
export const inputCls = "w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#0B1120] px-3 py-2 text-sm text-slate-900 dark:text-white";
