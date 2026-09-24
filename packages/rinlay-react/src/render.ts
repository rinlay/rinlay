import {
  beginHooks,
  cleanupEffects,
  contextUnchanged,
  createFiber,
  createHooks,
  endHooks,
  flushPhase,
  type Fiber,
  type Listener,
} from './hooks.js'
import {
  FORWARD_REF,
  FRAGMENT,
  LAZY,
  MEMO,
  PORTAL,
  PROFILER,
  PROVIDER,
  STRICT,
  SUSPENSE,
  TEXT,
  createElement,
  normalize,
  type LazySpec,
  type Props,
  type VNode,
} from './vnode.js'
import type { ReactNode } from './types.js'

const SVG_NS = 'http://www.w3.org/2000/svg'
const SKIP = new Set(['children', 'key', 'ref', '__source', '__self'])
const UNITLESS = new Set([
  'opacity',
  'zIndex',
  'fontWeight',
  'lineHeight',
  'flex',
  'flexGrow',
  'flexShrink',
  'order',
  'zoom',
  'fillOpacity',
  'strokeOpacity',
])
const SVG_ATTR: Record<string, string> = {
  className: 'class',
  htmlFor: 'for',
  strokeWidth: 'stroke-width',
  strokeLinecap: 'stroke-linecap',
  strokeLinejoin: 'stroke-linejoin',
  strokeDasharray: 'stroke-dasharray',
  fillOpacity: 'fill-opacity',
  fillRule: 'fill-rule',
  clipRule: 'clip-rule',
  clipPath: 'clip-path',
  stopColor: 'stop-color',
  stopOpacity: 'stop-opacity',
  fontSize: 'font-size',
  fontFamily: 'font-family',
  textAnchor: 'text-anchor',
}

const pending = new Set<Fiber>()
let syncDepth = 0
let queued = false
const passiveRoots = new Set<Fiber>()
let passiveQueued = false

function isThenable(value: unknown): value is Promise<unknown> {
  return !!value && typeof (value as Promise<unknown>).then === 'function'
}

function tag(type: unknown): symbol | undefined {
  return type && typeof type === 'object' ? (type as { $$typeof?: symbol }).$$typeof : undefined
}

function isHost(fiber: Fiber) {
  return typeof fiber.type === 'string'
}

function isText(fiber: Fiber) {
  return fiber.type === TEXT
}

function scheduleUpdate(fiber: Fiber) {
  if (!fiber.alive) return
  pending.add(fiber)
  if (syncDepth > 0) return
  if (!queued) {
    queued = true
    queueMicrotask(flushWork)
  }
}

function flushWork() {
  queued = false
  syncDepth++
  const updated: Fiber[] = []
  try {
    let guard = 0
    while (pending.size && guard++ < 25) {
      const list = [...pending]
      pending.clear()
      for (const fiber of list) {
        if (!fiber.alive) continue
        updateFiber(fiber)
        updated.push(fiber)
      }
      for (const fiber of updated) if (fiber.alive) flushTree(fiber, 'insertion')
      for (const fiber of updated) if (fiber.alive) flushTree(fiber, 'layout')
    }
  } finally {
    syncDepth--
  }
  schedulePassive(updated)
}

export function flushSync<T>(fn: () => T): T {
  syncDepth++
  try {
    const result = fn()
    flushWork()
    return result
  } finally {
    if (syncDepth > 0) syncDepth--
  }
}

function schedulePassive(fibers: Fiber[]) {
  for (const fiber of fibers) passiveRoots.add(fiber)
  if (passiveQueued) return
  passiveQueued = true
  const run = () => {
    passiveQueued = false
    const list = [...passiveRoots]
    passiveRoots.clear()
    for (const fiber of list) if (fiber.alive) flushTree(fiber, 'passive')
  }
  if (typeof requestAnimationFrame === 'function') requestAnimationFrame(() => setTimeout(run, 0))
  else queueMicrotask(run)
}

function flushTree(fiber: Fiber, phase: 'insertion' | 'layout' | 'passive') {
  if (!fiber.alive) return
  let child = fiber.child
  while (child) {
    flushTree(child, phase)
    child = child.sibling
  }
  if (fiber.hooks) flushPhase(fiber, phase)
}

