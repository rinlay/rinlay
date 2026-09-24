import { Suspense, createContext, use, useState } from '../../src/index.ts'
import { click, h, mount, tick } from '../mount.ts'

describe('use', () => {
  it('reads context', () => {
    const Slot = createContext('slot')
    function App() {
      return h('span', null, use(Slot))
    }
    const view = mount(h(Slot.Provider, { value: 'island' }, h(App, null)))
    expect(view.host.textContent).toBe('island')
    view.unmount()
  })

  it('suspends on a promise and renders the value after it resolves', async () => {
    let resolve: (value: string) => void = () => {}
    const promise = new Promise<string>((done) => {
      resolve = done
    })
    function App() {
      return h('b', null, use(promise))
    }
    const view = mount(h(Suspense, { fallback: h('i', null, 'wait') }, h(App, null)))
    expect(view.host.textContent).toBe('wait')
    resolve('ready')
    await promise
    await tick()
    expect(view.host.textContent).toBe('ready')
    view.unmount()
  })

  it('throws when a promise has no Suspense boundary', () => {
    function App() {
      use(Promise.resolve('x'))
      return null
    }
    expect(() => mount(h(App, null))).toThrow(/Suspense/)
  })

  it('rejects a bad argument', () => {
    function App() {
      const [flag] = useState(true)
      if (flag) use(1 as never)
      return null
    }
    expect(() => mount(h(App, null))).toThrow(/context or a promise/)
  })
})
