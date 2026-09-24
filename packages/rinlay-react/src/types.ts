import type { VNode } from './vnode.js'

export type Key = string | number

export type ReactNode = VNode | string | number | boolean | null | undefined | ReactNode[]

export type ReactElement<P = Record<string, unknown>> = VNode & { props: P }

export type SetStateAction<S> = S | ((prev: S) => S)

export type Dispatch<A> = (action: A) => void

export type DependencyList = readonly unknown[]

export type EffectCallback = () => void | (() => void)

export type RefObject<T> = { current: T | null }

export type MutableRefObject<T> = { current: T }

export type RefCallback<T> = (instance: T | null) => void

export type Ref<T> = RefCallback<T> | RefObject<T> | null

export type PropsWithChildren<P = unknown> = P & { children?: ReactNode }

export type PropsWithRef<P, T> = P & { ref?: Ref<T> }

export type FC<P = object> = (props: P & { children?: ReactNode }) => ReactNode

export type FunctionComponent<P = object> = FC<P>

export type ComponentType<P = object> = FC<P>

export type ContextType<C extends { defaultValue: unknown }> = C['defaultValue']

export type Reducer<S, A> = (state: S, action: A) => S

export type CSSProperties = {
  [key: string]: string | number | undefined
  display?: string
  position?: string
  top?: string | number
  right?: string | number
  bottom?: string | number
  left?: string | number
  zIndex?: number
  width?: string | number
  height?: string | number
  margin?: string | number
  marginTop?: string | number
  marginRight?: string | number
  marginBottom?: string | number
  marginLeft?: string | number
  padding?: string | number
  paddingTop?: string | number
  paddingRight?: string | number
  paddingBottom?: string | number
  paddingLeft?: string | number
  border?: string
  borderRadius?: string | number
  background?: string
  backgroundColor?: string
  color?: string
  font?: string
  fontSize?: string | number
  fontWeight?: string | number
  lineHeight?: string | number
  textAlign?: string
  opacity?: number
  overflow?: string
  flex?: string | number
  flexDirection?: string
  flexGrow?: number
  flexShrink?: number
  justifyContent?: string
  alignItems?: string
  gap?: string | number
  gridTemplateColumns?: string
  cursor?: string
  pointerEvents?: string
  transform?: string
  transition?: string
  boxSizing?: string
  whiteSpace?: string
}

export type ChangeEvent<T extends Element = HTMLInputElement> = Event & {
  target: T
  currentTarget: T
}

export type FormEvent<T extends Element = HTMLFormElement> = Event & {
  target: T
  currentTarget: T
}

export type MouseEventHandler<T = Element> = (event: MouseEvent & { currentTarget: T }) => void

export type ChangeEventHandler<T = Element> = (event: ChangeEvent<T & HTMLInputElement>) => void

export type FormEventHandler<T = Element> = (event: FormEvent<T & HTMLFormElement>) => void

export type KeyboardEventHandler<T = Element> = (
  event: KeyboardEvent & { currentTarget: T },
) => void

export type HTMLAttributes = {
  children?: ReactNode
  className?: string
  style?: CSSProperties
  id?: string
  role?: string
  title?: string
  tabIndex?: number
  hidden?: boolean
  dangerouslySetInnerHTML?: { __html: string }
  ref?: Ref<HTMLElement>
  onClick?: MouseEventHandler
  onDoubleClick?: MouseEventHandler
  onMouseDown?: MouseEventHandler
  onMouseUp?: MouseEventHandler
  onMouseEnter?: MouseEventHandler
  onMouseLeave?: MouseEventHandler
  onMouseMove?: MouseEventHandler
  onContextMenu?: MouseEventHandler
  onChange?: (event: Event) => void
  onInput?: (event: Event) => void
  onSubmit?: (event: Event) => void
  onFocus?: (event: FocusEvent) => void
  onBlur?: (event: FocusEvent) => void
  onKeyDown?: KeyboardEventHandler
  onKeyUp?: KeyboardEventHandler
  onScroll?: (event: Event) => void
  onWheel?: (event: WheelEvent) => void
  onPointerDown?: (event: PointerEvent) => void
  onPointerUp?: (event: PointerEvent) => void
  onTouchStart?: (event: TouchEvent) => void
  onTouchEnd?: (event: TouchEvent) => void
  onLoad?: (event: Event) => void
  onError?: (event: Event) => void
  onCopy?: (event: ClipboardEvent) => void
  onPaste?: (event: ClipboardEvent) => void
  onCut?: (event: ClipboardEvent) => void
  onDragStart?: (event: DragEvent) => void
  onDragOver?: (event: DragEvent) => void
  onDrop?: (event: DragEvent) => void
  onAnimationEnd?: (event: AnimationEvent) => void
  onTransitionEnd?: (event: TransitionEvent) => void
  [key: `aria-${string}`]: string | number | boolean | undefined
  [key: `data-${string}`]: string | number | boolean | undefined
  [key: string]: unknown
}

