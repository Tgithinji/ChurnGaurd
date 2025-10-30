// ============================================
// 5. LOGIN PAGE (app/login/page.tsx)
// ============================================
'use client';

import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { createBrowserSupabaseClient } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [supabase] = useState(() => createBrowserSupabaseClient());
  const router = useRouter();

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        router.push('/dashboard');
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase, router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-blue-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-teal-600 mb-2">
              🛡️ ChurnGuard
            </h1>
            <p className="text-gray-600">
              Sign in to manage your payment recovery
            </p>
          </div>

          <Auth
            supabaseClient={supabase}
            appearance={{
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: '#0d9488',
                    brandAccent: '#0f766e',
                  },
                },
              },
              className: {
                container: 'w-full',
                button: 'w-full px-4 py-2 rounded-lg font-medium',
                input: 'w-full px-4 py-2 rounded-lg border border-gray-300',
              },
            }}
            providers={['google', 'github']}
            redirectTo={`${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`}
          />

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-500">
              By signing in, you agree to our{' '}
              <a href="/terms" className="text-teal-600 hover:underline">
                Terms of Service
              </a>
            </p>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-600">
            Recover failed payments automatically
          </p>
        </div>
      </div>
    </div>
  );
}
