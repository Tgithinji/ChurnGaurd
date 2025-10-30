// ============================================
// 6. AUTH CALLBACK ROUTE (app/auth/callback/route.ts)
// ============================================
import { createServerSupabaseClient } from '@/lib/supabase';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');

  if (code) {
    const supabase = await createServerSupabaseClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  // Redirect to dashboard after successful auth
  return NextResponse.redirect(new URL('/dashboard', request.url));
}

