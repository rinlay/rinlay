import { useCallback, useState } from '../../src/index.ts'
import { click, h, mount, tick } from '../mount.ts'

describe('useCallback', () => {
  it('returns the same function until deps change', async () => {
    const seen: Array<() => number> = []
    function App() {
      const [n, setN] = useState(1)
      const [other, setOther] = useState(0)
      const read = useCallback(() => n, [n])
      seen.push(read)
      return h(
        'div',
        null,
        h('button', { id: 'n', onClick: () => setN(n + 1) }),
        h('button', { id: 'o', onClick: () => setOther(other + 1) }),
      )
    }
    const view = mount(h(App, null))
    click(view.host.querySelector('#o')!)
    await tick()
    expect(seen[1]).toBe(seen[0])
    click(view.host.querySelector('#n')!)
    await tick()
    expect(seen[2]).not.toBe(seen[0])
    expect(seen[2]!()).toBe(2)
    view.unmount()
  })
})
