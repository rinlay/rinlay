import { StrictMode, useEffect, useState } from '../../src/index.ts'
import { effects, h, mount } from '../mount.ts'

describe('StrictMode', () => {
  it('renders children once', async () => {
    let renders = 0
    let effectsRan = 0
    function App() {
      renders++
      const [n] = useState(1)
      useEffect(() => {
        effectsRan++
      }, [])
      return h('span', null, String(n))
    }
    const view = mount(h(StrictMode, null, h(App, null)))
    await effects()
    expect(view.host.textContent).toBe('1')
    expect(renders).toBe(1)
    expect(effectsRan).toBe(1)
    view.unmount()
  })
})
