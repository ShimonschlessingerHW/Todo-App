import { useState, useEffect } from 'react'
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from 'firebase/auth'
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  deleteDoc,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp
} from 'firebase/firestore'
import { auth, db } from './firebase'
import './App.css'

function App() {
  // Helper function to get tomorrow's date in YYYY-MM-DD format
  const getTomorrowDate = () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow.toISOString().split('T')[0]
  }

  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  
  // Auth form states
  const [showAuth, setShowAuth] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')

  const [todos, setTodos] = useState([])
  const [inputValue, setInputValue] = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editValue, setEditValue] = useState('')
  const [listTitle, setListTitle] = useState('My Todo List')
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleValue, setTitleValue] = useState('My Todo List')
  
  // Form fields for new todo
  const [dueDate, setDueDate] = useState(getTomorrowDate())
  const [dueTime, setDueTime] = useState('00:00')
  const [priority, setPriority] = useState('medium')
  const [className, setClassName] = useState('')
  
  // Sorting
  const [sortBy, setSortBy] = useState('none')

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      setLoading(false)
      if (currentUser) {
        loadUserData(currentUser.uid)
      } else {
        setTodos([])
        setListTitle('My Todo List')
        setTitleValue('My Todo List')
      }
    })
    return () => unsubscribe()
  }, [])

  // Load user data from Firestore
  const loadUserData = async (userId) => {
    try {
      // Load user settings (title)
      const userDocRef = doc(db, 'users', userId)
      const userDoc = await getDoc(userDocRef)
      if (userDoc.exists()) {
        const userData = userDoc.data()
        setListTitle(userData.listTitle || 'My Todo List')
        setTitleValue(userData.listTitle || 'My Todo List')
      }

      // Load todos
      const todosQuery = query(
        collection(db, 'todos'),
        where('userId', '==', userId)
      )
      const todosSnapshot = await getDocs(todosQuery)
      const loadedTodos = todosSnapshot.docs.map(doc => {
        const data = doc.data()
        return {
          id: data.id || doc.id, // Use stored id or fallback to doc id
          ...data
        }
      })
      setTodos(loadedTodos)
    } catch (error) {
      console.error('Error loading user data:', error)
    }
  }

  // Save todos to Firestore
  const saveTodosToFirestore = async (todosToSave) => {
    if (!user) return

    try {
      // Delete all existing todos for this user
      const todosQuery = query(
        collection(db, 'todos'),
        where('userId', '==', user.uid)
      )
      const todosSnapshot = await getDocs(todosQuery)
      const deletePromises = todosSnapshot.docs.map(doc => deleteDoc(doc.ref))
      await Promise.all(deletePromises)

      // Add all current todos
      const addPromises = todosToSave.map(todo => {
        return addDoc(collection(db, 'todos'), {
          ...todo,
          userId: user.uid,
          createdAt: todo.createdAt || serverTimestamp()
        })
      })
      await Promise.all(addPromises)
    } catch (error) {
      console.error('Error saving todos:', error)
    }
  }

  // Save title to Firestore
  const saveTitleToFirestore = async (title) => {
    if (!user) return

    try {
      const userDocRef = doc(db, 'users', user.uid)
      await setDoc(userDocRef, {
        listTitle: title,
        userId: user.uid
      }, { merge: true })
    } catch (error) {
      console.error('Error saving title:', error)
    }
  }

  // Save todos whenever they change
  useEffect(() => {
    if (user && todos.length >= 0) {
      saveTodosToFirestore(todos)
    }
  }, [todos, user])

  // Save title whenever it changes
  useEffect(() => {
    if (user && listTitle) {
      saveTitleToFirestore(listTitle)
    }
  }, [listTitle, user])

  const handleSignUp = async (e) => {
    e.preventDefault()
    setAuthError('')
    try {
      await createUserWithEmailAndPassword(auth, email, password)
      setShowAuth(false)
      setEmail('')
      setPassword('')
    } catch (error) {
      setAuthError(error.message)
    }
  }

  const handleSignIn = async (e) => {
    e.preventDefault()
    setAuthError('')
    try {
      await signInWithEmailAndPassword(auth, email, password)
      setShowAuth(false)
      setEmail('')
      setPassword('')
    } catch (error) {
      setAuthError(error.message)
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut(auth)
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  const addTodo = () => {
    if (inputValue.trim() !== '') {
      const newTodo = {
        id: Date.now().toString(),
        text: inputValue.trim(),
        completed: false,
        createdAt: new Date().toISOString(),
        dueDate: dueDate || null,
        dueTime: dueTime || null,
        priority: priority,
        className: className.trim() || null
      }
      setTodos([...todos, newTodo])
      setInputValue('')
      setDueDate(getTomorrowDate())
      setDueTime('00:00')
      setPriority('medium')
      setClassName('')
    }
  }

  const deleteTodo = async (id) => {
    setTodos(todos.filter(todo => todo.id !== id))
    if (user) {
      try {
        // Delete from Firestore
        const todosQuery = query(
          collection(db, 'todos'),
          where('userId', '==', user.uid)
        )
        const todosSnapshot = await getDocs(todosQuery)
        const todoDoc = todosSnapshot.docs.find(doc => {
          const data = doc.data()
          return data.id === id || doc.id === id
        })
        if (todoDoc) {
          await deleteDoc(todoDoc.ref)
        }
      } catch (error) {
        console.error('Error deleting todo:', error)
      }
    }
  }

  const toggleComplete = (id) => {
    setTodos(todos.map(todo =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    ))
  }

  const startEdit = (todo) => {
    setEditingId(todo.id)
    setEditValue(todo.text)
  }

  const saveEdit = (id) => {
    if (editValue.trim() !== '') {
      setTodos(todos.map(todo =>
        todo.id === id ? { ...todo, text: editValue.trim() } : todo
      ))
      setEditingId(null)
      setEditValue('')
    }
  }

  const cancelEdit = () => {
    setEditingId(null)
    setEditValue('')
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      addTodo()
    }
  }

  const handleEditKeyPress = (e, id) => {
    if (e.key === 'Enter') {
      saveEdit(id)
    } else if (e.key === 'Escape') {
      cancelEdit()
    }
  }

  const handleTitleKeyPress = (e) => {
    if (e.key === 'Enter') {
      saveTitle()
    } else if (e.key === 'Escape') {
      cancelTitleEdit()
    }
  }

  const startTitleEdit = () => {
    setEditingTitle(true)
    setTitleValue(listTitle)
  }

  const saveTitle = () => {
    if (titleValue.trim() !== '') {
      setListTitle(titleValue.trim())
    }
    setEditingTitle(false)
  }

  const cancelTitleEdit = () => {
    setEditingTitle(false)
    setTitleValue(listTitle)
  }

  const cyclePriority = (id) => {
    setTodos(todos.map(todo => {
      if (todo.id === id) {
        const priorities = ['low', 'medium', 'high']
        const currentIndex = priorities.indexOf(todo.priority || 'medium')
        const nextIndex = (currentIndex + 1) % priorities.length
        return { ...todo, priority: priorities[nextIndex] }
      }
      return todo
    }))
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return '#dc3545'
      case 'medium': return '#ffc107'
      case 'low': return '#28a745'
      default: return '#6c757d'
    }
  }

  const getPriorityLabel = (priority) => {
    switch (priority) {
      case 'high': return 'High'
      case 'medium': return 'Medium'
      case 'low': return 'Low'
      default: return 'Medium'
    }
  }

  const formatDateTime = (date, time) => {
    if (!date) return null
    const dateObj = new Date(date)
    const formattedDate = dateObj.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: dateObj.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
    })
    if (time) {
      const [hours, minutes] = time.split(':')
      const hour12 = hours % 12 || 12
      const ampm = hours >= 12 ? 'PM' : 'AM'
      return `${formattedDate} at ${hour12}:${minutes} ${ampm}`
    }
    return formattedDate
  }

  const isOverdue = (date, time) => {
    if (!date) return false
    const now = new Date()
    const due = new Date(date)
    if (time) {
      const [hours, minutes] = time.split(':')
      due.setHours(parseInt(hours), parseInt(minutes))
    }
    return due < now
  }

  const sortTodos = (todosToSort) => {
    if (sortBy === 'none') return todosToSort

    return [...todosToSort].sort((a, b) => {
      switch (sortBy) {
        case 'priority':
          const priorityOrder = { high: 3, medium: 2, low: 1 }
          return (priorityOrder[b.priority] || 2) - (priorityOrder[a.priority] || 2)
        
        case 'dueDate':
          if (!a.dueDate && !b.dueDate) return 0
          if (!a.dueDate) return 1
          if (!b.dueDate) return -1
          return new Date(a.dueDate) - new Date(b.dueDate)
        
        case 'className':
          if (!a.className && !b.className) return 0
          if (!a.className) return 1
          if (!b.className) return -1
          return a.className.localeCompare(b.className)
        
        case 'completed':
          return a.completed - b.completed
        
        default:
          return 0
      }
    })
  }

  if (loading) {
    return (
      <div className="app">
        <div className="loading-container">
          <div className="loading-spinner">Loading...</div>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="app">
        <div className="container auth-container">
          <header>
            <h1>✨ Todo App</h1>
            <p className="subtitle">Sign in to manage your todos</p>
          </header>
          
          {showAuth ? (
            <div className="auth-form-container">
              <h2>{isSignUp ? 'Sign Up' : 'Sign In'}</h2>
              <form onSubmit={isSignUp ? handleSignUp : handleSignIn} className="auth-form">
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="auth-input"
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="auth-input"
                  minLength={6}
                />
                {authError && <div className="auth-error">{authError}</div>}
                <button type="submit" className="auth-button">
                  {isSignUp ? 'Sign Up' : 'Sign In'}
                </button>
                <button
                  type="button"
                  className="auth-switch"
                  onClick={() => {
                    setIsSignUp(!isSignUp)
                    setAuthError('')
                  }}
                >
                  {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
                </button>
              </form>
            </div>
          ) : (
            <div className="auth-options">
              <button className="auth-button" onClick={() => setShowAuth(true)}>
                Sign In / Sign Up
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

  const completedCount = todos.filter(todo => todo.completed).length
  const totalCount = todos.length
  const sortedTodos = sortTodos(todos)

  return (
    <div className="app">
      <div className="container">
        <header>
          <div className="header-top">
            <div className="user-info">
              <span className="user-email">{user.email}</span>
              <button className="sign-out-button" onClick={handleSignOut}>
                Sign Out
              </button>
            </div>
          </div>
          {editingTitle ? (
            <div className="title-edit">
              <input
                type="text"
                className="title-input"
                value={titleValue}
                onChange={(e) => setTitleValue(e.target.value)}
                onKeyDown={handleTitleKeyPress}
                onBlur={saveTitle}
                autoFocus
              />
            </div>
          ) : (
            <div className="title-display">
              <h1 onClick={startTitleEdit} className="editable-title">
                ✨ {listTitle}
              </h1>
              <button 
                className="edit-title-button"
                onClick={startTitleEdit}
                aria-label="Edit title"
              >
                ✏️
              </button>
            </div>
          )}
          <p className="subtitle">Stay organized and get things done</p>
        </header>

        <div className="input-section">
          <div className="input-wrapper">
            <input
              type="text"
              className="todo-input"
              placeholder="What needs to be done?"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
            />
            <button className="add-button" onClick={addTodo}>
              <span>+</span>
            </button>
          </div>
          
          <div className="todo-form-fields">
            <div className="form-row">
              <div className="form-group">
                <label>Due Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Due Time</label>
                <input
                  type="time"
                  className="form-input"
                  value={dueTime}
                  onChange={(e) => setDueTime(e.target.value)}
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Priority</label>
                <select
                  className="form-input"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div className="form-group">
                <label>Class</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g., Math, English"
                  value={className}
                  onChange={(e) => setClassName(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>

        {totalCount > 0 && (
          <div className="controls-section">
            <div className="stats">
              <span>
                {completedCount} of {totalCount} completed
              </span>
            </div>
            <div className="sort-controls">
              <label>Sort by:</label>
              <select
                className="sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
              >
                <option value="none">None</option>
                <option value="priority">Priority</option>
                <option value="dueDate">Due Date</option>
                <option value="className">Class</option>
                <option value="completed">Completion Status</option>
              </select>
            </div>
          </div>
        )}

        <div className="todos-container">
          {todos.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📝</div>
              <p>No todos yet. Add one above to get started!</p>
            </div>
          ) : (
            <ul className="todo-list">
              {sortedTodos.map(todo => {
                const dueDateTime = formatDateTime(todo.dueDate, todo.dueTime)
                const overdue = isOverdue(todo.dueDate, todo.dueTime)
                
                return (
                  <li
                    key={todo.id}
                    className={`todo-item ${todo.completed ? 'completed' : ''} ${editingId === todo.id ? 'editing' : ''} priority-${todo.priority}`}
                  >
                    {editingId === todo.id ? (
                      <div className="edit-mode">
                        <input
                          type="text"
                          className="edit-input"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => handleEditKeyPress(e, todo.id)}
                          autoFocus
                        />
                        <div className="edit-actions">
                          <button
                            className="save-button"
                            onClick={() => saveEdit(todo.id)}
                          >
                            ✓
                          </button>
                          <button
                            className="cancel-button"
                            onClick={cancelEdit}
                          >
                            ✕
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="todo-content">
                          <button
                            className={`checkbox ${todo.completed ? 'checked' : ''}`}
                            onClick={() => toggleComplete(todo.id)}
                            aria-label={todo.completed ? 'Mark as incomplete' : 'Mark as complete'}
                          >
                            {todo.completed && <span>✓</span>}
                          </button>
                          <div className="todo-info">
                            <span className="todo-text">{todo.text}</span>
                            <div className="todo-meta">
                              {todo.className && (
                                <span className="todo-class">📚 {todo.className}</span>
                              )}
                              {dueDateTime && (
                                <span className={`todo-due ${overdue && !todo.completed ? 'overdue' : ''}`}>
                                  📅 {dueDateTime}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="todo-actions">
                          <button
                            className="priority-button"
                            onClick={() => cyclePriority(todo.id)}
                            style={{ backgroundColor: getPriorityColor(todo.priority) }}
                            title={`Priority: ${getPriorityLabel(todo.priority)}`}
                            aria-label={`Priority: ${getPriorityLabel(todo.priority)}`}
                          >
                            {getPriorityLabel(todo.priority)[0]}
                          </button>
                          <button
                            className="edit-button"
                            onClick={() => startEdit(todo)}
                            aria-label="Edit todo"
                          >
                            ✏️
                          </button>
                          <button
                            className="delete-button"
                            onClick={() => deleteTodo(todo.id)}
                            aria-label="Delete todo"
                          >
                            🗑️
                          </button>
                        </div>
                      </>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

export default App
