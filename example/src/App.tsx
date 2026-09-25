import { useState } from 'react'

export default function App() {
  const [count, setCount] = useState(0)

  return (
    <main className="app">
      <p className="kicker">example</p>
      <h1>Hello, world.</h1>
      <p className="lead">Edit <code>src/App.tsx</code> and save to reload.</p>
      <button className="btn" type="button" onClick={() => setCount((n) => n + 1)}>
        Count: {count}
      </button>
    </main>
  )
}
