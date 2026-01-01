import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "../../src/components/providers/theme-provider";
import { SessionProvider } from "next-auth/react";
import { auth } from "../../auth";
import { Toaster } from "@/components/ui/sonner";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],


})

export const metadata: Metadata = {
  title: "CodeForge - Editor",
  description: "CodeForge - Editor - Code Editor For VibeCoders is a free online code editor that lets you write, debug, and run your code in the browser. It is an open source editor that is easy to use and has a simple interface. It is also a great way to learn programming and get started with coding.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {

  const session = await auth()
  return (
    <SessionProvider session={session}>
    <html lang="en" suppressHydrationWarning>
      <body
        className={` ${poppins.className} antialiased`}
      >
        <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
        >
            <div className="flex flex-col min-h-screen">
              <Toaster/>
              <div className="flex-1">{children}</div>
            </div>
        </ThemeProvider>
      </body>
    </html>
    </SessionProvider>
  );
}