export type InputHTMLAttributes = HTMLAttributes & {
  value?: string | number | readonly string[]
  defaultValue?: string | number
  checked?: boolean
  defaultChecked?: boolean
  type?: string
  name?: string
  placeholder?: string
  disabled?: boolean
  readOnly?: boolean
  required?: boolean
  autoFocus?: boolean
  autoComplete?: string
  min?: string | number
  max?: string | number
  step?: string | number
  pattern?: string
  accept?: string
  multiple?: boolean
  onChange?: ChangeEventHandler<HTMLInputElement>
}

export type TextareaHTMLAttributes = HTMLAttributes & {
  value?: string | number
  defaultValue?: string | number
  name?: string
  placeholder?: string
  disabled?: boolean
  readOnly?: boolean
  rows?: number
  cols?: number
  onChange?: ChangeEventHandler<HTMLTextAreaElement>
}

export type SelectHTMLAttributes = HTMLAttributes & {
  value?: string | number | readonly string[]
  defaultValue?: string | number | readonly string[]
  name?: string
  disabled?: boolean
  multiple?: boolean
  onChange?: ChangeEventHandler<HTMLSelectElement>
}

export type FormHTMLAttributes = HTMLAttributes & {
  action?: string
  method?: string
  name?: string
  onSubmit?: FormEventHandler<HTMLFormElement>
}

export type AnchorHTMLAttributes = HTMLAttributes & {
  href?: string
  target?: string
  rel?: string
  download?: string | boolean
}

export type ButtonHTMLAttributes = HTMLAttributes & {
  type?: 'button' | 'submit' | 'reset'
  disabled?: boolean
  name?: string
  value?: string | number
  autoFocus?: boolean
}

export type ImgHTMLAttributes = HTMLAttributes & {
  src?: string
  alt?: string
  width?: string | number
  height?: string | number
  loading?: 'eager' | 'lazy'
  srcSet?: string
}

export type LabelHTMLAttributes = HTMLAttributes & {
  htmlFor?: string
}

export type SVGAttributes = HTMLAttributes & {
  viewBox?: string
  fill?: string
  stroke?: string
  strokeWidth?: string | number
  d?: string
  xmlns?: string
  width?: string | number
  height?: string | number
  cx?: string | number
  cy?: string | number
  r?: string | number
  x?: string | number
  y?: string | number
}

export type ComponentProps<T> = T extends keyof JSX.IntrinsicElements
  ? JSX.IntrinsicElements[T]
  : T extends (props: infer P) => ReactNode
    ? P
    : Record<string, unknown>

export namespace JSX {
  export type Element = VNode
  export interface ElementChildrenAttribute {
    children: {}
  }
  export interface IntrinsicElements {
    a: AnchorHTMLAttributes
    article: HTMLAttributes
    aside: HTMLAttributes
    audio: HTMLAttributes
    br: HTMLAttributes
    button: ButtonHTMLAttributes
    canvas: HTMLAttributes
    code: HTMLAttributes
    dialog: HTMLAttributes
    div: HTMLAttributes
    em: HTMLAttributes
    fieldset: HTMLAttributes
    footer: HTMLAttributes
    form: FormHTMLAttributes
    h1: HTMLAttributes
    h2: HTMLAttributes
    h3: HTMLAttributes
    h4: HTMLAttributes
    h5: HTMLAttributes
    h6: HTMLAttributes
    header: HTMLAttributes
    hr: HTMLAttributes
    iframe: HTMLAttributes
    img: ImgHTMLAttributes
    input: InputHTMLAttributes
    label: LabelHTMLAttributes
    li: HTMLAttributes
    main: HTMLAttributes
    nav: HTMLAttributes
    ol: HTMLAttributes
    option: HTMLAttributes & { value?: string | number; selected?: boolean }
    p: HTMLAttributes
    path: SVGAttributes
    pre: HTMLAttributes
    section: HTMLAttributes
    select: SelectHTMLAttributes
    span: HTMLAttributes
    strong: HTMLAttributes
    svg: SVGAttributes
    table: HTMLAttributes
    tbody: HTMLAttributes
    td: HTMLAttributes
    textarea: TextareaHTMLAttributes
    th: HTMLAttributes
    thead: HTMLAttributes
    tr: HTMLAttributes
    ul: HTMLAttributes
    video: HTMLAttributes
    [elemName: string]: HTMLAttributes
  }
}
