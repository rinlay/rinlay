import { useSyncExternalStore } from '../../src/index.ts'
import { click, h, mount, tick } from '../mount.ts'

describe('useSyncExternalStore', () => {
  it('renders the snapshot and updates when the store changes', async () => {
    let value = 1
    const listeners = new Set<() => void>()
    function App() {
      const n = useSyncExternalStore(
        (onChange) => {
          listeners.add(onChange)
          return () => listeners.delete(onChange)
        },
        () => value,
      )
      return h('span', null, String(n))
    }
    const view = mount(h(App, null))
    expect(view.host.textContent).toBe('1')
    value = 4
    listeners.forEach((fn) => fn())
    await tick()
    expect(view.host.textContent).toBe('4')
    view.unmount()
    expect(listeners.size).toBe(0)
    click(view.host)
  })
})
