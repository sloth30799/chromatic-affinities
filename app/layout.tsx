import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Chromatic Affinities — A Digital Exhibition",
  description: "A fullscreen interactive exhibition exploring four pairs of colors as eight interconnected worlds.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
