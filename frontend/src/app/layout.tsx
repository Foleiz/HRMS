import type { Metadata } from "next";
import { Prompt } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { BreadcrumbProvider } from "@/context/BreadcrumbContext";

const prompt = Prompt({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["thai", "latin"],
  variable: "--font-prompt",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Human Resource - ระบบบริหารงานบุคคล (HRMS)",
  description: "Enterprise Human Resource Management System",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th" className={`${prompt.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans bg-[#F8FAFC] text-slate-800">
        <AuthProvider>
          <BreadcrumbProvider>{children}</BreadcrumbProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
