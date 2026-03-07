export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-6">
      <div className="max-w-2xl text-center">
        <h1 className="text-5xl font-bold mb-6">SupportCoach AI</h1>

        <p className="text-lg text-gray-300 mb-8">
          AI-powered platform that analyzes customer support conversations
          to detect churn risk, coach agents, and improve support quality.
        </p>

        <div className="bg-gray-900 p-6 rounded-xl border border-gray-700">
          <h2 className="text-2xl font-semibold mb-4">Phase 1 MVP</h2>

          <ul className="text-left space-y-2 text-gray-300">
            <li>• Upload support chat transcripts</li>
            <li>• AI analyzes conversation quality</li>
            <li>• Detect churn-risk conversations</li>
            <li>• Generate coaching feedback</li>
            <li>• Manager dashboard with insights</li>
          </ul>
        </div>
      </div>
    </main>
  );
}