function signalSuspend(fiber: Fiber, thenable: Promise<unknown>): boolean {
  let parent = fiber.parent
  while (parent) {
    if (tag(parent.type) === SUSPENSE && parent.mode !== 'fallback') {
      parent.didSuspend = true
      const set = parent.pending ?? (parent.pending = new Set())
      if (!set.has(thenable)) {
        set.add(thenable)
        const boundary = parent
        const done = () => {
          set.delete(thenable)
          if (set.size === 0) scheduleUpdate(boundary)
        }
        thenable.then(done, done)
      }
      return true
    }
    parent = parent.parent
  }
  return false
}

function ensureLazy(spec: LazySpec) {
  if (spec.status !== 'init') return
  spec.status = 'pending'
  spec.thenable = spec.loader().then(
    (mod) => {
      spec.status = 'ok'
      spec.result = (mod as { default?: unknown }).default ?? mod
    },
    (error) => {
      spec.status = 'err'
      spec.result = error
    },
  )
}

function updateFiber(fiber: Fiber) {
  if (!fiber.alive) return
  const kind = tag(fiber.type)
  try {
    if (fiber.type === TEXT) return updateText(fiber)
    if (typeof fiber.type === 'string') return updateHost(fiber)
    if (fiber.type === FRAGMENT || kind === STRICT) return finish(fiber, fiber.props.children)
    if (kind === PROFILER) return updateProfiler(fiber)
    if (kind === PROVIDER || fiber.type === PORTAL) return updateSlot(fiber)
    if (kind === SUSPENSE) return updateSuspense(fiber)
    if (kind === MEMO) return updateMemo(fiber)
    if (kind === LAZY) return updateLazy(fiber)
    if (typeof fiber.type === 'function' || kind === FORWARD_REF) return updateFunction(fiber)
    throw new Error(`Unknown element type: ${String(fiber.type)}`)
  } catch (error) {
    if (!isThenable(error)) throw error
    if (!signalSuspend(fiber, error)) throw new Error('A component suspended but there is no Suspense boundary')
    unmountChildren(fiber)
  }
}

function finish(fiber: Fiber, children: ReactNode) {
  reconcileChildren(fiber, children)
  orderChildren(fiber)
  fiber.mounted = true
}

function updateText(fiber: Fiber) {
  const value = String(fiber.props.nodeValue ?? '')
  if (!fiber.dom) {
    fiber.dom = document.createTextNode(value)
    hostParent(fiber)?.appendChild(fiber.dom)
  } else if (fiber.dom.nodeValue !== value) {
    fiber.dom.nodeValue = value
  }
  fiber.mounted = true
}

function updateHost(fiber: Fiber) {
  if (!fiber.dom) {
    const svg = fiber.type === 'svg' || insideSvg(fiber)
    fiber.dom = svg
      ? document.createElementNS(SVG_NS, fiber.type as string)
      : document.createElement(fiber.type as string)
    hostParent(fiber)?.appendChild(fiber.dom)
    applyProps(fiber.dom as HTMLElement, null, fiber.props, fiber)
  } else {
    applyProps(fiber.dom as HTMLElement, fiber.prevProps, fiber.props, fiber)
  }
  fiber.prevProps = fiber.props
  if (fiber.props.dangerouslySetInnerHTML) unmountChildren(fiber)
  else reconcileChildren(fiber, fiber.props.children)
  commitRef(fiber, fiber.dom)
  orderChildren(fiber)
  fiber.mounted = true
}

function updateFunction(fiber: Fiber) {
  if (!fiber.hooks) fiber.hooks = createHooks(fiber, () => scheduleUpdate(fiber))
  beginHooks(fiber.hooks)
  let tree: ReactNode
  try {
    const props = { ...fiber.props, ref: fiber.ref }
    if (tag(fiber.type) === FORWARD_REF) {
      const render = (fiber.type as { render: (props: Props, ref: unknown) => ReactNode }).render
      tree = render(props, fiber.ref)
    } else {
      tree = (fiber.type as (props: Props) => ReactNode)(props)
    }
  } finally {
    endHooks()
  }
  finish(fiber, tree)
}

function updateMemo(fiber: Fiber) {
  const memoType = fiber.type as { type: unknown }
  const saved = fiber.type
  fiber.type = memoType.type
  try {
    updateFunction(fiber)
  } finally {
    fiber.type = saved
  }
}

function updateLazy(fiber: Fiber) {
  const spec = fiber.type as LazySpec
  ensureLazy(spec)
  if (spec.status === 'pending') throw spec.thenable
  if (spec.status === 'err') throw spec.result
  const child = createElement(spec.result as (props: Props) => ReactNode, fiber.props)
  child.ref = fiber.ref
  finish(fiber, child)
}

