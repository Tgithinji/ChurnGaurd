import Link from 'next/link'

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-teal-600 mb-4">
          🛡️ ChurnGuard
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Automated Payment Recovery System
        </p>
        <Link
          href="/dashboard"
          className="px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition"
        >
          Go to Dashboard
        </Link>
      </div>
    </main>
  )
}
