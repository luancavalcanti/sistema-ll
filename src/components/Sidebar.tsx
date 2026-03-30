"use client";

import { useState, useEffect } from "react";
import {
  Drawer,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Divider,
  Box,
  Typography,
  IconButton,
  useTheme,
  useMediaQuery,
  Avatar,
} from "@mui/material";
import {
  Dashboard as DashboardIcon,
  Assignment as DemandasIcon,
  ExitToApp as LogoutIcon,
  AccountBalanceWallet as MovimentoIcon,
  Menu as MenuIcon,
  ChevronLeft as ChevronLeftIcon,
} from "@mui/icons-material";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import ReceiptIcon from "@mui/icons-material/Receipt";
import Image from "next/image";

export default function Sidebar() {
  // 1. TODOS OS HOOKS NO TOPO (Regra de Ouro do React)
  const { user, isAdmin, isUser, isConsulta } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const theme = useTheme();

  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const isTablet = useMediaQuery(theme.breakpoints.between("md", "lg"));
  const isDesktop = useMediaQuery(theme.breakpoints.up("lg"));

  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [mobileOpen, setMobileOpen] = useState<boolean>(false);
  const [mounted, setMounted] = useState<boolean>(false);

  // 2. Efeitos
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    if (isMobile) {
      setIsCollapsed(false);
    } else if (isTablet) {
      setIsCollapsed(true);
      setMobileOpen(false);
    } else if (isDesktop) {
      setIsCollapsed(false);
      setMobileOpen(false);
    }
  }, [isMobile, isTablet, isDesktop, mounted]);

  // 3. SE PRECISAR RETORNAR NULL, TEM QUE SER AQUI (Depois de todos os hooks)
  if (!mounted) return null;

  const drawerWidth = isCollapsed && !isMobile ? 80 : 260;

  const handleNavigation = (path: string) => {
    router.push(path);
    if (isMobile) {
      setMobileOpen(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      window.location.href = "/sistema2//login";
    } catch (error) {
      console.error("Erro ao sair:", error);
    }
  };
  const conteudoMenu = (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <Toolbar
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: isCollapsed ? "center" : "space-between",
          px: isCollapsed ? 1 : 2,
        }}
      >
        {!isCollapsed && (
          <Box sx={{ display: "flex", alignItems: "center", m: 2 }}>
            <Image
              src="/logo.png"
              alt="LL Engenharia logo"
              width={33}
              height={50}
            />
          </Box>
        )}
        <IconButton
          onClick={() =>
            isMobile ? setMobileOpen(false) : setIsCollapsed(!isCollapsed)
          }
        >
          {isMobile ? (
            <ChevronLeftIcon />
          ) : isCollapsed ? (
            <MenuIcon />
          ) : (
            <ChevronLeftIcon />
          )}
        </IconButton>
      </Toolbar>

      <Divider />

      <List sx={{ p: 1 }}>
        {/*--- Menu Dashboard ---*/}
        <ListItemButton
          onClick={() => handleNavigation("/")}
          selected={pathname === "/"}
          sx={{
            borderRadius: 2,
            mb: 0.5,
            justifyContent: isCollapsed ? "center" : "flex-start",
            px: isCollapsed ? 1 : 2.5,
          }}
        >
          <ListItemIcon
            sx={{
              minWidth: 0,
              mr: isCollapsed ? 0 : 2,
              justifyContent: "center",
            }}
          >
            <DashboardIcon />
          </ListItemIcon>
          {!isCollapsed && <ListItemText primary="Dasboard" />}
        </ListItemButton>

        {/*--- Menu Demandas ---*/}
        {isAdmin || isUser ? (
          <ListItemButton
            onClick={() => handleNavigation("/demandas")}
            selected={pathname === "/demandas"}
            sx={{
              borderRadius: 2,
              mb: 0.5,
              justifyContent: isCollapsed ? "center" : "flex-start",
              px: isCollapsed ? 1 : 2.5,
            }}
          >
            <ListItemIcon
              sx={{
                minWidth: 0,
                mr: isCollapsed ? 0 : 2,
                justifyContent: "center",
              }}
            >
              <DemandasIcon />
            </ListItemIcon>
            {!isCollapsed && <ListItemText primary="Demandas" />}
          </ListItemButton>
        ): null}
        {isAdmin || isConsulta ? (
          <>
            {/*--- Menu Notas Fiscias ---*/}
            <ListItemButton
              onClick={() => handleNavigation("/notas-fiscais")}
              selected={pathname === "/notas-fiscais"}
              sx={{
                borderRadius: 2,
                justifyContent: isCollapsed ? "center" : "flex-start",
                px: isCollapsed ? 1 : 2.5,
                mb: 0.5,
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 0,
                  mr: isCollapsed ? 0 : 2,
                  justifyContent: "center",
                }}
              >
                <ReceiptIcon />
              </ListItemIcon>
              {!isCollapsed && <ListItemText primary="Notas Fiscais" />}
            </ListItemButton>

            {/*--- Menu Movimento ---*/}
            <ListItemButton
              onClick={() => handleNavigation("/movimento")}
              selected={pathname === "/movimento"}
              sx={{
                borderRadius: 2,
                justifyContent: isCollapsed ? "center" : "flex-start",
                px: isCollapsed ? 1 : 2.5,
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 0,
                  mr: isCollapsed ? 0 : 2,
                  justifyContent: "center",
                }}
              >
                <MovimentoIcon />
              </ListItemIcon>
              {!isCollapsed && <ListItemText primary="Movimento" />}
            </ListItemButton>
          </>
        ) : null}
      </List>

      <Box sx={{ mt: "auto", p: isCollapsed ? 1 : 2 }}>
        <Divider sx={{ mb: 2 }} />

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: isCollapsed ? "center" : "flex-start",
            mb: 2,
            px: isCollapsed ? 0 : 1,
            overflow: "hidden",
          }}
        >
          <Avatar
            sx={{
              width: 32,
              height: 32,
              bgcolor: "primary.main",
              fontSize: "0.875rem",
              fontWeight: "bold",
            }}
          >
            {(user?.user_metadata?.nome || user?.email || "U")
              .charAt(0)
              .toUpperCase()}
          </Avatar>

          {!isCollapsed && (
            <Box sx={{ ml: 1.5, overflow: "hidden" }}>
              <Typography
                variant="subtitle2"
                noWrap
                sx={{ fontWeight: 700, lineHeight: 1.2, color: "text.primary" }}
              >
                {user?.user_metadata?.nome || "Usuário"}
              </Typography>
              <Typography
                variant="caption"
                noWrap
                sx={{ color: "text.secondary", display: "block" }}
              >
                {user?.email || ""}
              </Typography>
            </Box>
          )}
        </Box>

        <ListItemButton
          onClick={handleLogout}
          sx={{
            borderRadius: 2,
            color: "error.main",
            justifyContent: isCollapsed ? "center" : "flex-start",
            px: isCollapsed ? 1 : 1.5,
          }}
        >
          <ListItemIcon
            sx={{
              minWidth: 0,
              mr: isCollapsed ? 0 : 1.5,
              justifyContent: "center",
            }}
          >
            <LogoutIcon color="error" />
          </ListItemIcon>
          {!isCollapsed && (
            <ListItemText
              primary="Sair"
              primaryTypographyProps={{ fontWeight: "bold" }}
            />
          )}
        </ListItemButton>
      </Box>
    </Box>
  );

  return (
    <>
      <IconButton
        color="inherit"
        onClick={() => setMobileOpen(true)}
        sx={{
          display: { xs: "flex", md: "none" },
          position: "fixed",
          top: 16,
          left: 16,
          zIndex: 1200,
          bgcolor: "primary.main",
          color: "white",
          boxShadow: 3,
          "&:hover": { bgcolor: "primary.dark" },
        }}
      >
        <MenuIcon />
      </IconButton>

      <Box
        component="nav"
        sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
      >
        <Drawer
          variant="temporary"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          ModalProps={{ keepMounted: true }}
          sx={{
            display: { xs: "block", md: "none" },
            "& .MuiDrawer-paper": { boxSizing: "border-box", width: 260 },
          }}
        >
          {conteudoMenu}
        </Drawer>

        <Drawer
          variant="permanent"
          sx={{
            display: { xs: "none", md: "block" },
            width: drawerWidth,
            transition: theme.transitions.create("width", {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
            "& .MuiDrawer-paper": {
              width: drawerWidth,
              boxSizing: "border-box",
              overflowX: "hidden",
              borderRight: "1px solid #e0e0e0",
              transition: theme.transitions.create("width", {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.enteringScreen,
              }),
            },
          }}
          open
        >
          {conteudoMenu}
        </Drawer>
      </Box>
    </>
  );
}
