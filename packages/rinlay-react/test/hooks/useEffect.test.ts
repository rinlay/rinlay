import { useEffect, useState } from '../../src/index.ts'
import { click, effects, h, mount } from '../mount.ts'

describe('useEffect', () => {
  it('runs after paint and cleans up when deps change or unmount', async () => {
    const log: string[] = []
    function Child({ n }: { n: number }) {
      useEffect(() => {
        log.push(`run ${n}`)
        return () => log.push(`clean ${n}`)
      }, [n])
      return h('i', null, String(n))
    }
    function App() {
      const [n, setN] = useState(1)
      const [on, setOn] = useState(true)
      return h(
        'div',
        null,
        on ? h(Child, { n }) : null,
        h('button', { id: 'n', onClick: () => setN(n + 1) }),
        h('button', { id: 'off', onClick: () => setOn(false) }),
      )
    }
    const view = mount(h(App, null))
    await effects()
    expect(log).toEqual(['run 1'])
    click(view.host.querySelector('#n')!)
    await effects()
    expect(log).toEqual(['run 1', 'clean 1', 'run 2'])
    click(view.host.querySelector('#off')!)
    await effects()
    expect(log.at(-1)).toBe('clean 2')
    view.unmount()
  })
})