function updateSlot(fiber: Fiber) {
  if (fiber.type === PORTAL) {
    fiber.portalContainer = fiber.props.container as Element
    if (!fiber.portalMarker) {
      fiber.portalMarker = document.createComment('portal')
      fiber.portalContainer.appendChild(fiber.portalMarker)
    }
  }
  finish(fiber, fiber.props.children)
}

function updateProfiler(fiber: Fiber) {
  const start = performance.now()
  const phase = fiber.mounted ? 'update' : 'mount'
  finish(fiber, fiber.props.children)
  const now = performance.now()
  const onRender = fiber.props.onRender as Function | undefined
  onRender?.(fiber.props.id, phase, now - start, now - start, start, now)
}

function updateSuspense(fiber: Fiber) {
  fiber.didSuspend = false
  fiber.mode = 'content'
  try {
    reconcileChildren(fiber, fiber.props.children)
  } catch (error) {
    if (!isThenable(error)) throw error
    fiber.didSuspend = true
    signalSuspend(fiber, error)
  }
  if (fiber.didSuspend) {
    unmountChildren(fiber)
    fiber.didSuspend = false
    fiber.mode = 'fallback'
    reconcileChildren(fiber, (fiber.props.fallback as ReactNode) ?? null)
  }
  orderChildren(fiber)
  fiber.mounted = true
}

function sameType(fiber: Fiber, vnode: VNode) {
  return fiber.type === vnode.type && fiber.key === vnode.key
}

function reconcileChildren(fiber: Fiber, children: ReactNode) {
  const vnodes = normalize(children)
  const olds: Fiber[] = []
  let cursor = fiber.child
  while (cursor) {
    olds.push(cursor)
    cursor = cursor.sibling
  }
  const byKey = new Map<string | number, Fiber>()
  const noKey: Fiber[] = []
  for (const old of olds) {
    if (old.key != null) byKey.set(old.key, old)
    else noKey.push(old)
  }
  let noKeyIndex = 0
  const next: Fiber[] = []
  const used = new Set<Fiber>()

  for (const vnode of vnodes) {
    let old = vnode.key != null ? byKey.get(vnode.key) : noKey[noKeyIndex++]
    if (old && (used.has(old) || !sameType(old, vnode))) old = undefined
    const ref = vnode.ref ?? vnode.props.ref ?? null
    if (old && tag(old.type) === MEMO && old.mounted) {
      const memoType = old.type as { compare: (a: object, b: object) => boolean }
      if (memoType.compare(old.props, vnode.props) && old.ref === ref && contextUnchanged(old)) {
        used.add(old)
        next.push(old)
        continue
      }
    }
    if (old) {
      used.add(old)
      old.prevProps = old.props
      old.props = vnode.props
      old.ref = ref
      updateFiber(old)
      next.push(old)
    } else {
      const created = createFiber(vnode.type, vnode.props, vnode.key, ref, fiber)
      created.container = fiber.container
      updateFiber(created)
      next.push(created)
    }
  }

  for (const old of olds) if (!used.has(old)) unmount(old)

  fiber.child = next[0] ?? null
  for (let i = 0; i < next.length; i++) {
    next[i].parent = fiber
    next[i].sibling = next[i + 1] ?? null
  }
}

function unmountChildren(fiber: Fiber) {
  let child = fiber.child
  while (child) {
    const next = child.sibling
    unmount(child)
    child = next
  }
  fiber.child = null
}

function unmount(fiber: Fiber) {
  fiber.alive = false
  cleanupEffects(fiber)
  commitRef(fiber, null)
  if (fiber.listeners && fiber.dom) {
    for (const rec of fiber.listeners.values()) {
      fiber.dom.removeEventListener(rec.event, rec.wrapper, rec.capture)
    }
    fiber.listeners.clear()
  }
  let child = fiber.child
  while (child) {
    const next = child.sibling
    unmount(child)
    child = next
  }
  fiber.child = null
  if (fiber.dom?.parentNode) fiber.dom.parentNode.removeChild(fiber.dom)
  if (fiber.portalMarker?.parentNode) fiber.portalMarker.parentNode.removeChild(fiber.portalMarker)
}

function hostParent(fiber: Fiber): Node | null {
  let parent = fiber.parent
  while (parent) {
    if (parent.portalContainer) return parent.portalContainer
    if (typeof parent.type === 'string' && parent.dom) return parent.dom
    parent = parent.parent
  }
  let top: Fiber | null = fiber
  while (top.parent) top = top.parent
  return top.container
}

