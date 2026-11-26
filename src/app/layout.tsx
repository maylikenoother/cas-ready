import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Plus_Jakarta_Sans } from "next/font/google";
import { clerkAppearance, clerkPublishableConfigured } from "@/lib/clerk-public";
import "./globals.css";

const sans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: { default: "CAS Ready", template: "%s · CAS Ready" },
  description: "Timed practice for the UK university pre-CAS credibility interview. Practice only: it does not predict a CAS or a visa.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const content = (
    <>
      <a className="skip" href="#main">Skip to content</a>
      {children}
    </>
  );
  return (
    <html lang="en" className={sans.variable}>
      <body>
        {clerkPublishableConfigured() ? (
          <ClerkProvider appearance={clerkAppearance}>{content}</ClerkProvider>
        ) : (
          content
        )}
      </body>
    </html>
  );
}
