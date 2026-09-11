// 首行默认是区块 h2；页面顶部传 headingLevel="h1"。第二行始终是视觉展示文案。
export default function Hero({ label, title, accent, subtitle, icon, className, headingLevel = "h2", headingId }) {
  const Heading = headingLevel === "h1" ? "h1" : "h2";

  return <header className={className ? `creative-heading ${className}` : "creative-heading"}>
    <Heading id={headingId} className="section-label">{label}</Heading>
    <p className="hero-title">{title}{accent && <> <em>{accent}</em></>}{icon}</p>
    {subtitle && <p>{subtitle}</p>}
  </header>;
}
