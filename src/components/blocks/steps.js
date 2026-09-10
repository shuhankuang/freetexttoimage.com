// 纯展示组件，不拿数据——服务端页面（fetch dictionary）和客户端页面（useI18n() 的 t()）
// 都能用，只要各自把 steps 数组拼好传进来。CSS 类见 src/app/globals.css 的 steps-block* 规则。
export default function Steps({ steps, label }) {
  return <section className="steps-block" aria-label={label}>
    <ol className="steps-block-list">
      {steps.map((step, index) => <li key={step.title}>
        <span className="steps-block-number" aria-hidden="true">0{index + 1}</span>
        <div><strong>{step.title}</strong><p>{step.body}</p></div>
      </li>)}
    </ol>
  </section>;
}
