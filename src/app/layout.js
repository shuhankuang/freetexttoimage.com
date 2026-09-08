import "./globals.css";

export const metadata = {
  title: { default: "Forma — AI Image Workspace", template: "%s · Forma" },
  description: "Create AI images and keep every prompt in one focused workspace.",
};

export default function RootLayout({ children }) {
  return <html lang="en"><body>{children}</body></html>;
}
