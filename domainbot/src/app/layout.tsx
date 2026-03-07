import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
