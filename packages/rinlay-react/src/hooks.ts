import { CONTEXT, type Props } from './vnode.js'
import type { DependencyList, Dispatch, EffectCallback, ReactNode, Ref, SetStateAction } from './types.js'

export type Fiber = {
  id: number
  type: unknown
  key: string | number | null
  props: Props
  ref: unknown
  parent: Fiber | null
  child: Fiber | null
  sibling: Fiber | null
  dom: Node | null
  hooks: HookState | null
  alive: boolean
  container: Node | null
  portalContainer: Element | null
  portalMarker: Comment | null
  listeners: Map<string, Listener> | null
  mounted: boolean
  prevProps: Props | null
  mode: 'content' | 'fallback' | null
  didSuspend: boolean
  pending: Set<Promise<unknown>> | null
  attachedRef: unknown
  attachedNode: Node | null
}

export type Listener = {
  event: string
  capture: boolean
  wrapper: EventListener
  box: { fn: Function }
}

type EffectSlot = {
  phase: 'insertion' | 'layout' | 'passive'
  deps: DependencyList | undefined
  effect: EffectCallback
  cleanup?: void | (() => void)
  pending: boolean
}

type HookState = {
  fiber: Fiber
  values: unknown[]
  index: number
  schedule: () => void
  contextDeps: { context: Context<unknown>; value: unknown }[]
}

export type Context<T> = {
  $$typeof: typeof CONTEXT
  defaultValue: T
  Provider: { $$typeof: symbol; context: Context<T> }
  Consumer: (props: { children: (value: T) => ReactNode }) => ReactNode
}

let current: HookState | null = null
let nextId = 1

export function createFiber(type: unknown, props: Props, key: string | number | null, ref: unknown, parent: Fiber | null): Fiber {
  return {
    id: nextId++,
    type,
    key,
    props,
    ref,
    parent,
    child: null,
    sibling: null,
    dom: null,
    hooks: null,
    alive: true,
    container: parent?.container ?? null,
    portalContainer: null,
    portalMarker: null,
    listeners: null,
    mounted: false,
    prevProps: null,
    mode: null,
    didSuspend: false,
    pending: null,
    attachedRef: undefined,
    attachedNode: null,
  }
}

export function createHooks(fiber: Fiber, schedule: () => void): HookState {
  return { fiber, values: [], index: 0, schedule, contextDeps: [] }
}

export function beginHooks(hooks: HookState) {
  hooks.index = 0
  hooks.contextDeps = []
  current = hooks
}

export function endHooks() {
  current = null
}

function getHook(): HookState {
  if (!current) throw new Error('Hooks must be called inside a component')
  return current
}

function depsEqual(a: DependencyList | undefined, b: DependencyList | undefined): boolean {
  if (!a || !b) return false
  if (a.length !== b.length) return false
  return a.every((value, i) => Object.is(value, b[i]))
}

export function useState<T>(initial: T | (() => T)): [T, Dispatch<SetStateAction<T>>] {
  const hook = getHook()
  const i = hook.index++
  if (hook.values.length === i) {
    hook.values.push(typeof initial === 'function' ? (initial as () => T)() : initial)
  }
  const setState: Dispatch<SetStateAction<T>> = (value) => {
    const prev = hook.values[i] as T
    const next = typeof value === 'function' ? (value as (prev: T) => T)(prev) : value
    if (Object.is(prev, next)) return
    hook.values[i] = next
    hook.schedule()
  }
  return [hook.values[i] as T, setState]
}

export function useReducer<S, A>(reducer: (state: S, action: A) => S, initial: S, init?: (arg: S) => S): [S, Dispatch<A>] {
  const hook = getHook()
  const i = hook.index++
  if (hook.values.length === i) {
    const slot = {
      state: init ? init(initial) : initial,
      reducer,
      dispatch: null as unknown as Dispatch<A>,
    }
    slot.dispatch = (action) => {
      const next = slot.reducer(slot.state, action)
      if (Object.is(next, slot.state)) return
      slot.state = next
      hook.schedule()
    }
    hook.values.push(slot)
  }
  const slot = hook.values[i] as { state: S; reducer: typeof reducer; dispatch: Dispatch<A> }
  slot.reducer = reducer
  return [slot.state, slot.dispatch]
}

function effectHook(phase: EffectSlot['phase'], effect: EffectCallback, deps?: DependencyList) {
  const hook = getHook()
  const i = hook.index++
  const prev = hook.values[i] as EffectSlot | undefined
  if (!prev) {
    hook.values[i] = { phase, deps, effect, pending: true } satisfies EffectSlot
    return
  }
  prev.effect = effect
  if (!depsEqual(prev.deps, deps)) {
    prev.deps = deps
    prev.pending = true
  }
}

export function useEffect(effect: EffectCallback, deps?: DependencyList) {
  effectHook('passive', effect, deps)
}

export function useLayoutEffect(effect: EffectCallback, deps?: DependencyList) {
  effectHook('layout', effect, deps)
}

export function useInsertionEffect(effect: EffectCallback, deps?: DependencyList) {
  effectHook('insertion', effect, deps)
}

export function useRef<T>(initial: T): { current: T } {
  const hook = getHook()
  const i = hook.index++
  if (hook.values.length === i) hook.values.push({ current: initial })
  return hook.values[i] as { current: T }
}

