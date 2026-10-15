const BASE = import.meta.env.VITE_API_URL || '/api';
export const token = () => localStorage.getItem('vidyutos_token');
export async function api(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, { ...opts, headers: { ...(opts.headers || {}), Authorization: `Bearer ${token()}` } });
  if (!res.ok) throw new Error((await res.text()) || res.statusText);
  return res.json();
}
export const json = (method, body) => ({ method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
