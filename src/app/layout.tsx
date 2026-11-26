import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "CAS Ready", template: "%s · CAS Ready" },
  description: "Timed practice for the UK university pre-CAS credibility interview. Practice only: it does not predict a CAS or a visa.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a className="skip" href="#main">Skip to content</a>
        {children}
      </body>
    </html>
  );
}
