import { Island } from "./island";

export default function Home() {
  return (
    <div className="site">
      <header className="nav">
        <a className="brand" href="#top" aria-label="rinlay">
          <img src="/logo.png" alt="rinlay" />
        </a>
        <nav className="nav-links">
          <a href="#island">孤岛</a>
          <a href="#generate">生成</a>
          <a href="#whitebox">白盒</a>
          <a href="#philosophy">理念</a>
        </nav>
      </header>

      <main id="top">
        <section className="hero">
          <div className="wrap">
            <span className="hero-icon">
              <img src="/icon.png" alt="" />
            </span>
            <p className="kicker">自研 React 运行时</p>
            <h1>
              拒绝黑魔法。
              <br />
              拒绝黑盒。
            </h1>
            <p className="hero-lead">
              老系统可以很重。rinlay 不要求你换掉它。运行时是自己的，产物只有一份
              JavaScript 和一份 CSS。接入方挂一个插槽，组件就长在上面。
            </p>
            <div className="hero-row">
              <span className="seal">HTML · CSS · JS · JSX</span>
              <span>独立跑，也是同一个东西。</span>
            </div>
          </div>
        </section>

        <section className="section" id="island">
          <div className="wrap">
            <p className="section-index">01 — 孤岛</p>
            <h2>无缝侵入，边界只有一个插槽。</h2>
            <div className="split">
              <div className="prose">
                <p>
                  运行时不借宿在别人的 React 上。它自己实现挂载、状态和 JSX，所以可以像一座孤岛嵌进任意页面：旁边的旧代码继续活着，这一块自己长。
                </p>
                <p>
                  接入方要做的很少。留一个节点，把样式和脚本挂上去。没有要一起升级的框架版本，也没有要并进宿主打包链的依赖树。
                </p>
                <p>不想嵌进旧系统时，单独打开也行。一个 index.html 就是入口。</p>
              </div>
              <pre className="code">{`<div id="slot"></div>
<link rel="stylesheet" href="./app.css" />
<script type="module" src="./app.js"></script>

<script type="module">
  import { createRoot } from "./react/index.js";
  import App from "./main.js";
  createRoot(document.getElementById("slot")).render(<App />);
</script>`}</pre>
            </div>
            <Island />
            <div className="modes">
              <article className="mode">
                <h3>嵌进旧系统</h3>
                <p>宿主留下插槽。rinlay 的 JS 和 CSS 只负责这一块，其余页面保持原样。</p>
              </article>
              <article className="mode">
                <h3>独立使用</h3>
                <p>同一个运行时，同一个入口。不嵌别人的时候，它自己就是整站。</p>
              </article>
            </div>
          </div>
        </section>

        <section className="section" id="generate">
          <div className="wrap">
            <p className="section-index">02 — 生成</p>
            <h2>JSX 已经是模型最熟的语法。</h2>
            <p className="section-lead">
              AI 写出的 React 组件，不需要再翻译成另一套框架。语法是事实标准，挂载点是你的系统。生成出来的代码，直接编译，直接放进插槽。
            </p>
            <div className="pillars">
              <article className="pillar">
                <strong>写的是 React</strong>
                <p>组件、JSX、useState。模型日常就在生成这些，不用再教它一种方言。</p>
              </article>
              <article className="pillar">
                <strong>跑的是 rinlay</strong>
                <p>import 的 react 指向自研运行时。语法留下来，供应链换掉。</p>
              </article>
              <article className="pillar">
                <strong>落在任意系统</strong>
                <p>产物仍是 JS 和 CSS。旧后台、新页面、单独打开，挂法一样。</p>
              </article>
            </div>
          </div>
        </section>

        <section className="section" id="whitebox">
          <div className="wrap">
            <p className="section-index">03 — 白盒</p>
            <h2>源码就在那儿。报错也指向那儿。</h2>
            <div className="split">
              <div className="prose">
                <p>
                  React 上下游很长。打包器、兼容层、运行时、包管理器，一层套一层，嵌套深了之后，你看到的报错常常不属于你写的那一行。
                </p>
                <p>
                  rinlay 把运行时嵌进来，不再经过那一层包管理器替你藏起来的实现。开发时 TypeScript 交给 tsc，浏览器拿到的就是编译结果和源码映射。控制台报什么，文件就在工程里。
                </p>
                <p>组件树、DOM 树、CSS 树都保持干净。页面上有的，源码里找得到。</p>
              </div>
              <div>
                <div className="outputs">
                  <span>index.html</span>
                  <span>main.js</span>
                  <span>index.css</span>
                  <span>react/</span>
                </div>
                <p className="quote">所见即所得。少一层，就少一处要猜的地方。</p>
              </div>
            </div>
          </div>
        </section>

        <section className="section" id="speed">
          <div className="wrap">
            <p className="section-index">04 — 速度</p>
            <h2>最原始的速度，就是少做变换。</h2>
            <p className="section-lead">
              开发服务器不做打包。tsc 监视类型和语法，页面按文件送出去。CSS 改了只换样式表，其余改动整页刷新。快，是因为中间没有一条你要先理解的流水线。
            </p>
          </div>
        </section>

        <section className="section" id="philosophy">
          <div className="wrap">
            <p className="section-index">05 — 理念</p>
            <h2>不要加没有必要的中间层。</h2>
            <p className="section-lead">
              浏览器内核里，该有的能力已经在里面。再叠一层，调试就变成在中间层里找路，而不是在你的界面里找路。
            </p>
            <p className="quote">
              留下来的是 HTML、CSS、JavaScript，以及 React 语法。其余能去掉的，都去掉。
            </p>
          </div>
        </section>
      </main>

      <footer className="wrap footer">
        <span className="footer-brand">
          <span className="footer-icon">
            <img src="/icon.png" alt="" />
          </span>
          rinlay
        </span>
        <span>架构写在仓库的 README</span>
      </footer>
    </div>
  );
}
