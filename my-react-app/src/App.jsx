import { useState, useEffect } from 'react'
import './App.css'

function App() {
  // Helper function to get tomorrow's date in YYYY-MM-DD format
  const getTomorrowDate = () => {
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow.toISOString().split('T')[0]
  }

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

  // Load todos and title from localStorage on mount
  useEffect(() => {
    const savedTodos = localStorage.getItem('todos')
    const savedTitle = localStorage.getItem('listTitle')
    if (savedTodos) {
      setTodos(JSON.parse(savedTodos))
    }
    if (savedTitle) {
      setListTitle(savedTitle)
      setTitleValue(savedTitle)
    }
  }, [])

  // Save todos to localStorage whenever todos change
  useEffect(() => {
    localStorage.setItem('todos', JSON.stringify(todos))
  }, [todos])

  // Save title to localStorage
  useEffect(() => {
    localStorage.setItem('listTitle', listTitle)
  }, [listTitle])

  const addTodo = () => {
    if (inputValue.trim() !== '') {
      const newTodo = {
        id: Date.now(),
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

  const deleteTodo = (id) => {
    setTodos(todos.filter(todo => todo.id !== id))
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

  const completedCount = todos.filter(todo => todo.completed).length
  const totalCount = todos.length
  const sortedTodos = sortTodos(todos)

  return (
    <div className="app">
      <div className="container">
        <header>
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