function insideSvg(fiber: Fiber) {
  let parent = fiber.parent
  while (parent) {
    if (parent.type === 'svg') return true
    if (typeof parent.type === 'string') return false
    parent = parent.parent
  }
  return false
}

function orderChildren(fiber: Fiber) {
  const nodes: Node[] = []
  let child = fiber.child
  while (child) {
    collectHosts(child, nodes)
    child = child.sibling
  }
  if (fiber.portalContainer) {
    placeAfter(fiber.portalContainer, fiber.portalMarker, nodes)
    return
  }
  const parent = isHost(fiber) && fiber.dom ? fiber.dom : hostParent(fiber)
  if (!parent) return
  const before = isHost(fiber) ? null : nextHost(fiber)
  placeBefore(parent, nodes, before)
}

function collectHosts(fiber: Fiber, into: Node[]) {
  if (!fiber.alive) return
  if (fiber.portalContainer) {
    orderChildren(fiber)
    return
  }
  if ((isHost(fiber) || isText(fiber)) && fiber.dom) {
    into.push(fiber.dom)
    return
  }
  let child = fiber.child
  while (child) {
    collectHosts(child, into)
    child = child.sibling
  }
}

function firstHost(fiber: Fiber): Node | null {
  if (!fiber.alive || fiber.portalContainer) return null
  if ((isHost(fiber) || isText(fiber)) && fiber.dom) return fiber.dom
  let child = fiber.child
  while (child) {
    const found = firstHost(child)
    if (found) return found
    child = child.sibling
  }
  return null
}

function nextHost(fiber: Fiber): Node | null {
  let sibling = fiber.sibling
  while (sibling) {
    const found = firstHost(sibling)
    if (found) return found
    sibling = sibling.sibling
  }
  if (fiber.parent && !isHost(fiber.parent) && !fiber.parent.portalContainer) return nextHost(fiber.parent)
  return null
}

function placeBefore(parent: Node, nodes: Node[], before: Node | null) {
  let ref = before
  for (let i = nodes.length - 1; i >= 0; i--) {
    const node = nodes[i]
    if (node.parentNode === parent && node.nextSibling === ref) {
      ref = node
      continue
    }
    parent.insertBefore(node, ref)
    ref = node
  }
}

function placeAfter(parent: Node, marker: Node | null, nodes: Node[]) {
  let ref = marker
  if (!ref) return placeBefore(parent, nodes, null)
  for (const node of nodes) {
    const after = ref.nextSibling
    if (after === node) {
      ref = node as Comment
      continue
    }
    parent.insertBefore(node, after)
    ref = node as Comment
  }
}

function commitRef(fiber: Fiber, node: Node | null) {
  const ref = fiber.ref
  if (fiber.attachedRef === ref && fiber.attachedNode === node) return
  const prev = fiber.attachedRef
  if (typeof prev === 'function') prev(null)
  else if (prev && typeof prev === 'object') (prev as { current: Node | null }).current = null
  fiber.attachedRef = ref
  fiber.attachedNode = node
  if (typeof ref === 'function') ref(node)
  else if (ref && typeof ref === 'object') (ref as { current: Node | null }).current = node
}

function isEvent(name: string) {
  return name.startsWith('on') && name.length > 2 && name[2] >= 'A' && name[2] <= 'Z'
}

function eventName(el: Element, reactName: string) {
  const capture = reactName.endsWith('Capture')
  const raw = (capture ? reactName.slice(2, -7) : reactName.slice(2)).toLowerCase()
  if (raw === 'doubleclick') return { event: 'dblclick', capture }
  if (raw === 'change') {
    const type = (el as HTMLInputElement).type
    if (el.tagName === 'SELECT' || type === 'checkbox' || type === 'radio') return { event: 'change', capture }
    return { event: 'input', capture }
  }
  return { event: raw, capture }
}

