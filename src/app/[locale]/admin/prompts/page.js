import { notFound, redirect } from "next/navigation";
import AdminPromptImports from "@/components/admin-prompt-imports";
import { localePath } from "@/i18n/config";
import { isAdminEmail } from "@/lib/admin-auth";
import { loginPathWithRedirect } from "@/lib/auth-redirect";
import { listPromptImportJobs } from "@/lib/prompt-import-jobs";
import { promptImportsEnabled } from "@/lib/prompt-import-settings";
import { getServerSession } from "@/lib/server-session";

export const metadata = {
  title: "Prompt imports",
  description: "Import prompt gallery data.",
  robots: { index: false, follow: false },
};

export default async function PromptAdminPage({ params }) {
  const { locale } = await params;
  const session = await getServerSession();
  const returnTo = localePath(locale, "/admin/prompts");
  if (!session?.user) redirect(loginPathWithRedirect(localePath(locale, "/login"), returnTo));
  if (!isAdminEmail(session.user.email)) notFound();

  return <AdminPromptImports initialJobs={await listPromptImportJobs()} initialImportsEnabled={promptImportsEnabled()} />;
}
