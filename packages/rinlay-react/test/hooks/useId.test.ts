import { useId, useState } from '../../src/index.ts'
import { click, h, mount, tick } from '../mount.ts'

describe('useId', () => {
  it('is stable across renders and different per component', async () => {
    const ids: string[] = []
    function Label() {
      const id = useId()
      ids.push(id)
      return h('label', { htmlFor: id }, id)
    }
    function App() {
      const [, setN] = useState(0)
      return h('div', null, h(Label, null), h(Label, null), h('button', { onClick: () => setN((n) => n + 1) }))
    }
    const view = mount(h(App, null))
    const first = ids.slice(0, 2)
    expect(first[0]).not.toBe(first[1])
    click(view.host.querySelector('button')!)
    await tick()
    expect(ids.slice(2, 4)).toEqual(first)
    view.unmount()
  })
})
