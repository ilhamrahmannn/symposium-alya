import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({ variable: "--font-jakarta", subsets: ["latin"], display: "swap" });

export const metadata: Metadata = {
  title: "Pierre Robin Sequence Symposium & Workshop 2026",
  description: "Register for the Symposium on Management of Pierre Robin Sequence in Infants 2026: Connecting Disciplines, Transforming Care — A Integrated Approach to Pierre Robin Sequence.",
  metadataBase: process.env.NEXT_PUBLIC_SITE_URL ? new URL(process.env.NEXT_PUBLIC_SITE_URL) : undefined,
  alternates: { canonical: "/" },
  openGraph: {
    title: "Pierre Robin Sequence Symposium & Workshop 2026",
    description: "Connecting Disciplines, Transforming Care — A Integrated Approach to Pierre Robin Sequence.",
    type: "website",
    url: "/",
  },
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className={jakarta.variable}>{children}</body></html>;
}
