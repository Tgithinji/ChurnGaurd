//8. UPDATED ROOT LAYOUT (app/layout.tsx)
// ============================================
import './globals.css';
import type { Metadata } from 'next';
import { AuthProvider } from '@/lib/auth-context';

export const metadata: Metadata = {
  title: 'ChurnGuard - Payment Recovery',
  description: 'Automatically recover failed Stripe payments',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
