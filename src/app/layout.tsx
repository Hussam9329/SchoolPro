import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "@/components/layout/theme-provider";
import "./globals.css";
import "./light-mode-safety.css";

export const metadata: Metadata = {
  title: {
    default: "SchoolPro",
    template: "%s | SchoolPro",
  },
  description:
    "نظام مدرسي ذكي ومتكامل لإدارة ثانوية SchoolPro، الطلاب، المدرسين، الصفوف، الدرجات، الأقساط، والمدفوعات.",
  applicationName: "SchoolPro",
  authors: [{ name: "SchoolPro" }],
  generator: "Next.js",
  keywords: [
    "SchoolPro",
    "نظام مدرسة",
    "إدارة الطلاب",
    "الحضور",
    "الدرجات",
    "الأقساط",
    "التقارير",
  ],
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0f766e",
};

type RootLayoutProps = {
  children: React.ReactNode;
};

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="ar" dir="rtl" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("theme");if(t==="dark"){document.documentElement.classList.add("dark")}else{document.documentElement.classList.remove("dark")}}catch(e){}})()`,
          }}
        />
      </head>
      <body className="min-h-screen bg-app text-app antialiased" suppressHydrationWarning>
        <ThemeProvider>
          <div id="app-root" className="min-h-screen">
            {children}
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
