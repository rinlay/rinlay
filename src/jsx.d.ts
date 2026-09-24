import type { Props } from 'react/jsx-runtime'

declare global {
  namespace JSX {
    type Element = import('react/jsx-runtime').VNode
    type ElementType = string | import('react/jsx-runtime').FunctionComponent
    interface IntrinsicElements {
      [tag: string]: Props
    }
    interface ElementChildrenAttribute {
      children: {}
    }
  }
}

export {}
