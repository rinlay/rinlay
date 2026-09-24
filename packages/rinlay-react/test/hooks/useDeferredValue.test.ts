import { useDeferredValue, useState } from '../../src/index.ts'
import { click, effects, h, mount, tick } from '../mount.ts'

describe('useDeferredValue', () => {
  it('lags one effect behind the latest value', async () => {
    function App() {
      const [n, setN] = useState(1)
      const deferred = useDeferredValue(n)
      return h('button', { onClick: () => setN(2) }, `${n}/${deferred}`)
    }
    const view = mount(h(App, null))
    expect(view.host.textContent).toBe('1/1')
    click(view.host.querySelector('button')!)
    await tick()
    expect(view.host.textContent).toBe('2/1')
    await effects()
    expect(view.host.textContent).toBe('2/2')
    view.unmount()
  })
})
