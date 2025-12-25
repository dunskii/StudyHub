import { Routes, Route } from 'react-router-dom'

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<div>Login</div>} />
        <Route path="/dashboard" element={<div>Dashboard</div>} />
        <Route path="/subjects" element={<div>Subjects</div>} />
        <Route path="/tutor" element={<div>AI Tutor</div>} />
        <Route path="/revision" element={<div>Revision</div>} />
        <Route path="/notes" element={<div>Notes</div>} />
        <Route path="/parent" element={<div>Parent Dashboard</div>} />
      </Routes>
    </div>
  )
}

function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center">
      <h1 className="text-4xl font-bold text-gray-900">StudyHub</h1>
      <p className="mt-4 text-lg text-gray-600">
        AI-powered study assistant with curriculum integration
      </p>
      <div className="mt-8 flex gap-4">
        <a
          href="/login"
          className="rounded-lg bg-blue-600 px-6 py-3 text-white hover:bg-blue-700"
        >
          Get Started
        </a>
        <a
          href="/dashboard"
          className="rounded-lg border border-gray-300 px-6 py-3 text-gray-700 hover:bg-gray-50"
        >
          Dashboard
        </a>
      </div>
    </div>
  )
}

export default App
