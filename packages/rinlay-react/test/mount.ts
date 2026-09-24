import { createElement, createRoot, type ReactNode } from '../src/index.ts'

export function h(type: unknown, props?: Record<string, unknown> | null, ...children: ReactNode[]) {
  return createElement(type, props ?? null, ...children)
}

export function mount(node: ReactNode) {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const root = createRoot(host)
  root.render(node)
  return {
    host,
    root,
    rerender(next: ReactNode) {
      root.render(next)
    },
    unmount() {
      root.unmount()
      host.remove()
    },
  }
}

export async function tick() {
  await new Promise((resolve) => setTimeout(resolve, 0))
}

export async function effects() {
  await tick()
  await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)))
}

export function click(el: Element) {
  el.dispatchEvent(new MouseEvent('click', { bubbles: true }))
}
