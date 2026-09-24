import { useState } from '../../src/index.ts'
import { click, h, mount, tick } from '../mount.ts'

describe('useState', () => {
  it('uses a lazy initial value once', async () => {
    let calls = 0
    function App() {
      const [n, setN] = useState(() => {
        calls++
        return 1
      })
      return h('button', { onClick: () => setN(n + 1) }, String(n))
    }
    const view = mount(h(App, null))
    expect(calls).toBe(1)
    click(view.host.querySelector('button')!)
    await tick()
    expect(view.host.textContent).toBe('2')
    expect(calls).toBe(1)
    view.unmount()
  })

  it('applies functional updates in order', async () => {
    function App() {
      const [n, setN] = useState(0)
      return h(
        'button',
        {
          onClick: () => {
            setN((v) => v + 1)
            setN((v) => v + 1)
          },
        },
        String(n),
      )
    }
    const view = mount(h(App, null))
    click(view.host.querySelector('button')!)
    await tick()
    expect(view.host.textContent).toBe('2')
    view.unmount()
  })

  it('keeps child state when the parent rerenders', async () => {
    function Child() {
      const [n, setN] = useState(1)
      return h('span', { id: 'child', onClick: () => setN(n + 1) }, String(n))
    }
    function App() {
      const [tickCount, setTick] = useState(0)
      return h('div', null, h(Child, null), h('button', { onClick: () => setTick(tickCount + 1) }, 'p'))
    }
    const view = mount(h(App, null))
    click(view.host.querySelector('#child')!)
    await tick()
    click(view.host.querySelector('button')!)
    await tick()
    expect(view.host.querySelector('#child')!.textContent).toBe('2')
    view.unmount()
  })

  it('throws outside a component', () => {
    expect(() => useState(0)).toThrow(/inside a component/)
  })
})
