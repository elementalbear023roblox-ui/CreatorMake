import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CreatorMake — Interface Editor",
  description: "A local-first visual editor for game UI, HUDs, menus, and app interfaces.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
