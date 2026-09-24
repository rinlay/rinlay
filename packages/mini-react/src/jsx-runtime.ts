export type Props = Record<string, unknown> & {
  children?: Child | Child[]
}

export type Child = VNode | string | number | boolean | null | undefined

export type VNode = {
  type: string | FunctionComponent | typeof Fragment
  props: Props
  key: string | number | null
}

export type FunctionComponent = (props: Props) => Child

export const Fragment = Symbol.for('rinlay.fragment')

export function jsx(
  type: VNode['type'],
  props: Props | null,
  key?: string | number | null,
): VNode {
  return { type, props: props ?? {}, key: key ?? null }
}

export const jsxs = jsx
export const jsxDEV = jsx
