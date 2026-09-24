import { Profiler, useState } from '../../src/index.ts'
import { click, h, mount, tick } from '../mount.ts'

describe('Profiler', () => {
  it('reports mount and update', async () => {
    const phases: string[] = []
    function App() {
      const [n, setN] = useState(0)
      return h(Profiler, {
        id: 'app',
        onRender: (id: string, phase: string) => phases.push(`${id}:${phase}`),
      }, h('button', { onClick: () => setN(n + 1) }, String(n)))
    }
    const view = mount(h(App, null))
    click(view.host.querySelector('button')!)
    await tick()
    expect(phases).toEqual(['app:mount', 'app:update'])
    view.unmount()
  })
})
