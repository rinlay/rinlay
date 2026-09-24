import { useEffect, useLayoutEffect } from '../../src/index.ts'
import { effects, h, mount, tick } from '../mount.ts'

describe('useLayoutEffect', () => {
  it('runs before passive effects and sees the committed DOM', async () => {
    const log: string[] = []
    function App() {
      useLayoutEffect(() => {
        log.push('layout')
      })
      useEffect(() => {
        log.push('passive')
      })
      return h('b', null, 'ok')
    }
    const view = mount(h(App, null))
    await tick()
    expect(log).toEqual(['layout'])
    expect(view.host.textContent).toBe('ok')
    await effects()
    expect(log).toEqual(['layout', 'passive'])
    view.unmount()
  })
})
