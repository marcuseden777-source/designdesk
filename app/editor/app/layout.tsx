import type { Metadata } from "next";
import { ClientBootstrap } from "./client-bootstrap";
import "./globals.css";

export const metadata: Metadata = {
  title: "DesignDesk · 3D Layout Studio",
  description: "Build an exact floor-plan layout, then send it to DesignDesk.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>
        <ClientBootstrap>{children}</ClientBootstrap>
      </body>
    </html>
  );
}
