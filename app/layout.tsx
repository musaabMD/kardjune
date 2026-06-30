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

const clerkProviderProps = {
  dynamic: true,
  __internal_clerkJSUrl: "https://cdn.jsdelivr.net/npm/@clerk/clerk-js@6/dist/clerk.browser.js",
  __internal_clerkUIUrl: "https://cdn.jsdelivr.net/npm/@clerk/ui@1/dist/ui.browser.js",
} as React.ComponentProps<typeof ClerkProvider> & {
  __internal_clerkJSUrl: string;
  __internal_clerkUIUrl: string;
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${nunito.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-[family-name:var(--font-nunito)]">
        <ClerkProvider {...clerkProviderProps}>
          <Providers>{children}</Providers>
        </ClerkProvider>
      </body>
    </html>
  );
}
