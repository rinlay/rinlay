import type { ReactNode, Ref } from './types.js'

export const REACT_ELEMENT = Symbol.for('rinlay.element')
export const TEXT = Symbol.for('rinlay.text')
export const FRAGMENT = Symbol.for('rinlay.fragment')
export const PORTAL = Symbol.for('rinlay.portal')
export const MEMO = Symbol.for('rinlay.memo')
export const FORWARD_REF = Symbol.for('rinlay.forward_ref')
export const LAZY = Symbol.for('rinlay.lazy')
export const CONTEXT = Symbol.for('rinlay.context')
export const PROVIDER = Symbol.for('rinlay.provider')
export const SUSPENSE = Symbol.for('rinlay.suspense')
export const STRICT = Symbol.for('rinlay.strict_mode')
export const PROFILER = Symbol.for('rinlay.profiler')

export type Props = Record<string, unknown> & { children?: ReactNode }

export type VNode = {
  $$typeof: typeof REACT_ELEMENT
  type: unknown
  props: Props
  key: string | number | null
  ref: unknown
}

export const Fragment = FRAGMENT

export const StrictMode = { $$typeof: STRICT } as unknown as (props: {
  children?: ReactNode
}) => ReactNode

export const Suspense = { $$typeof: SUSPENSE } as unknown as (props: {
  children?: ReactNode
  fallback?: ReactNode
}) => ReactNode

export const Profiler = { $$typeof: PROFILER } as unknown as (props: {
  id: string
  children?: ReactNode
  onRender?: (
    id: string,
    phase: 'mount' | 'update',
    actualDuration: number,
    baseDuration: number,
    startTime: number,
    commitTime: number,
  ) => void
}) => ReactNode

export function isValidElement(value: unknown): value is VNode {
  return !!value && typeof value === 'object' && (value as VNode).$$typeof === REACT_ELEMENT
}

function element(type: unknown, props: Props, key: string | number | null, ref: unknown): VNode {
  return { $$typeof: REACT_ELEMENT, type, props, key, ref }
}

export function createElement(type: unknown, props: Props | null, ...children: ReactNode[]): VNode {
  const next: Props = { ...(props ?? {}) }
  const key = (next.key as string | number | null | undefined) ?? null
  const ref = next.ref ?? null
  delete next.key
  if (children.length === 1) next.children = children[0]
  else if (children.length > 1) next.children = children
  return element(type, next, key, ref)
}

export function jsx(type: unknown, props: Props | null, key?: string | number | null): VNode {
  const next = props ?? {}
  return element(type, next, key ?? (next.key as string | number | null) ?? null, next.ref ?? null)
}

export const jsxs = jsx

export function jsxDEV(
  type: unknown,
  props: Props | null,
  key?: string | number | null,
  _isStatic?: boolean,
  _source?: unknown,
  _self?: unknown,
): VNode {
  return jsx(type, props, key)
}

export function cloneElement(node: VNode, props?: Props | null, ...children: ReactNode[]): VNode {
  if (!isValidElement(node)) throw new Error('cloneElement expected an element')
  const next: Props = { ...node.props, ...(props ?? {}) }
  const key = props && 'key' in props ? ((props.key as string | number | null) ?? null) : node.key
  const ref = props && 'ref' in props ? props.ref : node.ref
  delete next.key
  if (children.length === 1) next.children = children[0]
  else if (children.length > 1) next.children = children
  return element(node.type, next, key, ref)
}

export function createRef<T>(): { current: T | null } {
  return { current: null }
}

function shallowEqual(a: object, b: object): boolean {
  if (Object.is(a, b)) return true
  const ak = Object.keys(a)
  const bk = Object.keys(b)
  if (ak.length !== bk.length) return false
  for (const key of ak) {
    if (!Object.prototype.hasOwnProperty.call(b, key) || !Object.is((a as Props)[key], (b as Props)[key])) {
      return false
    }
  }
  return true
}

export function memo<P extends object>(
  type: (props: P) => ReactNode,
  compare?: (prev: P, next: P) => boolean,
) {
  return {
    $$typeof: MEMO,
    type,
    compare: (compare ?? shallowEqual) as (prev: object, next: object) => boolean,
  }
}

export function forwardRef<T, P extends object>(
  render: (props: P, ref: Ref<T> | undefined) => ReactNode,
) {
  return { $$typeof: FORWARD_REF, render }
}

export type LazySpec = {
  $$typeof: typeof LAZY
  loader: () => Promise<{ default: (props: Props) => ReactNode }>
  status: 'init' | 'pending' | 'ok' | 'err'
  result: unknown
  thenable?: Promise<unknown>
}

export function lazy(loader: LazySpec['loader']): LazySpec {
  return { $$typeof: LAZY, loader, status: 'init', result: undefined }
}

export function createPortal(children: ReactNode, container: Element, key: string | number | null = null): VNode {
  return element(PORTAL, { children, container }, key, null)
}

function flat(children: ReactNode, out: ReactNode[]) {
  if (children == null || typeof children === 'boolean') return
  if (Array.isArray(children)) {
    for (const child of children) flat(child, out)
    return
  }
  out.push(children)
}

export const Children = {
  toArray(children: ReactNode): ReactNode[] {
    const out: ReactNode[] = []
    flat(children, out)
    return out
  },
  map<T>(children: ReactNode, fn: (child: ReactNode, index: number) => T): T[] {
    return Children.toArray(children).map(fn)
  },
  forEach(children: ReactNode, fn: (child: ReactNode, index: number) => void) {
    Children.toArray(children).forEach(fn)
  },
  count(children: ReactNode): number {
    return Children.toArray(children).length
  },
  only(children: ReactNode): ReactNode {
    const list = Children.toArray(children)
    if (list.length !== 1) throw new Error('Children.only expected a single child')
    return list[0]
  },
}

export function normalize(children: ReactNode): VNode[] {
  const out: VNode[] = []
  const visit = (node: ReactNode) => {
    if (node == null || typeof node === 'boolean') return
    if (Array.isArray(node)) {
      for (const child of node) visit(child)
      return
    }
    if (typeof node === 'string' || typeof node === 'number') {
      out.push(element(TEXT, { nodeValue: String(node) }, null, null))
      return
    }
    out.push(node)
  }
  visit(children)
  return out
}
