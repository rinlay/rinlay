# rinlay

AI native 的前端运行时。自研 React 实现，加上一个不做打包的开发服务器。产物是 HTML、CSS、JavaScript。

指挥者下指令，AI 写代码，rinlay 负责把结果快速、确定地跑起来。

## AI native 是什么

AI 写前端，需要的不是花哨的热更新，而是一条**短、白盒、可预测**的闭环：

```
改文件 → 编译成功或失败 → 看到结果或明确报错
```

rinlay 为此设计：

- **语法是 JSX / React。** 模型训练数据里最多的 UI 写法，生成出来的组件不用翻译成另一套框架。
- **运行时是白盒。** 自研 `rinlay-react`，`react` 这个名字指向它。没有 Webpack、Vite 中间层，控制台报错指向你写的源码。
- **开发时不打包。** TypeScript 交给 `tsc`，服务器按文件把结果送出去。AI 读 `packages/rinlay/src/dev.ts` 就能理解整个流程。
- **反馈是确定性的。** CSS 变更只换样式表；JS / TS 变更整页刷新。每次 reload 从干净状态开始，验证结论清晰，不会被残留的组件 state 误导。
- **表面积极小。** `index.html` + `src/*.tsx` + `tsconfig.json`。没有配置文件迷宫，没有依赖图黑盒。

热重载不是 AI 的刚需。整页刷新对 agent 来说，就是一次干净的「重新执行指令」。

## 两种用法

**孤岛。** 宿主页面留一个插槽，加载 rinlay 的 CSS 和 JS，在该节点上 `createRoot`。旧系统的其余部分不进入这条编译链。

**独立应用。** 一个 `index.html` 就是入口。同一个运行时，同一种挂法。

## 仓库

pnpm workspace。

| 路径 | 职责 |
| --- | --- |
| `packages/rinlay` | 命令行、开发服务器、静态构建 |
| `packages/create-rinlay` | 脚手架，`pnpm create rinlay` |
| [rinlay/react](https://github.com/rinlay/react) | JSX 运行时，发布为 `rinlay-react` |
| 仓库根目录 | 示例应用 |

```
rinlay
├── packages/rinlay/          开发服务器与 build
├── packages/create-rinlay/   脚手架
├── src/                      示例应用（TSX）
├── index.html                示例入口
└── tsconfig.json             rootDir=src，outDir=.rinlay
```

## 新建项目

```bash
pnpm create rinlay my-app
cd my-app
pnpm install
pnpm dev
```

## 运行时

`rinlay-react` 是纯客户端的 React 与 React DOM。`react`、`react-dom`、`react-dom/client` 都指向这份运行时。

常用 API：`useState`、`useReducer`、`useEffect`、`useLayoutEffect`、`useRef`、`useMemo`、`useCallback`、`useContext`、`useId`、`useImperativeHandle`、`useSyncExternalStore`、`useTransition`、`useDeferredValue`、`use`、`memo`、`forwardRef`、`lazy`、`Suspense`、`createContext`、`createPortal`、`flushSync`。

源码在 [rinlay/react](https://github.com/rinlay/react) 的 `src/`。没有合成事件、类组件、并发渲染。`hydrateRoot` 会直接在容器里重绘。

## 开发服务器

`rinlay` 或 `rinlay dev` 启动，默认 `127.0.0.1:5173`。

前提是项目根目录有 `index.html`。服务器会：

1. 读取 `tsconfig.json` 的 `rootDir`（默认 `src`）和 `outDir`（默认 `.rinlay`）。
2. 启动 `tsc -b -w`，由编译器监视并输出 JavaScript 与 source map。
3. 用 Node `http` 提供项目文件。请求 `.ts` / `.tsx` 时，返回 `outDir` 里对应的 `.js`。
4. 向 HTML 注入 import map，把 `react` 指到 unpkg 上的 `rinlay-react`。
5. 注入热更新客户端。CSS 变更只替换对应 `<link>`；其余变更整页刷新。

业务代码照常 `import { useState } from 'react'`，运行的是自研运行时。

## 构建

`rinlay build` 不调用 `tsc`。它假定 `outDir` 里已经有编译结果，然后把可部署的静态站点收拢到同一目录：

- 将 `rootDir` 下的 CSS 按相对路径拷到 `outDir`
- 改写 `index.html`：`/src/main.tsx` 变为 `./main.js`，`/src/index.css` 变为 `./index.css`
- 写入生产 import map

得到的目录可以单独托管，也可以嵌进任意宿主页面。

## 命令

在仓库根目录：

```bash
pnpm install
pnpm --filter rinlay build          # 命令行从 dist/ 启动
pnpm dev                            # 示例应用
pnpm build                          # 输出到 .rinlay/
```

## 边界

没有类组件、合成事件和并发特性。`lazy` / `Suspense` 在 promise 完成前显示 fallback，完成后重新挂载内容。这些行为都能在 [rinlay/react](https://github.com/rinlay/react) 的 `src/` 里直接读到。
