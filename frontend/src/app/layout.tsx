import type { Metadata } from "next";
import { Prompt } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { SidebarProvider } from "@/context/SidebarContext";
import { BreadcrumbProvider } from "@/context/BreadcrumbContext";
import { ToastProvider } from "@/context/ToastContext";

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
    <html lang="th" className={`${prompt.variable} h-full antialiased`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col font-sans bg-[#F8FAFC] text-slate-800" suppressHydrationWarning>
        <AuthProvider>
          <SidebarProvider>
            <BreadcrumbProvider>
              <ToastProvider>{children}</ToastProvider>
            </BreadcrumbProvider>
          </SidebarProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
