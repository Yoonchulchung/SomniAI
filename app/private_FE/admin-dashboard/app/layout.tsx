import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SomniAI Admin Dashboard",
  description: "Admin dashboard for SomniAI private API management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>
        {children}
      </body>
    </html>
  );
}
