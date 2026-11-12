import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Monuments We Left Behind | Apollo 11 Story",
  description:
    "A scroll-driven story of the Apollo 11 journey between Earth and the Moon, and the monuments human courage left across the cosmos.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
