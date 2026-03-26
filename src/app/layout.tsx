import type { Metadata } from "next";
import { Syne, DM_Sans } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";

const syne = Syne({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  style: ["normal", "italic"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "DomainBot — AI Chatbot From Your Website",
  description:
    "Automatically turn your website into an intelligent chatbot. Crawl, embed, and deploy in minutes.",
  keywords: ["chatbot", "AI", "website", "customer support", "RAG"],
  openGraph: {
    title: "DomainBot",
    description: "Turn any website into a smart AI chatbot, instantly.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={`dark ${syne.variable} ${dmSans.variable}`}>
      <body className={dmSans.className}>
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: "#13131e",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "rgba(255,255,255,0.85)",
            },
          }}
        />
      </body>
    </html>
  );
}
