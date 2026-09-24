import { useMemo, useState } from '../../src/index.ts'
import { click, h, mount, tick } from '../mount.ts'

describe('useMemo', () => {
  it('recomputes only when deps change', async () => {
    let calls = 0
    function App() {
      const [n, setN] = useState(2)
      const [other, setOther] = useState(0)
      const doubled = useMemo(() => {
        calls++
        return n * 2
      }, [n])
      return h(
        'div',
        null,
        h('span', null, String(doubled)),
        h('button', { id: 'n', onClick: () => setN(n + 1) }),
        h('button', { id: 'o', onClick: () => setOther(other + 1) }),
      )
    }
    const view = mount(h(App, null))
    expect(view.host.querySelector('span')!.textContent).toBe('4')
    expect(calls).toBe(1)
    click(view.host.querySelector('#o')!)
    await tick()
    expect(calls).toBe(1)
    click(view.host.querySelector('#n')!)
    await tick()
    expect(calls).toBe(2)
    expect(view.host.querySelector('span')!.textContent).toBe('6')
    view.unmount()
  })
})
