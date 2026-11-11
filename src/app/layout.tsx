import type { Metadata, Viewport } from "next";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v14-appRouter";
import { ThemeModeProvider } from "@/contexts/ThemeModeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import MainLayout from "@/components/MainLayout";
import PwaRegister from "@/components/PwaRegister";

export const metadata: Metadata = {
  title: {
    default: "LL Engenharia | Sistema de Gestão",
    template: "%s | LL Engenharia",
  },
  description: "Sistema de Gestão de Demandas, Obras e Financeiro - LL Engenharia",
  applicationName: "LL Engenharia",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "LL Engenharia",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#006837" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-br" suppressHydrationWarning>
      <body>
        <PwaRegister />
        {/* O Provider deve envolver todo o conteúdo para gerenciar o cache de CSS */}
        <AppRouterCacheProvider options={{ enableCssLayer: true }}>
          <ThemeModeProvider>
            <AuthProvider>
              <MainLayout>
                {children}
              </MainLayout>
            </AuthProvider>
          </ThemeModeProvider>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
