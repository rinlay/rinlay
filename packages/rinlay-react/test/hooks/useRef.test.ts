import { useRef, useState } from '../../src/index.ts'
import { click, h, mount, tick } from '../mount.ts'

describe('useRef', () => {
  it('keeps the same object and the current value across renders', async () => {
    let seen: { current: number } | null = null
    function App() {
      const ref = useRef(1)
      const [n, setN] = useState(0)
      if (!seen) seen = ref
      else expect(ref).toBe(seen)
      return h('button', { onClick: () => { ref.current += 1; setN(n + 1) } }, String(ref.current))
    }
    const view = mount(h(App, null))
    click(view.host.querySelector('button')!)
    await tick()
    expect(view.host.textContent).toBe('2')
    view.unmount()
  })

  it('points a DOM ref at the host node', () => {
    let node: HTMLElement | null = null
    function App() {
      return h('div', { id: 'box', ref: (el: HTMLElement | null) => { node = el } }, 'hi')
    }
    const view = mount(h(App, null))
    expect(node).toBe(view.host.querySelector('#box'))
    view.unmount()
    expect(node).toBeNull()
  })
})
