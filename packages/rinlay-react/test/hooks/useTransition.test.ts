import { startTransition, useState, useTransition } from '../../src/index.ts'
import { click, h, mount, tick } from '../mount.ts'

describe('useTransition', () => {
  it('runs the transition scope and settles pending', async () => {
    function App() {
      const [n, setN] = useState(0)
      const [pending, start] = useTransition()
      return h(
        'button',
        { onClick: () => start(() => setN(n + 1)) },
        `${pending ? 'pending' : 'idle'}:${n}`,
      )
    }
    const view = mount(h(App, null))
    click(view.host.querySelector('button')!)
    await tick()
    expect(view.host.textContent).toBe('idle:1')
    view.unmount()
  })

  it('startTransition runs its scope immediately', () => {
    let ran = false
    startTransition(() => {
      ran = true
    })
    expect(ran).toBe(true)
  })
})
