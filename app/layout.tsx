import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Chromatic Affinities",
    template: "%s | Chromatic Affinities",
  },
  description: "A local, self-initiated interactive materials campaign concept.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
