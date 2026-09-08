import AppShell from "@/components/app-shell";
import ImageStudio from "@/components/image-studio";

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
  return <AppShell publicView><ImageStudio /></AppShell>;
}
