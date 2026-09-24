import { createPortal, useState } from '../../src/index.ts'
import { click, h, mount, tick } from '../mount.ts'

describe('createPortal', () => {
  it('mounts children into another node and removes them on unmount', async () => {
    const slot = document.createElement('div')
    document.body.appendChild(slot)
    function App() {
      const [n, setN] = useState(1)
      return h('div', null, 'host', createPortal(h('b', { onClick: () => setN(n + 1) }, String(n)), slot))
    }
    const view = mount(h(App, null))
    expect(view.host.textContent).toBe('host')
    expect(slot.textContent).toBe('1')
    click(slot.querySelector('b')!)
    await tick()
    expect(slot.textContent).toBe('2')
    view.unmount()
    expect(slot.textContent).toBe('')
    slot.remove()
  })
})
