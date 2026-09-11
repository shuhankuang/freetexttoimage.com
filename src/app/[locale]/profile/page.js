import ProfileBilling from "@/components/profile-billing";
import { getDictionary } from "@/i18n/dictionaries";
import { buildPrivateMetadata } from "@/lib/metadata";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const messages = await getDictionary(locale);
  return buildPrivateMetadata({ title: messages.profile.title, description: messages.profile.subtitle });
}

export default function ProfilePage() {
  return <ProfileBilling />;
}
