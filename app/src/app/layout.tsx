import type { Metadata } from "next";
import "./globals.css";
import AppNav from "@/components/AppNav";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.supportcoach.io"),
  title: "SupportCoach AI",
  description: "AI-powered support coaching and QA intelligence",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-black text-white antialiased">
        <div className="min-h-screen">
          <AppNav />
          {children}
        </div>
      </body>
    </html>
  );
}