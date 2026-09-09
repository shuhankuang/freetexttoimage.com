import ServerAppShell from "@/components/server-app-shell";

export default function ExploreLayout({ children }) {
  return <ServerAppShell publicView>{children}</ServerAppShell>;
}
