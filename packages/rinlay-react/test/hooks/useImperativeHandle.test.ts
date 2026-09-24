import { createRef, forwardRef, useImperativeHandle } from '../../src/index.ts'
import { h, mount } from '../mount.ts'

describe('useImperativeHandle', () => {
  it('exposes a custom handle and clears it on unmount', () => {
    const ref = createRef<{ focus: () => void }>()
    let focused = 0
    const Field = forwardRef<{ focus: () => void }>(function Field(_props, handle) {
      useImperativeHandle(handle, () => ({ focus: () => focused++ }), [])
      return h('input', null)
    })
    const view = mount(h(Field, { ref }))
    ref.current?.focus()
    expect(focused).toBe(1)
    view.unmount()
    expect(ref.current).toBeNull()
  })
})
