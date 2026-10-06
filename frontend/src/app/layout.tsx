import type { Metadata } from "next";
import { Prompt } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { SidebarProvider } from "@/context/SidebarContext";
import { BreadcrumbProvider } from "@/context/BreadcrumbContext";
import { ToastProvider } from "@/context/ToastContext";
import { ThemeProvider } from "@/context/ThemeContext";

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
      <head>
        {/* ตั้งโหมดมืดก่อนหน้าเว็บแสดงผล เพื่อไม่ให้จอกะพริบเป็นสีขาว (คีย์ต้องตรงกับ ThemeContext) */}
        <script
          dangerouslySetInnerHTML={{
            __html: "try{if(localStorage.getItem('hrms_theme')==='dark')document.documentElement.classList.add('dark')}catch(e){}",
          }}
        />
      </head>
      <body className="min-h-full flex flex-col font-sans bg-[#F8FAFC] text-slate-800" suppressHydrationWarning>
        <ThemeProvider>
          <AuthProvider>
            <SidebarProvider>
              <BreadcrumbProvider>
                <ToastProvider>{children}</ToastProvider>
              </BreadcrumbProvider>
            </SidebarProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
