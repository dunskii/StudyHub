import { Routes, Route } from 'react-router-dom'
import { TutorPage } from '@/pages/TutorPage'
import { NotesPage } from '@/pages/NotesPage'
import { AuthGuard } from '@/features/auth/AuthGuard'

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<div>Login</div>} />
        <Route path="/dashboard" element={<div>Dashboard</div>} />
        <Route path="/subjects" element={<div>Subjects</div>} />
        <Route path="/tutor" element={
          <AuthGuard requireStudent>
            <TutorPage />
          </AuthGuard>
        } />
        <Route path="/revision" element={<div>Revision</div>} />
        <Route path="/notes" element={
          <AuthGuard requireStudent>
            <NotesPage />
          </AuthGuard>
        } />
        <Route path="/parent" element={<div>Parent Dashboard</div>} />
        <Route path="/select-student" element={<div>Select Student</div>} />
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
