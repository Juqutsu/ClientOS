"use server";

import { redirect } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseServer } from '@/lib/supabase/server';

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function signup(formData: FormData) {
  const email = String(formData.get('email') || '').trim();
  const password = String(formData.get('password') || '');
  const fullName = String(formData.get('full_name') || '').trim();

  try {
    console.log(
      JSON.stringify(
        {
          tag: 'auth/signup',
          emailMasked: email ? email.replace(/(^.).*(@.*$)/, '$1***$2') : '',
        },
        null,
        0
      )
    );
  } catch {}

  const supabase = getSupabaseServer();
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) {
    try {
      console.error(JSON.stringify({ tag: 'auth/signup/error', message: error.message }, null, 0));
    } catch {}
    redirect(`/auth/login?error=${encodeURIComponent(error.message)}`);
  }

  const user = data.user;
  if (!user) {
    return;
  }

  // Create workspace and membership using service role
  const admin = getAdminClient();

  // Ensure application user row exists
  await admin.from('users').upsert({ id: user.id, email, full_name: fullName });

  // Create workspace and membership
  const { data: ws, error: wsError } = await admin
    .from('workspaces')
    .insert({ name: fullName ? `${fullName}'s Workspace` : `${email}'s Workspace`, created_by: user.id })
    .select('id')
    .single();

  if (!ws || wsError) {
    // Non-blocking; still let user in
    console.error('Workspace creation failed', wsError);
  } else {
    await admin.from('workspace_members').insert({ workspace_id: ws.id, user_id: user.id, role: 'owner' });
  }

  // If email confirmations are enabled, ask user to check inbox
  redirect('/auth/login?success=signup');
}

export async function login(formData: FormData) {
  const email = String(formData.get('email') || '').trim();
  const password = String(formData.get('password') || '');
  const nextRaw = String(formData.get('next') || '').trim();
  const next = nextRaw && nextRaw.startsWith('/') ? nextRaw : '';

  try {
    console.log(
      JSON.stringify(
        {
          tag: 'auth/login',
          emailMasked: email ? email.replace(/(^.).*(@.*$)/, '$1***$2') : '',
          next,
        },
        null,
        0
      )
    );
  } catch {}

  const supabase = getSupabaseServer();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    try {
      console.error(JSON.stringify({ tag: 'auth/login/error', message: error.message }, null, 0));
    } catch {}
    redirect(`/auth/login?error=${encodeURIComponent(error.message)}`);
  }

  redirect(next || '/dashboard');
}

export async function logout() {
  try {
    console.log(JSON.stringify({ tag: 'auth/logout' }, null, 0));
  } catch {}
  const supabase = getSupabaseServer();
  await supabase.auth.signOut();
  redirect('/auth/login');
}

export async function oauth(provider: 'google' | 'github', next?: string) {
  const supabase = getSupabaseServer();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const safeNext = next && next.startsWith('/') ? next : undefined;
  const redirectTo = `${appUrl}/auth/callback${safeNext ? `?next=${encodeURIComponent(safeNext)}` : ''}`;
  try {
    console.log(
      JSON.stringify(
        { tag: 'auth/oauth/start', provider, redirectTo, next: safeNext || null },
        null,
        0
      )
    );
  } catch {}
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo },
  });
  if (error) {
    try {
      console.error(JSON.stringify({ tag: 'auth/oauth/error', provider, message: error.message }, null, 0));
    } catch {}
    redirect(`/auth/login?error=${encodeURIComponent(error.message)}`);
  }
  if (data?.url) {
    try {
      console.log(JSON.stringify({ tag: 'auth/oauth/redirect', provider, url: data.url }, null, 0));
    } catch {}
    redirect(data.url);
  }
  redirect('/auth/login?error=OAuth%20Fehler');
}

export async function magicLink(formData: FormData) {
  const email = String(formData.get('email') || '').trim();
  const nextRaw = String(formData.get('next') || '').trim();
  const next = nextRaw && nextRaw.startsWith('/') ? nextRaw : '';
  if (!email) redirect('/auth/login?error=E-Mail%20erforderlich');
  const supabase = getSupabaseServer();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const emailRedirectTo = `${appUrl}/auth/callback${next ? `?next=${encodeURIComponent(next)}` : ''}`;
  try {
    console.log(
      JSON.stringify(
        {
          tag: 'auth/magic/start',
          emailMasked: email ? email.replace(/(^.).*(@.*$)/, '$1***$2') : '',
          redirectTo: emailRedirectTo,
          next: next || null,
        },
        null,
        0
      )
    );
  } catch {}
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo },
  });
  if (error) {
    try {
      console.error(JSON.stringify({ tag: 'auth/magic/error', message: error.message }, null, 0));
    } catch {}
    redirect(`/auth/login?error=${encodeURIComponent(error.message)}`);
  }
  redirect('/auth/login?success=magic');
}

export async function sendPasswordReset(formData: FormData) {
  const email = String(formData.get('email') || '').trim();
  if (!email) redirect('/auth/login?error=E-Mail%20erforderlich');
  const supabase = getSupabaseServer();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${appUrl}/auth/callback?next=/auth/reset`,
  });
  if (error) {
    try {
      console.error(JSON.stringify({ tag: 'auth/reset/error', message: error.message }, null, 0));
    } catch {}
    redirect(`/auth/login?error=${encodeURIComponent(error.message)}`);
  }
  redirect('/auth/login?success=reset');
}

export async function updatePassword(formData: FormData) {
  const newPassword = String(formData.get('password') || '');
  if (newPassword.length < 8) {
    redirect('/auth/reset?error=Passwort%20zu%20kurz');
  }
  const supabase = getSupabaseServer();
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) {
    try {
      console.error(JSON.stringify({ tag: 'auth/update-password/error', message: error.message }, null, 0));
    } catch {}
    redirect(`/auth/reset?error=${encodeURIComponent(error.message)}`);
  }
  redirect('/dashboard');
}
