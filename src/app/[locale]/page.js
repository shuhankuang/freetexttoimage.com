import { redirect } from "next/navigation";
import ServerAppShell from "@/components/server-app-shell";
import ImageStudio from "@/components/image-studio";
import HomeHowItWorks from "@/components/home-how-it-works";
import ImageModelShowcase from "@/components/image-model-showcase";
import HomeFaq from "@/components/home-faq";
import HomeCta from "@/components/home-cta";
import { getDictionary } from "@/i18n/dictionaries";
import { localePath } from "@/i18n/config";
import { buildPublicMetadata } from "@/lib/metadata";
import { DEFAULT_MODEL, listProviders } from "@/lib/models";
import { getServerSession } from "@/lib/server-session";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const messages = await getDictionary(locale);
  return buildPublicMetadata({
    locale,
    title: messages.meta.title,
    description: messages.meta.description,
    absoluteTitle: true,
  });
}

export default async function HomePage({ params }) {
  const { locale } = await params;
  const session = await getServerSession();
  if (session?.user) redirect(localePath(locale, "/studio"));

  return <ServerAppShell activePath="/" publicView locale={locale}>
    <ImageStudio models={listProviders()} defaultModel={DEFAULT_MODEL} howItWorks={<HomeHowItWorks locale={locale} />} modelShowcase={<ImageModelShowcase locale={locale} />} faq={<HomeFaq locale={locale} />} cta={<HomeCta locale={locale} />} />
  </ServerAppShell>;
}
