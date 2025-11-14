import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SomniAI - Monitoring & Control",
  description: "Web-based monitoring and MQTT control system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
