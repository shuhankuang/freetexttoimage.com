import "server-only";
import { getDictionary } from "@/i18n/dictionaries";
import Steps from "@/components/blocks/steps";

const STEP_KEYS = ["describe", "settings", "generate"];

export default async function HomeHowItWorks({ locale }) {
  const messages = await getDictionary(locale);
  const copy = messages.studio.howItWorks;
  const steps = STEP_KEYS.map((key) => ({ title: copy[`${key}Title`], body: copy[`${key}Body`] }));

  return <Steps steps={steps} label="How it works" />;
}
