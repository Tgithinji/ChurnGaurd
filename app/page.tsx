// ============================================
// 11. UPDATED HOME PAGE (app/page.tsx)
// ============================================
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-blue-50">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-2xl font-bold text-teal-600">🛡️ ChurnGuard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/login"
                className="px-4 py-2 text-gray-700 hover:text-teal-600 transition"
              >
                Sign In
              </Link>
              <Link
                href="/login"
                className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Recover Lost Revenue on Autopilot
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Automatically detect failed Stripe payments and recover them with smart email notifications. 
            Never lose subscription revenue again.
          </p>
          <div className="flex justify-center space-x-4">
            <Link
              href="/login"
              className="px-8 py-4 bg-teal-600 text-white rounded-lg text-lg font-semibold hover:bg-teal-700 transition"
            >
              Start Free Trial
            </Link>
            <Link
              href="#features"
              className="px-8 py-4 bg-white text-teal-600 border-2 border-teal-600 rounded-lg text-lg font-semibold hover:bg-teal-50 transition"
            >
              Learn More
            </Link>
          </div>
        </div>

        {/* Features */}
        <div id="features" className="mt-32 grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
            <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl">🔄</span>
            </div>
            <h3 className="text-xl font-semibold mb-2">Automatic Detection</h3>
            <p className="text-gray-600">
              Instantly detect failed payments through Stripe webhooks and trigger recovery workflows.
            </p>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
            <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl">📧</span>
            </div>
            <h3 className="text-xl font-semibold mb-2">Smart Notifications</h3>
            <p className="text-gray-600">
              Send personalized recovery emails with customizable templates and retry schedules.
            </p>
          </div>

          <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
            <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center mb-4">
              <span className="text-2xl">📊</span>
            </div>
            <h3 className="text-xl font-semibold mb-2">Real-time Analytics</h3>
            <p className="text-gray-600">
              Track recovery rates, revenue recovered, and optimize your payment recovery strategy.
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-32 bg-white rounded-xl shadow-lg p-12">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <p className="text-4xl font-bold text-teal-600 mb-2">45%</p>
              <p className="text-gray-600">Average Recovery Rate</p>
            </div>
            <div>
              <p className="text-4xl font-bold text-teal-600 mb-2">$50k+</p>
              <p className="text-gray-600">Revenue Recovered Monthly</p>
            </div>
            <div>
              <p className="text-4xl font-bold text-teal-600 mb-2">24hrs</p>
              <p className="text-gray-600">Average Recovery Time</p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-32 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Ready to recover lost revenue?
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Join hundreds of businesses using ChurnGuard
          </p>
          <Link
            href="/login"
            className="inline-block px-8 py-4 bg-teal-600 text-white rounded-lg text-lg font-semibold hover:bg-teal-700 transition"
          >
            Get Started Free
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center text-gray-600">
            <p>&copy; 2025 ChurnGuard. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}