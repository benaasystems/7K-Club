// Supabase Edge Function: lets an ADMIN create a new user account from the website.
// The service-role key stays on the server (it is injected automatically by Supabase).
//
// Deploy:  npx supabase functions deploy admin-create-user --project-ref <your-project-ref>
// or paste this file in Supabase Dashboard → Edge Functions → Deploy a new function → Via editor
// (name it exactly "admin-create-user").

import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function reply(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return reply(405, { error: 'METHOD_NOT_ALLOWED' });

  const url = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

  // 1) Who is calling? Must be a signed-in admin.
  const authHeader = req.headers.get('Authorization') ?? '';
  const caller = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
  const { data: userData } = await caller.auth.getUser();
  if (!userData.user) return reply(401, { error: 'NOT_AUTHENTICATED' });

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data: me } = await admin.from('profiles').select('role').eq('id', userData.user.id).maybeSingle();
  if (me?.role !== 'admin') return reply(403, { error: 'NOT_ALLOWED' });

  // 2) Validate input.
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return reply(400, { error: 'INVALID_INPUT' });
  }
  const email = String(body.email ?? '').trim().toLowerCase();
  const password = String(body.password ?? '');
  const full_name = String(body.full_name ?? '').trim();
  const phone = String(body.phone ?? '').trim();
  const language = body.language === 'ar' ? 'ar' : 'en';
  const role = ['customer', 'staff', 'admin'].includes(String(body.role)) ? String(body.role) : 'customer';
  const branch_id = role === 'staff' && body.branch_id ? String(body.branch_id) : null;

  if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 8 || !full_name) {
    return reply(400, { error: 'INVALID_INPUT' });
  }

  // 3) Create the auth user (already confirmed, so they can sign in right away).
  //    The on_auth_user_created trigger creates the profile row.
  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name, phone, language },
  });
  if (error || !created.user) {
    const taken = /already|registered|exists/i.test(error?.message ?? '');
    return reply(taken ? 409 : 400, { error: taken ? 'EMAIL_TAKEN' : error?.message ?? 'CREATE_FAILED' });
  }

  // 4) Apply role / branch.
  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .update({ role, branch_id })
    .eq('id', created.user.id)
    .select('*')
    .single();
  if (profileError) return reply(500, { error: profileError.message });

  return reply(200, { profile });
});
