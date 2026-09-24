import { createContext, memo, useContext, useState } from '../../src/index.ts'
import { click, h, mount, tick } from '../mount.ts'

describe('useContext', () => {
  it('reads the provider value and the default', async () => {
    const Theme = createContext('ink')
    function Reader() {
      return h('span', null, useContext(Theme))
    }
    function App() {
      const [value, setValue] = useState('ink')
      return h(Theme.Provider, { value }, h(Reader, null), h('button', { onClick: () => setValue('cinnabar') }))
    }
    const bare = mount(h(Reader, null))
    expect(bare.host.textContent).toBe('ink')
    bare.unmount()
    const view = mount(h(App, null))
    click(view.host.querySelector('button')!)
    await tick()
    expect(view.host.querySelector('span')!.textContent).toBe('cinnabar')
    view.unmount()
  })

  it('rerenders a memoized reader when context changes', async () => {
    const Theme = createContext('ink')
    let renders = 0
    const Reader = memo(function Reader() {
      renders++
      return h('span', null, useContext(Theme))
    })
    function App() {
      const [value, setValue] = useState('ink')
      return h(Theme.Provider, { value }, h(Reader, null), h('button', { onClick: () => setValue('paper') }))
    }
    const view = mount(h(App, null))
    const before = renders
    click(view.host.querySelector('button')!)
    await tick()
    expect(renders).toBe(before + 1)
    expect(view.host.textContent).toContain('paper')
    view.unmount()
  })

  it('Consumer passes the current value', () => {
    const Slot = createContext(0)
    const view = mount(
      h(Slot.Provider, { value: 7 }, h(Slot.Consumer, null, (value: number) => h('b', null, String(value)))),
    )
    expect(view.host.textContent).toBe('7')
    view.unmount()
  })
})
