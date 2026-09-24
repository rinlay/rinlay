import { forwardRef, useState } from '../../src/index.ts'
import { click, h, mount, tick } from '../mount.ts'

describe('forwardRef', () => {
  it('forwards the ref to the host node and keeps it across updates', async () => {
    const Field = forwardRef<HTMLInputElement, { value: string }>(function Field(props, ref) {
      return h('input', { ref, value: props.value })
    })
    function App() {
      const [value, setValue] = useState('a')
      let node: HTMLInputElement | null = null
      return h(
        'div',
        null,
        h(Field, {
          value,
          ref: (el: HTMLInputElement | null) => {
            node = el
          },
        }),
        h('button', {
          onClick: () => {
            expect(node).toBe(viewHost())
            setValue('b')
          },
        }),
      )
      function viewHost() {
        return node
      }
    }
    const view = mount(h(App, null))
    const input = view.host.querySelector('input')!
    expect(input.value).toBe('a')
    click(view.host.querySelector('button')!)
    await tick()
    expect(view.host.querySelector('input')!.value).toBe('b')
    view.unmount()
  })
})
