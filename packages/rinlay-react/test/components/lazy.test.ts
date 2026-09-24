import { Suspense, lazy } from '../../src/index.ts'
import { h, mount, tick } from '../mount.ts'

describe('lazy', () => {
  it('loads the default export behind Suspense', async () => {
    let resolve: (mod: { default: () => ReturnType<typeof h> }) => void = () => {}
    const Loaded = lazy(
      () =>
        new Promise((done) => {
          resolve = done
        }),
    )
    const view = mount(h(Suspense, { fallback: h('span', null, 'loading') }, h(Loaded, null)))
    expect(view.host.textContent).toBe('loading')
    resolve({ default: function Box() { return h('b', null, 'box') } })
    await tick()
    await tick()
    expect(view.host.textContent).toBe('box')
    view.unmount()
  })
})
