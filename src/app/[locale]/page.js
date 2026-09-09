import ServerAppShell from "@/components/server-app-shell";
import ImageStudio from "@/components/image-studio";
import { DEFAULT_MODEL, listProviders } from "@/lib/models";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  return {
    alternates: {
      canonical: locale === "en" ? "/" : "/ja",
      languages: { en: "/", ja: "/ja" },
    },
  };
}

export default function HomePage() {
  return <ServerAppShell publicView><ImageStudio models={listProviders()} defaultModel={DEFAULT_MODEL} /></ServerAppShell>;
}
