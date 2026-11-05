interface Env { ASSETS: { fetch(request: Request): Promise<Response> }; API: { fetch(request: Request): Promise<Response> } }
export function proxy(admin: boolean) { return { async fetch(request: Request, env: Env) {
 const url = new URL(request.url);
 if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);
 if (!admin && url.pathname.startsWith('/api/admin/')) return new Response('Not found', {status:404});
 // Preserve original URL, Origin and cookies; API enforces origin and role itself.
 return env.API.fetch(request);
} }; }
