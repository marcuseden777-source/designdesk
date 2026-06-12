import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DesignDesk — 20 AI room designs in seconds",
  description:
    "Drop your floor plan. Get 20 styled room designs and an instant quote. DesignDesk turns days of interior design work into seconds.",
};

export const viewport: Viewport = {
  themeColor: "#0a0a0f",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-ink text-text-primary antialiased">{children}</body>
    </html>
  );
}
