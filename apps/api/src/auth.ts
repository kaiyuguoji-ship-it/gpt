const encoder = new TextEncoder();
const COOKIE = 'swanyo_session';
async function signature(value: string, secret: string) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const bytes = new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(value)));
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}
export async function sameSecret(a: string, b: string) {
  const [x, y] = await Promise.all([crypto.subtle.digest('SHA-256', encoder.encode(a)), crypto.subtle.digest('SHA-256', encoder.encode(b))]);
  let diff = 0; const aa = new Uint8Array(x); const bb = new Uint8Array(y);
  for (let i = 0; i < aa.length; i++) diff |= aa[i] ^ bb[i];
  return diff === 0;
}
export async function sessionCookie(secret: string, secure: boolean, admin = false) {
  const payload = `${Date.now() + 8 * 60 * 60 * 1000}.${crypto.randomUUID()}`;
  return `${admin ? 'swanyo_admin_session' : COOKIE}=${payload}.${await signature(payload, secret)}; HttpOnly; SameSite=Strict; Path=/api; Max-Age=28800${secure ? '; Secure' : ''}`;
}
export const clearCookie = `${COOKIE}=; HttpOnly; SameSite=Strict; Path=/api; Max-Age=0`;
export async function authenticated(request: Request, secret: string, admin = false) {
  const name = admin ? 'swanyo_admin_session' : COOKIE;
  const token = request.headers.get('Cookie')?.split(';').map(s => s.trim()).find(s => s.startsWith(`${name}=`))?.slice(name.length + 1);
  if (!token || token.length > 180) return false;
  const parts = token.split('.');
  if (parts.length !== 3 || !/^\d+$/.test(parts[0]) || Number(parts[0]) <= Date.now() || Number(parts[0]) > Date.now() + 28800000) return false;
  return sameSecret(parts[2], await signature(`${parts[0]}.${parts[1]}`, secret));
}

export const clearAdminCookie = clearCookie.replace('swanyo_session=', 'swanyo_admin_session=');
