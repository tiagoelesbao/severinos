export const config = { runtime: 'edge' };

async function hashPassword(pw) {
  const enc = new TextEncoder().encode(pw);
  const buf = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export default async function handler(request) {
  if (request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  const form = await request.formData();
  const senha = (form.get('senha') || '').toString();
  const esperado = process.env.BI_PASSWORD || '';

  if (!esperado || senha !== esperado) {
    return new Response(null, {
      status: 302,
      headers: { Location: '/login.html?erro=1' },
    });
  }

  const hash = await hashPassword(esperado);
  return new Response(null, {
    status: 302,
    headers: {
      Location: '/executiva.html',
      'Set-Cookie': `bi_auth=${hash}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`,
    },
  });
}