function applyProps(el: HTMLElement, prev: Props | null, next: Props, fiber: Fiber) {
  const svg = el.namespaceURI === SVG_NS
  const names = new Set([...Object.keys(prev ?? {}), ...Object.keys(next)])
  for (const name of names) {
    if (SKIP.has(name) || isEvent(name)) continue
    const before = prev?.[name]
    const after = next[name]
    if (prev && Object.is(before, after)) continue
    if (name === 'className' || name === 'class') {
      if (after == null || after === false) el.removeAttribute('class')
      else el.setAttribute('class', String(after))
      continue
    }
    if (name === 'style') {
      applyStyle(el, before, after)
      continue
    }
    if (name === 'dangerouslySetInnerHTML') {
      const html = (after as { __html?: string } | null)?.__html ?? ''
      if (el.innerHTML !== html) el.innerHTML = html
      continue
    }
    if (name === 'value' && 'value' in el && after != null) {
      const str = String(after)
      if ((el as HTMLInputElement).value !== str) (el as HTMLInputElement).value = str
      continue
    }
    if ((name === 'checked' || name === 'disabled' || name === 'readOnly' || name === 'multiple') && name in el) {
      ;(el as unknown as Record<string, unknown>)[name] = after ?? false
      continue
    }
    if (name === 'autoFocus') {
      if (after) queueMicrotask(() => el.focus())
      continue
    }
    const attr = svg ? (SVG_ATTR[name] ?? name) : name === 'htmlFor' ? 'for' : name
    if (after == null || after === false) el.removeAttribute(attr)
    else el.setAttribute(attr, after === true ? '' : String(after))
  }
  syncEvents(el, fiber, prev, next)
  fiber.props = next
}

function applyStyle(el: HTMLElement, prev: unknown, next: unknown) {
  const style = el.style
  if (typeof next === 'string') {
    el.setAttribute('style', next)
    return
  }
  if (prev && typeof prev === 'object') {
    for (const key of Object.keys(prev as object)) {
      if (!next || typeof next !== 'object' || !(key in (next as object))) {
        if (key.startsWith('--')) style.removeProperty(key)
        else (style as unknown as Record<string, string>)[key] = ''
      }
    }
  }
  if (next && typeof next === 'object') {
    for (const [key, value] of Object.entries(next as Record<string, unknown>)) {
      if (value == null) {
        if (key.startsWith('--')) style.removeProperty(key)
        else (style as unknown as Record<string, string>)[key] = ''
        continue
      }
      const css =
        typeof value === 'number' && !UNITLESS.has(key) && !key.startsWith('--') ? `${value}px` : String(value)
      if (key.startsWith('--')) style.setProperty(key, css)
      else (style as unknown as Record<string, string>)[key] = css
    }
  }
}

function syncEvents(el: Element, fiber: Fiber, prev: Props | null, next: Props) {
  const map = fiber.listeners ?? (fiber.listeners = new Map<string, Listener>())
  for (const name of Object.keys(prev ?? {})) {
    if (!isEvent(name) || typeof next[name] === 'function') continue
    const rec = map.get(name)
    if (!rec) continue
    el.removeEventListener(rec.event, rec.wrapper, rec.capture)
    map.delete(name)
  }
  for (const name of Object.keys(next)) {
    if (!isEvent(name) || typeof next[name] !== 'function') continue
    let rec = map.get(name)
    if (!rec) {
      const { event, capture } = eventName(el, name)
      const box = { fn: next[name] as Function }
      const wrapper: EventListener = (event) => box.fn(event)
      el.addEventListener(event, wrapper, capture)
      rec = { event, capture, wrapper, box }
      map.set(name, rec)
    }
    rec.box.fn = next[name] as Function
  }
}

function toTree(node: ReactNode): VNode {
  const list = normalize(node)
  if (list.length === 1) return list[0]
  return createElement(FRAGMENT, null, ...list)
}

export function createRoot(container: Element) {
  let root: Fiber | null = null
  return {
    render(node: ReactNode) {
      const vnode = toTree(node)
      syncDepth++
      try {
        if (!root || root.type !== vnode.type) {
          if (root) unmount(root)
          container.replaceChildren()
          root = createFiber(vnode.type, vnode.props, vnode.key, vnode.ref, null)
          root.container = container
          updateFiber(root)
        } else {
          root.prevProps = root.props
          root.props = vnode.props
          root.ref = vnode.ref
          updateFiber(root)
        }
        flushTree(root, 'insertion')
        flushTree(root, 'layout')
        let guard = 0
        while (pending.size && guard++ < 25) flushWork()
      } finally {
        syncDepth--
      }
      schedulePassive([root])
    },
    unmount() {
      if (!root) return
      unmount(root)
      container.replaceChildren()
      root = null
    },
  }
}

export function hydrateRoot(container: Element, node: ReactNode) {
  const root = createRoot(container)
  root.render(node)
  return root
}
