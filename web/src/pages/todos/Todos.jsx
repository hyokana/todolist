import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../auth/AuthContext.jsx'
import './Todos.css'

const API = 'http://localhost:8000/api'

function Todos() {
  const { user, token, logout } = useAuth()

  const [todos, setTodos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // modal: null = closed, {} = create, {id, title} = edit
  const [modal, setModal] = useState(null)
  const [modalTitle, setModalTitle] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(null)

  // filter: 'all' | 'active' | 'done'
  const [filter, setFilter] = useState('all')

  const authHeaders = useCallback(
    (extra = {}) => ({
      Authorization: `Bearer ${token}`,
      ...extra,
    }),
    [token],
  )

  const request = useCallback(
    async (path, options = {}) => {
      const res = await fetch(`${API}${path}`, options)
      if (res.status === 401) {
        logout()
        throw new Error('Session expired. Please log in again.')
      }
      if (!res.ok) {
        let detail = 'Request failed'
        try {
          const body = await res.json()
          detail = body.detail || detail
        } catch {
          // ignore parse error
        }
        throw new Error(detail)
      }
      return res.status === 204 ? null : res.json()
    },
    [logout],
  )

  const loadTodos = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await request('/todos', { headers: authHeaders() })
      setTodos(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [request, authHeaders])

  useEffect(() => {
    loadTodos()
  }, [loadTodos])

  const openCreate = () => {
    setModal({})
    setModalTitle('')
    setError('')
  }

  const openEdit = (todo) => {
    setModal({ id: todo.id, title: todo.title })
    setModalTitle(todo.title)
    setError('')
  }

  const closeModal = () => setModal(null)

  const saveModal = async (e) => {
    e.preventDefault()
    const title = modalTitle.trim()
    if (!title) {
      setError('Title is required.')
      return
    }
    try {
      if (modal.id) {
        const updated = await request(`/todos/${modal.id}`, {
          method: 'PATCH',
          headers: authHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({ title }),
        })
        setTodos((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
      } else {
        const created = await request('/todos', {
          method: 'POST',
          headers: authHeaders({ 'Content-Type': 'application/json' }),
          body: JSON.stringify({ title }),
        })
        setTodos((prev) => [...prev, created])
      }
      closeModal()
    } catch (err) {
      setError(err.message)
    }
  }

  const toggleStatus = async (todo) => {
    try {
      const updated = await request(`/todos/${todo.id}`, {
        method: 'PATCH',
        headers: authHeaders({ 'Content-Type': 'application/json' }),
        body: JSON.stringify({ completed: !todo.completed }),
      })
      setTodos((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
    } catch (err) {
      setError(err.message)
    }
  }

  const removeTodo = async (id) => {
    try {
      await request(`/todos/${id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      })
      setTodos((prev) => prev.filter((t) => t.id !== id))
      setConfirmDelete(null)
    } catch (err) {
      setError(err.message)
    }
  }

  const { done, total, pct } = useMemo(() => {
    const total = todos.length
    const done = todos.filter((t) => t.completed).length
    return { done, total, pct: total ? Math.round((done / total) * 100) : 0 }
  }, [todos])

  const visibleTodos = useMemo(() => {
    if (filter === 'active') return todos.filter((t) => !t.completed)
    if (filter === 'done') return todos.filter((t) => t.completed)
    return todos
  }, [todos, filter])

  const initial = (user?.name || 'U').trim().charAt(0).toUpperCase()

  return (
    <div className="todos">
      <div className="todos-card">
        <header className="todos-head">
          <div className="todos-head-main">
            <div className="todos-avatar" aria-hidden="true">
              {initial}
            </div>
            <div>
              <h1>Todo List</h1>
              <p>Welcome back{user?.name ? `, ${user.name}` : ''}.</p>
            </div>
          </div>
          <button type="button" className="btn-ghost" onClick={logout}>
            Log out
          </button>
        </header>

        <section className="todos-stats" aria-label="Progress">
          <div className="stat">
            <span className="stat-num">{total}</span>
            <span className="stat-label">Total</span>
          </div>
          <div className="stat">
            <span className="stat-num">{total - done}</span>
            <span className="stat-label">Active</span>
          </div>
          <div className="stat">
            <span className="stat-num">{done}</span>
            <span className="stat-label">Done</span>
          </div>
          <div className="stat stat-progress">
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${pct}%` }} />
            </div>
            <span className="stat-label">{pct}% complete</span>
          </div>
        </section>

        {error && (
          <div className="todos-banner" role="alert">
            {error}
          </div>
        )}

        <div className="todos-toolbar">
          <span className="todos-toolbar-title">Your tasks</span>
          <div className="todos-toolbar-actions">
            <div className="select-wrap">
              <select
                className="filter-select"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                aria-label="Filter todos"
              >
                <option value="all">All ({total})</option>
                <option value="active">Active ({total - done})</option>
                <option value="done">Done ({done})</option>
              </select>
              <span className="select-chevron" aria-hidden="true">
                ▾
              </span>
            </div>
            <button type="button" className="btn-primary" onClick={openCreate}>
              <span aria-hidden="true">＋</span> New todo
            </button>
          </div>
        </div>

        {loading ? (
          <div className="todos-empty">
            <div className="spinner" aria-hidden="true" />
            <p>Loading your todos…</p>
          </div>
        ) : todos.length === 0 ? (
          <div className="todos-empty">
            <div className="empty-icon" aria-hidden="true">
              🗒️
            </div>
            <p className="empty-title">Nothing here yet</p>
            <p className="empty-sub">Create your first todo to get going.</p>
            <button type="button" className="btn-primary" onClick={openCreate}>
              <span aria-hidden="true">＋</span> New todo
            </button>
          </div>
        ) : visibleTodos.length === 0 ? (
          <div className="todos-empty">
            <div className="empty-icon" aria-hidden="true">
              🔍
            </div>
            <p className="empty-title">
              No {filter === 'done' ? 'completed' : 'active'} todos
            </p>
            <p className="empty-sub">Try a different filter.</p>
            <button
              type="button"
              className="btn-ghost"
              onClick={() => setFilter('all')}
            >
              Show all
            </button>
          </div>
        ) : (
          <ul className="todos-list">
            {visibleTodos.map((todo) => (
              <li
                key={todo.id}
                className={`todo-item ${todo.completed ? 'is-done' : ''}`}
              >
                <button
                  type="button"
                  className="todo-check"
                  aria-pressed={todo.completed}
                  aria-label={
                    todo.completed ? 'Mark as active' : 'Mark as done'
                  }
                  onClick={() => toggleStatus(todo)}
                >
                  <svg viewBox="0 0 24 24" width="14" height="14">
                    <path
                      d="M20 6 9 17l-5-5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
                <span className="todo-title">{todo.title}</span>
                <span className="todo-id">#{todo.id}</span>
                <div className="todo-actions">
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => openEdit(todo)}
                    aria-label="Edit todo"
                    title="Edit"
                  >
                    ✎
                  </button>
                  <button
                    type="button"
                    className="icon-btn icon-btn-danger"
                    onClick={() => setConfirmDelete(todo)}
                    aria-label="Delete todo"
                    title="Delete"
                  >
                    🗑
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {modal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{modal.id ? 'Edit todo' : 'New todo'}</h2>
            <form onSubmit={saveModal}>
              <input
                autoFocus
                type="text"
                placeholder="What needs doing?"
                value={modalTitle}
                onChange={(e) => setModalTitle(e.target.value)}
              />
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={closeModal}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="modal-overlay" onClick={() => setConfirmDelete(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Delete todo</h2>
            <p>Delete “{confirmDelete.title}”? This can’t be undone.</p>
            <div className="modal-actions">
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setConfirmDelete(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-danger"
                onClick={() => removeTodo(confirmDelete.id)}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Todos
