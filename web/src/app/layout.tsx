import { GeistSans } from "geist/font/sans";
import { type Metadata } from "next";

import "~/styles/globals.css";

export const metadata: Metadata = {
  title: "LangManus",
  description:
    "A community-driven AI automation framework that builds upon the incredible work of the open source community.",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${GeistSans.variable}`}>
      <body className="min-w-screen flex min-h-screen bg-body" suppressHydrationWarning>{children}</body>
    </html>
  );
}
