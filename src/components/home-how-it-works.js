import "server-only";
import { getDictionary } from "@/i18n/dictionaries";

const STEPS = ["describe", "settings", "generate"];

export default async function HomeHowItWorks({ locale }) {
  // 按项目约定，其他语言等英文版确认后再补充并开放显示。
  if (locale !== "en") return null;

  const messages = await getDictionary(locale);
  const copy = messages.studio.howItWorks;

  return <section className="studio-how" aria-label="How it works">
    <ol className="studio-how-steps">
      {STEPS.map((step, index) => <li key={step}>
        <span className="studio-how-number" aria-hidden="true">0{index + 1}</span>
        <div><h2>{copy[`${step}Title`]}</h2><p>{copy[`${step}Body`]}</p></div>
      </li>)}
    </ol>
  </section>;
}
