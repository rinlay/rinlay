"use client";

import { useState } from "react";

export function Island() {
  const [mounted, setMounted] = useState(false);
  const [count, setCount] = useState(1);

  return (
    <div className="legacy">
      <div className="legacy-bar">
        <span>旧系统 · 不动它</span>
        <button className="mount-btn" type="button" onClick={() => setMounted((v) => !v)}>
          {mounted ? "卸下" : "挂载"}
        </button>
      </div>
      <div className="legacy-body">
        <aside className="legacy-side">
          <div>概览</div>
          <div>订单</div>
          <div>库存</div>
          <div>报表</div>
        </aside>
        <div className="legacy-main">
          <div className="slot">
            <p className="slot-label">#slot</p>
            {mounted ? (
              <div className="widget">
                <h4>rinlay</h4>
                <p>运行时在这个插槽里。外面的页面没有被换掉。</p>
                <div className="widget-row">
                  <button type="button" onClick={() => setCount((n) => n - 1)} aria-label="减少">
                    −
                  </button>
                  <strong>{count}</strong>
                  <button type="button" onClick={() => setCount((n) => n + 1)} aria-label="增加">
                    +
                  </button>
                </div>
              </div>
            ) : (
              <p className="slot-label">空插槽。接入方只提供这一块。</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
