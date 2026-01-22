import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import MagicBackground from "@/components/MagicBackground";
import FloatingShapes from "@/components/FloatingShapes";
import ConditionalNavbarFooter from "@/components/ConditionalNavbarFooter";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Mahmoud Haisam Mohammed | Computer Engineer & Full-Stack Developer",
  description: "Computer Engineer, Teaching Assistant, and Full-Stack Developer specializing in web development, AI/ML, and embedded systems. Based in Alexandria, Egypt.",
  keywords: ["Full-Stack Developer", "Computer Engineer", "AI Developer", "React", "Next.js", "TypeScript", "Node.js"],
  authors: [{ name: "Mahmoud Haisam Mohammed" }],
  openGraph: {
    title: "Mahmoud Haisam Mohammed | Portfolio",
    description: "Computer Engineer & Full-Stack Developer",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={inter.className}>
        <MagicBackground />
        <FloatingShapes />
        <ConditionalNavbarFooter>{children}</ConditionalNavbarFooter>
      </body>
    </html>
  );
}

