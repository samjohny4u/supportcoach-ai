import "./globals.css";
import AppNav from "@/components/AppNav";

export const metadata = {
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