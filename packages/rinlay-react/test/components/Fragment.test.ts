import { Fragment } from '../../src/index.ts'
import { h, mount } from '../mount.ts'

describe('Fragment', () => {
  it('renders children without an extra node', () => {
    const view = mount(h('div', { id: 'root' }, h(Fragment, null, h('span', null, 'a'), h('span', null, 'b'))))
    const root = view.host.querySelector('#root')!
    expect(root.childNodes).toHaveLength(2)
    expect(root.textContent).toBe('ab')
    view.unmount()
  })
})
