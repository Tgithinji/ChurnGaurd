// ============================================
// 4. AUTH CONTEXT PROVIDER (lib/auth-context.tsx)
// ============================================
'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { createBrowserSupabaseClient } from './supabase';
import type { User } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createBrowserSupabaseClient();
  const router = useRouter();

  useEffect(() => {
    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);

      // Create creator profile on sign up
      if (event === 'SIGNED_IN' && session?.user) {
        await createCreatorProfile(session.user);
      }

      // Refresh router on auth change
      router.refresh();
    });

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase, router]);

  const createCreatorProfile = async (user: User) => {
    try {
      // Check if creator profile exists
      const { data: existingCreator } = await supabase
        .from('creators')
        .select('id')
        .eq('id', user.id)
        .single();

      if (existingCreator) return;

      // Create creator profile
      const { error: creatorError } = await supabase
        .from('creators')
        .insert({
          id: user.id,
          email: user.email!,
        } as any);

      if (creatorError) throw creatorError;

      // Create default settings
      const { error: settingsError } = await supabase
        .from('creator_settings')
        .insert({
          creator_id: user.id,
          webhook_url: `${process.env.NEXT_PUBLIC_SITE_URL}/api/webhooks/stripe`,
          email_subject: 'Hey {name}, please update your card to keep your subscription active 💳',
          email_body: `Hi {name},

We noticed that your recent payment for {product_name} ({amount}) didn't go through. Don't worry - this happens sometimes!

To keep your subscription active, please update your payment method here:
{payment_update_link}

If you have any questions, just reply to this email.

Thanks,
The Team`,
        } as any);

      if (settingsError) throw settingsError;

      console.log('Creator profile created successfully');
    } catch (error) {
      console.error('Error creating creator profile:', error);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};