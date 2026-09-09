import ProfileBilling from "@/components/profile-billing";
import { getDictionary } from "@/i18n/dictionaries";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const messages = await getDictionary(locale);
  return { title: messages.profile.title };
}

export default function ProfilePage() {
  return <ProfileBilling />;
}
