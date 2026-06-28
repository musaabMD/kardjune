import type { Metadata } from "next";
import { Nunito } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import { Providers } from "./providers";

const nunito = Nunito({
  subsets: ["latin"],
  weight: ["600", "700", "800", "900"],
  variable: "--font-nunito",
});

export const metadata: Metadata = {
  title: "DrKard — Study smarter, pass exams",
  description:
    "Real exam questions for every medical specialty. Practice, flashcards, mock exams, and an AI study assistant.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${nunito.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-[family-name:var(--font-nunito)]">
        <ClerkProvider dynamic>
          <Providers>{children}</Providers>
        </ClerkProvider>
      </body>
    </html>
  );
}
