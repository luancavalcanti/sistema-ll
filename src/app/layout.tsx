import { AppRouterCacheProvider } from "@mui/material-nextjs/v14-appRouter";
import { ThemeModeProvider } from "@/contexts/ThemeModeContext";
import { AuthProvider } from "@/contexts/AuthContext";
import MainLayout from "@/components/MainLayout";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-br" suppressHydrationWarning>
      <body>
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
