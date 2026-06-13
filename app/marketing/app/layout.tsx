import type { Metadata, Viewport } from "next";
import { Playfair_Display, Montserrat } from "next/font/google";
import "./globals.css";

// Brand typography — matches the product app (Playfair Display + Montserrat).
const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-playfair",
  display: "swap",
});

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-montserrat",
  display: "swap",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://designdesk.app";
const TITLE = "DesignDesk — 20 AI room designs in seconds";
const DESCRIPTION =
  "Drop your floor plan. Get 20 styled room designs and an instant quote. DesignDesk turns days of interior design work into seconds.";
const SHARE_IMAGE = "/textures/room-after.webp";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  applicationName: "DesignDesk",
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "DesignDesk",
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: SHARE_IMAGE, width: 1200, height: 630, alt: "A room designed with DesignDesk" }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [SHARE_IMAGE],
  },
};

export const viewport: Viewport = {
  themeColor: "#161310",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${playfair.variable} ${montserrat.variable}`}>
      <body className="bg-ink font-sans text-off-white antialiased">
        {children}
      </body>
    </html>
  );
}
