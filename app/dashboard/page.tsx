// 9. UPDATED DASHBOARD WITH AUTH (app/dashboard/page.tsx)
// ============================================
'use client';

import React, { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, AlertCircle, CheckCircle, Settings, Home, CreditCard, Mail, Copy, Check, Save, RefreshCw, LogOut, User } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { createBrowserSupabaseClient } from '@/lib/supabase';

interface Payment {
  id: string;
  customer_name: string;
  customer_email: string;
  product_name: string;
  amount: number;
  created_at: string;
  status: 'failed' | 'recovered';
  recovered_at?: string;
}

interface Stats {
  totalFailed: number;
  totalRecovered: number;
  recoveredRevenue: string;
  recoveryRate: string;
}

interface CreatorSettings {
  stripe_api_key?: string;
  stripe_webhook_secret?: string;
  webhook_url?: string;
  email_subject: string;
  email_body: string;
  resend_api_key?: string;
}

export default function DashboardPage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const supabase = createBrowserSupabaseClient();

  const [activeTab, setActiveTab] = useState('dashboard');
  const [payments, setPayments] = useState<Payment[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalFailed: 0,
    totalRecovered: 0,
    recoveredRevenue: '0.00',
    recoveryRate: '0'
  });
  const [settings, setSettings] = useState<CreatorSettings>({
    email_subject: 'Hey {name}, please update your card to keep your subscription active 💳',
    email_body: `Hi {name},\n\nWe noticed that your recent payment for {product_name} ({amount}) didn't go through...`,
    webhook_url: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Fetch payments and stats
  const fetchPayments = async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Fetch payments directly from Supabase with RLS
      const { data: paymentsData, error: paymentsError } = await supabase
        .from('failed_payments')
        .select('*')
        .eq('creator_id', user.id)
        .order('created_at', { ascending: false });

      if (paymentsError) throw paymentsError;

      const payments = paymentsData || [];
      setPayments(payments);

      // Calculate stats
      const totalFailed = payments.filter(p => p.status === 'failed').length;
      const totalRecovered = payments.filter(p => p.status === 'recovered').length;
      const recoveredRevenue = payments
        .filter(p => p.status === 'recovered')
        .reduce((sum, p) => sum + Number(p.amount), 0);
      const recoveryRate = payments.length > 0 
        ? ((totalRecovered / payments.length) * 100).toFixed(1)
        : '0';

      setStats({
        totalFailed,
        totalRecovered,
        recoveredRevenue: recoveredRevenue.toFixed(2),
        recoveryRate
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to fetch payments');
      console.error('Error fetching payments:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch settings
  const fetchSettings = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('creator_settings')
        .select('*')
        .eq('creator_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        setSettings({
          stripe_api_key: data.stripe_api_key || '',
          stripe_webhook_secret: data.stripe_webhook_secret || '',
          webhook_url: data.webhook_url || '',
          email_subject: data.email_subject,
          email_body: data.email_body,
          resend_api_key: data.resend_api_key || ''
        });
      }
    } catch (err: unknown) {
      console.error('Error fetching settings:', err);
    }
  };

  // Save settings
  const saveSettings = async () => {
    if (!user) return;

    setSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const { error } = await supabase
        .from('creator_settings')
        .upsert({
          creator_id: user.id,
          ...settings,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'creator_id'
        });

      if (error) throw error;

      setSuccess('Settings saved successfully!');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
      console.error('Error saving settings:', err);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchPayments();
      fetchSettings();
      
      // Auto-generate webhook URL based on creator ID
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
      const generatedWebhookUrl = `${siteUrl}/api/webhooks/stripe/${user.id}`;
      setSettings(prev => ({
        ...prev,
        webhook_url: generatedWebhookUrl
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-teal-600 animate-spin" />
      </div>
    );
  }

  const StatCard = ({ icon: Icon, title, value, subtitle, color }: {
    icon: React.ElementType;
    title: string;
    value: string | number;
    subtitle: string;
    color: string;
  }) => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className={`text-3xl font-bold mt-2 ${color}`}>{value}</p>
          {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
        </div>
        <div className={`p-3 rounded-full ${color === 'text-red-600' ? 'bg-red-100' : color === 'text-green-600' ? 'bg-green-100' : 'bg-teal-100'}`}>
          <Icon className={`w-6 h-6 ${color}`} />
        </div>
      </div>
    </div>
  );

  const DashboardView = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Track and recover failed payments automatically</p>
        </div>
        <button
          onClick={fetchPayments}
          disabled={loading}
          className="flex items-center space-x-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={AlertCircle}
          title="Failed Payments"
          value={stats.totalFailed}
          subtitle="Needs attention"
          color="text-red-600"
        />
        <StatCard
          icon={CheckCircle}
          title="Recovered"
          value={stats.totalRecovered}
          subtitle="Successfully recovered"
          color="text-green-600"
        />
        <StatCard
          icon={DollarSign}
          title="Recovered Revenue"
          value={`$${stats.recoveredRevenue}`}
          subtitle="This month"
          color="text-teal-600"
        />
        <StatCard
          icon={TrendingUp}
          title="Recovery Rate"
          value={`${stats.recoveryRate}%`}
          subtitle="Success rate"
          color="text-teal-600"
        />
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent Activity</h2>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 text-teal-600 animate-spin" />
          </div>
        ) : payments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p>No payment activity yet</p>
            <p className="text-sm mt-1">Connect your Stripe account to start tracking payments</p>
          </div>
        ) : (
          <div className="space-y-4">
            {payments.slice(0, 5).map(payment => (
              <div key={payment.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                <div className="flex items-center space-x-4">
                  <div className={`p-2 rounded-full ${payment.status === 'recovered' ? 'bg-green-100' : 'bg-red-100'}`}>
                    {payment.status === 'recovered' ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-600" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{payment.customer_name}</p>
                    <p className="text-sm text-gray-500">{payment.customer_email}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">${payment.amount.toFixed(2)}</p>
                  <p className="text-sm text-gray-500">{formatDate(payment.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const FailedPaymentsView = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Failed Payments</h1>
          <p className="text-gray-600 mt-1">Monitor and track payment recovery status</p>
        </div>
        <button
          onClick={fetchPayments}
          disabled={loading}
          className="flex items-center space-x-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-50 transition"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-8 h-8 text-teal-600 animate-spin" />
          </div>
        ) : payments.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <CreditCard className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <p className="text-lg font-medium">No payments found</p>
            <p className="text-sm mt-1">Payment data will appear here once you connect Stripe</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {payments.map(payment => (
                  <tr key={payment.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{payment.customer_name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{payment.customer_email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{payment.product_name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-gray-900">${payment.amount.toFixed(2)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{formatDate(payment.created_at)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        payment.status === 'recovered' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  const SettingsView = () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">Configure your Stripe integration and notifications</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg">
          {success}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <CreditCard className="w-5 h-5 mr-2 text-teal-600" />
          Stripe Integration
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Stripe Secret Key
            </label>
            <input
              type="password"
              value={settings.stripe_api_key}
              onChange={(e) => setSettings({...settings, stripe_api_key: e.target.value})}
              placeholder="sk_live_..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
            <p className="text-sm text-gray-500 mt-1">Find this in your Stripe Dashboard → Developers → API keys</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Webhook Secret
            </label>
            <input
              type="password"
              value={settings.stripe_webhook_secret}
              onChange={(e) => setSettings({...settings, stripe_webhook_secret: e.target.value})}
              placeholder="whsec_..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
            <p className="text-sm text-gray-500 mt-1">Get this from Stripe → Webhooks → Add endpoint</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your Unique Webhook URL
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                value={settings.webhook_url}
                readOnly
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 font-mono text-sm cursor-not-allowed"
              />
              <button
                onClick={() => copyToClipboard(settings.webhook_url || '')}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 flex items-center transition"
                title="Copy to clipboard"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-sm text-teal-600 mt-1 font-medium">✨ Auto-generated for your account</p>
            <p className="text-sm text-gray-500 mt-1">Copy this URL and add it to your Stripe Dashboard → Developers → Webhooks</p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800 font-medium mb-3">📋 Webhook Setup Instructions:</p>
            <ol className="text-sm text-blue-700 space-y-2 list-decimal list-inside">
              <li>Copy your unique webhook URL above</li>
              <li>Go to <a href="https://dashboard.stripe.com/webhooks" target="_blank" rel="noopener noreferrer" className="underline font-medium">Stripe Dashboard → Webhooks</a></li>
              <li>Click &ldquo;Add endpoint&rdquo; and paste your URL</li>
              <li>Select these events:
                <ul className="ml-6 mt-1 space-y-1">
                  <li>• invoice.payment_failed</li>
                  <li>• invoice.payment_succeeded</li>
                </ul>
              </li>
              <li>Click &ldquo;Add endpoint&rdquo;</li>
              <li>Copy the webhook signing secret (whsec_...) and paste it above</li>
              <li>Save your settings</li>
            </ol>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
          <Mail className="w-5 h-5 mr-2 text-teal-600" />
          Email Configuration
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Resend API Key
            </label>
            <input
              type="password"
              value={settings.resend_api_key}
              onChange={(e) => setSettings({...settings, resend_api_key: e.target.value})}
              placeholder="re_..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
            <p className="text-sm text-gray-500 mt-1">Get your API key from resend.com</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Subject
            </label>
            <input
              type="text"
              value={settings.email_subject}
              onChange={(e) => setSettings({...settings, email_subject: e.target.value})}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Body
            </label>
            <textarea
              value={settings.email_body}
              onChange={(e) => setSettings({...settings, email_body: e.target.value})}
              rows={10}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent font-mono text-sm"
            />
            <p className="text-sm text-gray-500 mt-2">
              Available variables: <code className="bg-gray-100 px-2 py-1 rounded">{'{name}'}</code>, 
              <code className="bg-gray-100 px-2 py-1 rounded ml-1">{'{product_name}'}</code>, 
              <code className="bg-gray-100 px-2 py-1 rounded ml-1">{'{amount}'}</code>, 
              <code className="bg-gray-100 px-2 py-1 rounded ml-1">{'{payment_update_link}'}</code>
            </p>
          </div>

          <button 
            onClick={saveSettings}
            disabled={saving}
            className="w-full px-6 py-3 bg-teal-600 text-white font-semibold rounded-lg hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition flex items-center justify-center space-x-2"
          >
            {saving ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                <span>Save Settings</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 p-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-teal-600">ChurnGuard</h1>
          <p className="text-sm text-gray-500">Payment Recovery</p>
        </div>

        <nav className="space-y-2">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition ${
              activeTab === 'dashboard'
                ? 'bg-teal-50 text-teal-600 font-medium'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Home className="w-5 h-5" />
            <span>Dashboard</span>
          </button>

          <button
            onClick={() => setActiveTab('payments')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition ${
              activeTab === 'payments'
                ? 'bg-teal-50 text-teal-600 font-medium'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <AlertCircle className="w-5 h-5" />
            <span>Failed Payments</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition ${
              activeTab === 'settings'
                ? 'bg-teal-50 text-teal-600 font-medium'
                : 'text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Settings className="w-5 h-5" />
            <span>Settings</span>
          </button>
        </nav>

        <div className="absolute bottom-6 left-6 right-6 space-y-3">
          {/* User info */}
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center space-x-2 mb-2">
              <User className="w-4 h-4 text-gray-600" />
              <p className="text-xs font-medium text-gray-600">Signed in as:</p>
            </div>
            <p className="text-sm text-gray-900 truncate">{user?.email}</p>
          </div>

          {/* Sign out button */}
          <button
            onClick={signOut}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>

          <div className="bg-teal-50 rounded-lg p-4 border border-teal-200">
            <p className="text-xs font-medium text-teal-800 mb-1">Need Help?</p>
            <p className="text-xs text-teal-600">Check our documentation for setup guides</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="ml-64 p-8">
        {activeTab === 'dashboard' && <DashboardView />}
        {activeTab === 'payments' && <FailedPaymentsView />}
        {activeTab === 'settings' && <SettingsView />}
      </div>
    </div>
  );
}