import type { Metadata } from "next";
import localFont from "next/font/local";
import { Noto_Sans_Thai } from "next/font/google";
import AppShell from "@/components/AppShell";
import Providers from "./providers";
import "./globals.css";

const inter = localFont({
  src: "../fonts/InterVariable.woff2",
  display: "swap",
  variable: "--font-inter",
  weight: "100 900",
});

const thai = Noto_Sans_Thai({
  subsets: ["thai"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-thai",
});

export const metadata: Metadata = {
  title: "Siege Stats",
  description: "Flyff Universe guild siege stats — MVPs, rivalries, and every life's kill timeline.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${thai.variable}`}>
      <body>
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
