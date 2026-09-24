import { useInsertionEffect, useLayoutEffect } from '../../src/index.ts'
import { h, mount, tick } from '../mount.ts'

describe('useInsertionEffect', () => {
  it('runs before useLayoutEffect', async () => {
    const log: string[] = []
    function App() {
      useLayoutEffect(() => log.push('layout'))
      useInsertionEffect(() => log.push('insertion'))
      return h('span', null, 'x')
    }
    const view = mount(h(App, null))
    await tick()
    expect(log).toEqual(['insertion', 'layout'])
    view.unmount()
  })
})
