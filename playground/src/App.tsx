import { useState } from 'react'

type Todo = {
  id: number
  text: string
  done: boolean
}

let nextId = 1

export default function App() {
  const [todos, setTodos] = useState<Todo[]>([
    { id: nextId++, text: 'Write a rinlay-react', done: true },
    { id: nextId++, text: 'Build a todo list', done: false },
  ])

  const remaining = todos.filter((t) => !t.done).length

  function addTodo(e: Event) {
    e.preventDefault()
    const form = e.target as HTMLFormElement
    const input = form.elements.namedItem('todo') as HTMLInputElement
    const value = input.value.trim()
    if (!value) return
    setTodos((list) => [...list, { id: nextId++, text: value, done: false }])
    input.value = ''
  }

  function toggle(id: number) {
    setTodos((list) =>
      list.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
    )
  }

  function remove(id: number) {
    setTodos((list) => list.filter((t) => t.id !== id))
  }

  function clearDone() {
    setTodos((list) => list.filter((t) => !t.done))
  }

  return (
    <div className="todo">
      <header className="todo-header">
        <h1>todos</h1>
        <p>{remaining === 0 ? 'All done' : `${remaining} left`}</p>
      </header>

      <form className="todo-form" onSubmit={addTodo}>
        <input
          className="todo-input"
          name="todo"
          placeholder="What needs to be done?"
          autocomplete="off"
        />
        <button className="todo-add" type="submit">
          Add
        </button>
      </form>

      <ul className="todo-list">
        {todos.map((todo) => (
          <li className={todo.done ? 'todo-item is-done' : 'todo-item'} key={todo.id}>
            <label className="todo-label">
              <input
                type="checkbox"
                checked={todo.done}
                onChange={() => toggle(todo.id)}
              />
              <span>{todo.text}</span>
            </label>
            <button
              className="todo-remove"
              type="button"
              onClick={() => remove(todo.id)}
              aria-label="Remove"
            >
              ×
            </button>
          </li>
        ))}
      </ul>

      {todos.some((t) => t.done) ? (
        <button className="todo-clear" type="button" onClick={clearDone}>
          Clear completed
        </button>
      ) : null}
    </div>
  )
}
