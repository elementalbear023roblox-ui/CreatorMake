import type { Metadata } from "next";
import "./globals.css";
import "./interface-themes.css";

export const metadata: Metadata = {
  title: "CreatorMake — Retro GUI Studio",
  description: "A professional studio for Windows 95/98, early web, CD-ROM, arcade, game-show, pixel-art, and Roblox interfaces.",
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
      <head>
        <script id="creatormake-google-identity" src="https://accounts.google.com/gsi/client" async defer />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
