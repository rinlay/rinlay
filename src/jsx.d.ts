import type { Props } from './mini-react/jsx-runtime'

declare global {
  namespace JSX {
    type Element = import('./mini-react/jsx-runtime').VNode
    type ElementType = string | import('./mini-react/jsx-runtime').FunctionComponent
    interface IntrinsicElements {
      [tag: string]: Props
    }
    interface ElementChildrenAttribute {
      children: {}
    }
  }
}

export {}
