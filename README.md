# rinlay

自研 React 运行时，加上一个不做打包的开发服务器。产物是 HTML、CSS、JavaScript。接入方留一个插槽，就能把界面挂进任意系统；单独打开时，同一个运行时就是整站。

官网在 `website/`。架构和用法以本文为准。

## 理念

浏览器里该有的能力已经在内核里。再叠打包器、兼容层和一条很深的依赖链，调试就会发生在中间层，而不是发生在你写的文件上。

rinlay 去掉这些没有必要的层：

- 语法留下 React / JSX。这是模型最熟的写法，生成出来的组件不用再翻译。
- 运行时自己实现，嵌在仓库里。`react` 这个名字指向 `rinlay-react`，不拉取上游 React 的供应链。
- 开发时不打包。TypeScript 交给 `tsc`，服务器按文件把结果送出去。
- 构建结果是静态文件：页面、样式、脚本，以及一份拷进去的运行时。

拒绝黑魔法，拒绝黑盒。控制台里的报错指向工程里的源码。组件树、DOM 树、CSS 树保持可阅读。

## 仓库

pnpm workspace。

| 路径 | 职责 |
| --- | --- |
| `packages/rinlay` | 命令行、开发服务器、静态构建 |
| `packages/rinlay-react` | JSX 运行时与 DOM 挂载 |
| 仓库根目录 | 示例应用。`react` 依赖解析到 `rinlay-react` |
| `website/` | 官网。Next.js 站点，不参与 rinlay 的运行时 |

```
rinlay
├── packages/rinlay/          开发服务器与 build
├── packages/rinlay-react/    运行时源码 → dist/
├── src/                      示例应用（TSX）
├── index.html                示例入口
├── tsconfig.json             rootDir=src，outDir=.rinlay
└── website/                  官网
```

## 运行时

`packages/rinlay-react` 提供和 JSX 转换对接的最小实现。

导出：

- `jsx` / `jsxs` / `Fragment`（`jsx-runtime`、`jsx-dev-runtime`）
- `createElement`、`createRoot`
- `useState`、`useEffect`

挂载时，函数组件执行后直接生成 DOM。状态变化会重新执行组件，并用新节点替换旧节点，然后在微任务里刷新 effect。属性处理覆盖 `className`、对象形式的 `style`、`value`、`checked`，以及 `on*` 事件。

这是白盒实现，源码在 `packages/rinlay-react/src/dom.ts`。它不做 fiber，也不做按 key 的列表复用。重渲染的代价是替换该组件的 DOM。复杂协调、并发、服务端渲染不在这个运行时里。

类型上，`JSX.IntrinsicElements` 接受任意标签。`tsconfig` 使用 `jsx: react-jsx`，编译器把 JSX 转到 `react/jsx-runtime`。

## 开发服务器

`rinlay` 或 `rinlay dev` 启动，默认 `127.0.0.1:5173`。

前提是项目根目录有 `index.html`。服务器会：

1. 读取 `tsconfig.json` 的 `rootDir`（默认 `src`）和 `outDir`（默认 `.rinlay`）。
2. 启动 `tsc -b -w`，由编译器监视并输出 JavaScript 与 source map。
3. 用 Node `http` 提供项目文件。请求 `.ts` / `.tsx` 时，返回 `outDir` 里对应的 `.js`。`.js` 若在输出目录有同名文件，也返回编译结果。
4. 向 HTML 注入 import map，把 `react`、`react/jsx-runtime`、`react/jsx-dev-runtime` 指到当前项目解析出来的运行时文件。
5. 注入一段无依赖的热更新客户端。CSS 变更只替换对应 `<link>`；HTML、JS、TS 变更整页刷新。WebSocket 握手在 `packages/rinlay/src/ws.js`，不引入第三方包。

示例应用把依赖写成：

```json
"react": "workspace:rinlay-react@*"
```

因此业务代码照常 `import { useState } from 'react'`，运行的是这份自研运行时。

## 构建

`rinlay build` 不调用 `tsc`。它假定 `outDir` 里已经有编译结果，然后把可部署的静态站点收拢到同一目录：

- 将运行时目录中的 `.js` 拷到 `outDir/react/`
- 将 `rootDir` 下的 CSS 按相对路径拷到 `outDir`
- 改写 `index.html`：`/src/main.tsx` 变为 `./main.js`，`/src/index.css` 变为 `./index.css`
- 写入生产 import map：`react` → `./react/index.js`

得到的目录可以单独托管。挂进旧系统时，取其中的脚本、样式和 `react/`，对宿主的要求只有一个挂载节点。

## 两种用法

孤岛。宿主页面留下插槽，加载 rinlay 的 CSS 和 JS，在该节点上 `createRoot`。旧系统的其余部分不进入这条编译链。

独立应用。仓库根目录就是这种形态：`index.html` 指向 `/src/main.tsx` 和 `/src/index.css`，`pnpm dev` 等价于在根目录执行 `rinlay`。

## 命令

在仓库根目录：

```bash
pnpm install
pnpm --filter rinlay-react build   # 运行时需要先有 dist/
pnpm dev                            # 示例应用
pnpm build                          # 收到 .rinlay/
```

官网：

```bash
pnpm --filter website dev           # http://localhost:3000
```

## 边界

运行时目前包含渲染、`useState`、`useEffect`。没有合成事件系统、context、refs 的完整语义，也没有打包、代码分割或框架路由。这些能力如果出现，应当仍然能在源码里直接读到，而不是藏进新的中间层。
