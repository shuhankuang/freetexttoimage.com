// 纯展示标题组件。页面主视觉传 headingLevel="h1"；页面内的独立区块使用默认 h2。
// label 只是栏目提示，不占用文档标题层级。
export default function Hero({ label, title, accent, subtitle, icon, className, headingLevel = "h2", headingId }) {
  const Heading = headingLevel === "h1" ? "h1" : "h2";

  return <header className={className ? `creative-heading ${className}` : "creative-heading"}>
    <span className="section-label">{label}</span>
    <Heading id={headingId}>{title}{accent && <> <em>{accent}</em></>}{icon}</Heading>
    {subtitle && <p>{subtitle}</p>}
  </header>;
}
