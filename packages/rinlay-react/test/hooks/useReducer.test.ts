import { useReducer } from '../../src/index.ts'
import { click, h, mount, tick } from '../mount.ts'

describe('useReducer', () => {
  it('dispatches and keeps a stable dispatch', async () => {
    const seen: Array<(action: number) => void> = []
    function App() {
      const [n, dispatch] = useReducer((state: number, action: number) => state + action, 1, (n) => n + 1)
      seen.push(dispatch)
      return h('button', { onClick: () => dispatch(2) }, String(n))
    }
    const view = mount(h(App, null))
    expect(view.host.textContent).toBe('2')
    click(view.host.querySelector('button')!)
    await tick()
    expect(view.host.textContent).toBe('4')
    expect(seen[0]).toBe(seen[1])
    view.unmount()
  })
})
