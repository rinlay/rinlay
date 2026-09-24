import { Suspense, use } from '../../src/index.ts'
import { h, mount, tick } from '../mount.ts'

describe('Suspense', () => {
  it('shows the fallback, then the content', async () => {
    let resolve: (value: string) => void = () => {}
    const promise = new Promise<string>((done) => {
      resolve = done
    })
    function Body() {
      return h('b', null, use(promise))
    }
    const view = mount(h(Suspense, { fallback: h('span', null, 'loading') }, h(Body, null)))
    expect(view.host.textContent).toBe('loading')
    resolve('done')
    await promise
    await tick()
    expect(view.host.textContent).toBe('done')
    view.unmount()
  })

  it('lets an inner boundary catch the suspend', async () => {
    let resolve: (value: string) => void = () => {}
    const promise = new Promise<string>((done) => {
      resolve = done
    })
    function Body() {
      return h('b', null, use(promise))
    }
    const view = mount(
      h('div', null, 'outer', h(Suspense, { fallback: h('i', null, 'inner') }, h(Body, null))),
    )
    expect(view.host.textContent).toBe('outerinner')
    resolve('in')
    await promise
    await tick()
    expect(view.host.textContent).toBe('outerin')
    view.unmount()
  })
})
