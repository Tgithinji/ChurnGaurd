// ============================================
// 3. UPDATED SUPABASE CLIENT (lib/supabase.ts)
// ============================================
import { createClient } from '@supabase/supabase-js';
import { createBrowserClient, createServerClient } from '@supabase/ssr';
import { Database } from '@/types/supabase';

// Validate public environment variables (available on both client and server)
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  throw new Error(
    '❌ Missing NEXT_PUBLIC_SUPABASE_URL environment variable.\n' +
    'Please add it to your .env file.\n' +
    'See ENV_SETUP_GUIDE.md for instructions.'
  );
}

if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  throw new Error(
    '❌ Missing NEXT_PUBLIC_SUPABASE_ANON_KEY environment variable.\n' +
    'Please add it to your .env file.\n' +
    'See ENV_SETUP_GUIDE.md for instructions.'
  );
}

// Server-side client with service role key (bypasses RLS)
// Note: SUPABASE_SERVICE_ROLE_KEY is only available on the server
// Validation happens when the client is actually used
function createSupabaseAdmin() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      '❌ Missing SUPABASE_SERVICE_ROLE_KEY environment variable.\n' +
      'This is a server-only variable. Please add it to your .env file.\n' +
      'See ENV_SETUP_GUIDE.md for instructions.'
    );
  }

  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
}

// Lazy initialization - only creates admin client when first accessed (server-side only)
let _supabaseAdmin: ReturnType<typeof createClient<Database>> | null = null;
export const supabaseAdmin = new Proxy({} as ReturnType<typeof createClient<Database>>, {
  get(target, prop: string | symbol) {
    if (!_supabaseAdmin) {
      _supabaseAdmin = createSupabaseAdmin();
    }
    return (_supabaseAdmin as unknown as Record<string | symbol, unknown>)[prop];
  }
});

// Server-side client for authenticated requests (respects RLS)
export async function createServerSupabaseClient() {
  // Import cookies only when needed (inside async function)
  const { cookies } = await import('next/headers');
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: Record<string, unknown>) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // Handle cookie errors silently
          }
        },
        remove(name: string, options: Record<string, unknown>) {
          try {
            cookieStore.delete({ name, ...options });
          } catch {
            // Handle cookie errors silently
          }
        },
      },
    }
  );
}

// Client-side Supabase client
export function createBrowserSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      '❌ Missing Supabase environment variables.\n' +
      'Please check your .env file.\n' +
      'See ENV_SETUP_GUIDE.md for instructions.'
    );
  }

  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
}