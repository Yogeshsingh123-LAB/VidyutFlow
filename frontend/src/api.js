const BASE = import.meta.env.VITE_API_URL || '/api';
export const token = () => localStorage.getItem('vidyutos_token');
export async function api(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, { ...opts, headers: { ...(opts.headers || {}), Authorization: `Bearer ${token()}` } });
  if (!res.ok) {
    const text = await res.text();
    let message = text || res.statusText;
    try { const body = JSON.parse(text); if (typeof body.detail === 'string') message = body.detail; } catch {}
    const error = new Error(message); error.status = res.status; throw error;
  }
  return res.json();
}
export const json = (method, body) => ({ method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