export function useMemo<T>(factory: () => T, deps: DependencyList): T {
  const hook = getHook()
  const i = hook.index++
  const prev = hook.values[i] as { value: T; deps: DependencyList } | undefined
  if (prev && depsEqual(prev.deps, deps)) return prev.value
  const value = factory()
  hook.values[i] = { value, deps }
  return value
}

export function useCallback<T extends Function>(fn: T, deps: DependencyList): T {
  return useMemo(() => fn, deps)
}

export function readContext<T>(fiber: Fiber, context: Context<T>): T {
  let parent = fiber.parent
  while (parent) {
    const type = parent.type as { $$typeof?: symbol; context?: Context<T> }
    if (type && type.$$typeof === PROVIDER && type.context === context) return parent.props.value as T
    parent = parent.parent
  }
  return context.defaultValue
}

const PROVIDER = Symbol.for('rinlay.provider')

export function useContext<T>(context: Context<T>): T {
  const hook = getHook()
  const value = readContext(hook.fiber, context)
  hook.contextDeps.push({ context: context as Context<unknown>, value })
  return value
}

export function contextUnchanged(fiber: Fiber): boolean {
  const deps = fiber.hooks?.contextDeps
  if (!deps) return true
  for (const dep of deps) {
    if (!Object.is(dep.value, readContext(fiber, dep.context))) return false
  }
  return true
}

let idSeq = 0

export function useId(): string {
  const hook = getHook()
  const i = hook.index++
  if (hook.values.length === i) hook.values.push(`:r${hook.fiber.id}:${idSeq++}:`)
  return hook.values[i] as string
}

export function useImperativeHandle<T>(ref: Ref<T> | undefined, create: () => T, deps?: DependencyList) {
  useLayoutEffect(() => {
    const value = create()
    if (typeof ref === 'function') {
      ref(value)
      return () => ref(null)
    }
    if (ref && typeof ref === 'object') {
      ;(ref as { current: T | null }).current = value
      return () => {
        ;(ref as { current: T | null }).current = null
      }
    }
  }, deps ?? [ref])
}

export function useSyncExternalStore<T>(subscribe: (onChange: () => void) => () => void, getSnapshot: () => T): T {
  const hook = getHook()
  const snapshot = getSnapshot()
  const i = hook.index++
  if (hook.values.length === i) hook.values.push(snapshot)
  const cached = hook.values[i] as T
  if (!Object.is(cached, snapshot)) hook.values[i] = snapshot
  const subIndex = hook.index
  useLayoutEffect(() => {
    const check = () => {
      const next = getSnapshot()
      if (!Object.is(hook.values[i], next)) {
        hook.values[i] = next
        hook.schedule()
      }
    }
    check()
    return subscribe(check)
  }, [subscribe])
  if (hook.index !== subIndex + 1) {
    /* useLayoutEffect consumes the following slot */
  }
  return (Object.is(cached, snapshot) ? snapshot : snapshot) as T
}

export function useTransition(): [boolean, (scope: () => void) => void] {
  const [pending, setPending] = useState(false)
  const start = useCallback((scope: () => void) => {
    setPending(true)
    queueMicrotask(() => {
      scope()
      setPending(false)
    })
  }, [])
  return [pending, start]
}

export function startTransition(scope: () => void) {
  scope()
}

export function useDeferredValue<T>(value: T): T {
  const [deferred, setDeferred] = useState(value)
  useEffect(() => {
    setDeferred(value)
  }, [value])
  return deferred
}

const promiseState = new WeakMap<Promise<unknown>, { status: 'pending' | 'ok' | 'err'; value: unknown }>()

export function use<T>(usable: Context<T> | Promise<T>): T {
  if (usable && typeof usable === 'object' && (usable as Context<T>).$$typeof === CONTEXT) {
    return useContext(usable as Context<T>)
  }
  if (usable && typeof (usable as Promise<T>).then === 'function') {
    const promise = usable as Promise<T>
    let rec = promiseState.get(promise)
    if (!rec) {
      rec = { status: 'pending', value: undefined }
      promiseState.set(promise, rec)
      promise.then(
        (value) => {
          rec!.status = 'ok'
          rec!.value = value
        },
        (error) => {
          rec!.status = 'err'
          rec!.value = error
        },
      )
    }
    if (rec.status === 'pending') throw promise
    if (rec.status === 'err') throw rec.value
    return rec.value as T
  }
  throw new Error('use() expects a context or a promise')
}

export function createContext<T>(defaultValue: T): Context<T> {
  const context: Context<T> = {
    $$typeof: CONTEXT,
    defaultValue,
    Provider: { $$typeof: PROVIDER, context: null as unknown as Context<T> },
    Consumer(props) {
      return props.children(useContext(context))
    },
  }
  context.Provider.context = context
  return context
}

export function flushPhase(fiber: Fiber, phase: EffectSlot['phase']) {
  const values = fiber.hooks?.values ?? []
  for (const slot of values) {
    const effect = slot as EffectSlot
    if (!effect || effect.phase !== phase || !effect.pending) continue
    if (typeof effect.cleanup === 'function') effect.cleanup()
    effect.cleanup = effect.effect() ?? undefined
    effect.pending = false
  }
}

export function cleanupEffects(fiber: Fiber) {
  const values = fiber.hooks?.values ?? []
  for (const slot of values) {
    const effect = slot as EffectSlot
    if (effect && typeof effect.cleanup === 'function') {
      effect.cleanup()
      effect.cleanup = undefined
      effect.pending = false
    }
  }
}
