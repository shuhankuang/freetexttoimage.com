// 纯展示组件——跟 blocks/steps.js 一个模式：不拿数据，页面自己 fetch 好文案传进来。
// className 是给个别页面加页面专属的微调（比如 image-to-prompt 用 image-prompt-hero 收窄宽度、
// 改标题颜色），不是新开一套变体机制。
//
// label 才是 h1：SEO 语义上它是这个页面的关键词标题（比如首页 "Free AI Text to Image
// Generator"），title/accent 那句大字只是营销文案，用 h2。字体大小不受影响——globals.css 里
// `.creative-heading > :is(h1,h2):not(.section-label)` 这条规则是按 section-label 这个 class
// 选大标题样式的，不是按标签类型，所以换标签不用改 CSS。
export default function Hero({ label, title, accent, subtitle, icon, className }) {
  return <header className={className ? `creative-heading ${className}` : "creative-heading"}>
    <h1 className="section-label">{label}</h1>
    <h2>{title} <em>{accent}</em>{icon}</h2>
    <p>{subtitle}</p>
  </header>;
}
