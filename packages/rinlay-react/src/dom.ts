import { Fragment, type Child, type FunctionComponent, type Props, type VNode } from './jsx-runtime.js'

type Setter<T> = (value: T | ((prev: T) => T)) => void
type EffectCleanup = void | (() => void)
type EffectFn = () => EffectCleanup

type EffectSlot = {
  deps: unknown[] | undefined
  effect: EffectFn
  cleanup: EffectCleanup
}

type HookState = {
  values: unknown[]
  index: number
  pendingEffects: number[]
  rerender: () => void
}

let currentHook: HookState | null = null

function depsEqual(a: unknown[] | undefined, b: unknown[] | undefined): boolean {
  if (a === undefined || b === undefined) return false
  if (a.length !== b.length) return false
  return a.every((v, i) => Object.is(v, b[i]))
}

function flushEffects(hook: HookState) {
  for (const i of hook.pendingEffects) {
    const slot = hook.values[i] as EffectSlot
    if (typeof slot.cleanup === 'function') slot.cleanup()
    slot.cleanup = slot.effect()
  }
  hook.pendingEffects = []
}

export function useState<T>(initial: T | (() => T)): [T, Setter<T>] {
  if (!currentHook) {
    throw new Error('useState must be called inside a component')
  }
  const hook = currentHook
  const i = hook.index++
  if (hook.values.length === i) {
    hook.values.push(typeof initial === 'function' ? (initial as () => T)() : initial)
  }
  const setState: Setter<T> = (value) => {
    const prev = hook.values[i] as T
    const next = typeof value === 'function' ? (value as (p: T) => T)(prev) : value
    if (Object.is(prev, next)) return
    hook.values[i] = next
    hook.rerender()
  }
  return [hook.values[i] as T, setState]
}

export function useEffect(effect: EffectFn, deps?: unknown[]): void {
  if (!currentHook) {
    throw new Error('useEffect must be called inside a component')
  }
  const hook = currentHook
  const i = hook.index++
  const prev = hook.values[i] as EffectSlot | undefined

  if (!prev) {
    hook.values[i] = { deps, effect, cleanup: undefined } satisfies EffectSlot
    hook.pendingEffects.push(i)
    return
  }

  if (!depsEqual(prev.deps, deps)) {
    prev.deps = deps
    prev.effect = effect
    hook.pendingEffects.push(i)
  }
}

function flatten(children: Child | Child[] | undefined): Child[] {
  if (children == null) return []
  return (Array.isArray(children) ? children : [children]).flat(Infinity) as Child[]
}

function setProp(el: HTMLElement, name: string, value: unknown) {
  if (name === 'children' || name === 'key' || name === 'ref') return
  if (name === 'className') {
    el.setAttribute('class', String(value ?? ''))
    return
  }
  if (name === 'style' && value && typeof value === 'object') {
    Object.assign(el.style, value)
    return
  }
  if (name === 'value' && 'value' in el) {
    ;(el as HTMLInputElement).value = String(value ?? '')
    return
  }
  if (name === 'checked' && 'checked' in el) {
    ;(el as HTMLInputElement).checked = Boolean(value)
    return
  }
  if (name.startsWith('on') && typeof value === 'function') {
    const event = name.slice(2).toLowerCase()
    el.addEventListener(event, value as EventListener)
    return
  }
  if (value == null || value === false) {
    el.removeAttribute(name)
    return
  }
  el.setAttribute(name, value === true ? '' : String(value))
}

function createDom(node: Child): Node {
  if (node == null || typeof node === 'boolean') {
    return document.createTextNode('')
  }
  if (typeof node === 'string' || typeof node === 'number') {
    return document.createTextNode(String(node))
  }

  const vnode = node as VNode

  if (vnode.type === Fragment) {
    const frag = document.createDocumentFragment()
    for (const child of flatten(vnode.props.children)) {
      frag.appendChild(createDom(child))
    }
    return frag
  }

  if (typeof vnode.type === 'function') {
    return mountComponent(vnode.type as FunctionComponent, vnode.props)
  }

  const el = document.createElement(vnode.type)
  for (const [key, value] of Object.entries(vnode.props)) {
    setProp(el, key, value)
  }
  for (const child of flatten(vnode.props.children)) {
    el.appendChild(createDom(child))
  }
  return el
}

function mountComponent(type: FunctionComponent, props: Props): Node {
  const hook: HookState = {
    values: [],
    index: 0,
    pendingEffects: [],
    rerender: () => {},
  }

  const placeholder = document.createComment('component')
  let current: Node = placeholder

  const render = () => {
    hook.index = 0
    hook.pendingEffects = []
    currentHook = hook
    let tree: Child
    try {
      tree = type(props)
    } finally {
      currentHook = null
    }
    const next = createDom(tree)
    current.parentNode?.replaceChild(next, current)
    current = next
    // after commit (and after parent append on first mount)
    queueMicrotask(() => flushEffects(hook))
  }

  hook.rerender = render
  render()
  return current
}

export function createRoot(container: Element) {
  return {
    render(vnode: Child) {
      container.replaceChildren()
      container.appendChild(createDom(vnode))
    },
  }
}

export function createElement(
  type: VNode['type'],
  props: Props | null,
  ...children: Child[]
): VNode {
  return {
    type,
    props: { ...(props ?? {}), children: children.length <= 1 ? children[0] : children },
    key: (props?.key as string | number | null | undefined) ?? null,
  }
}
