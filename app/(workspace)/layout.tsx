import type { Metadata } from "next";
import { Newsreader, Instrument_Sans } from "next/font/google";
import "./workspace.css";

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
});

const instrument = Instrument_Sans({
  variable: "--font-instrument",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: { default: "Kavas Workspace", template: "%s — Kavas Workspace" },
  robots: { index: false, follow: false },
};

export default function WorkspaceRootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${newsreader.variable} ${instrument.variable} antialiased`}>
      <body>{children}</body>
    </html>
  );
}
