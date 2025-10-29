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

  const supabase = getSupabaseServer();
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) {
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

  const supabase = getSupabaseServer();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    redirect(`/auth/login?error=${encodeURIComponent(error.message)}`);
  }

  redirect('/dashboard');
}

export async function logout() {
  const supabase = getSupabaseServer();
  await supabase.auth.signOut();
  redirect('/auth/login');
}

export async function oauth(provider: 'google' | 'github') {
  const supabase = getSupabaseServer();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo: `${appUrl}/auth/callback` },
  });
  if (error) {
    redirect(`/auth/login?error=${encodeURIComponent(error.message)}`);
  }
  if (data?.url) {
    redirect(data.url);
  }
  redirect('/auth/login?error=OAuth%20Fehler');
}

export async function magicLink(formData: FormData) {
  const email = String(formData.get('email') || '').trim();
  if (!email) redirect('/auth/login?error=E-Mail%20erforderlich');
  const supabase = getSupabaseServer();
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${appUrl}/auth/callback` },
  });
  if (error) {
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
    redirect(`/auth/reset?error=${encodeURIComponent(error.message)}`);
  }
  redirect('/dashboard');
}
