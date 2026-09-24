import { memo, useState } from '../../src/index.ts'
import { click, h, mount, tick } from '../mount.ts'

describe('memo', () => {
  it('skips render when props are shallow-equal', async () => {
    let renders = 0
    const Row = memo(function Row({ n }: { n: number }) {
      renders++
      return h('span', null, String(n))
    })
    function App() {
      const [n] = useState(1)
      const [x, setX] = useState(0)
      return h('div', null, h(Row, { n }), h('button', { onClick: () => setX(x + 1) }))
    }
    const view = mount(h(App, null))
    const before = renders
    click(view.host.querySelector('button')!)
    await tick()
    expect(renders).toBe(before)
    view.unmount()
  })

  it('uses a custom compare', async () => {
    let renders = 0
    const Row = memo(
      function Row({ n }: { n: number }) {
        renders++
        return h('span', null, String(n))
      },
      () => false,
    )
    function App() {
      const [x, setX] = useState(0)
      return h('div', null, h(Row, { n: 1 }), h('button', { onClick: () => setX(x + 1) }))
    }
    const view = mount(h(App, null))
    const before = renders
    click(view.host.querySelector('button')!)
    await tick()
    expect(renders).toBe(before + 1)
    view.unmount()
  })
})
