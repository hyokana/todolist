import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './auth/AuthContext.jsx'
import Login from './pages/auth/Login.jsx'
import Todos from './pages/todos/Todos.jsx'
import './App.css'

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  return children
}

function App() {
  const { isAuthenticated } = useAuth()

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/todos" replace /> : <Login />}
      />

      <Route
        path="/todos"
        element={
          <ProtectedRoute>
            <Todos />
          </ProtectedRoute>
        }
      />

      {/* Root: send to todos if logged in, else login */}
      <Route
        path="*"
        element={
          <Navigate to={isAuthenticated ? '/todos' : '/login'} replace />
        }
      />
    </Routes>
  )
}

export default App
