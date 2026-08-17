"use client";

import React, { useState } from "react";
import {
  BottomNavigation as MuiBottomNavigation,
  BottomNavigationAction,
  Paper,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Box,
  Typography,
  Avatar,
} from "@mui/material";
import {
  Dashboard as DashboardIcon,
  Assignment as DemandasIcon,
  ExitToApp as LogoutIcon,
  AccountBalanceWallet as MovimentoIcon,
  MoreVert as MoreVertIcon,
} from "@mui/icons-material";
import ReceiptIcon from "@mui/icons-material/Receipt";
import MonetizationOnIcon from "@mui/icons-material/MonetizationOn";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function BottomNavigation() {
  const { user, isAdmin, isUser, isConsulta } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const openMenu = Boolean(anchorEl);

  // Constrói a lista de links permitidos na ordem de prioridade
  const allowedItems = [];

  if (isAdmin || isUser) {
    allowedItems.push({ label: "Demandas", path: "/demandas", icon: <DemandasIcon /> });
  }
  if (isAdmin || isConsulta) {
    allowedItems.push({ label: "Movimento", path: "/movimento", icon: <MovimentoIcon /> });
  }

  // Dashboard sempre disponível
  allowedItems.push({ label: "Dashboard", path: "/", icon: <DashboardIcon /> });

  if (isAdmin || isConsulta) {
    allowedItems.push({ label: "Notas Fiscais", path: "/notas-fiscais", icon: <ReceiptIcon /> });
  }
  if (isAdmin) {
    allowedItems.push({ label: "Contas a Pagar", path: "/contas-a-pagar", icon: <MonetizationOnIcon /> });
  }

  // Pega os 2 primeiros itens para fixar na barra
  const fixedItems = allowedItems.slice(0, 2);
  // O restante vai para o menu "Mais"
  const overflowItems = allowedItems.slice(2);

  const handleNavigation = (path: string) => {
    router.push(path);
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      window.location.href = "/login";
    } catch (error) {
      console.error("Erro ao sair:", error);
    }
  };

  const handleOpenMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
  };

  // Encontra qual é a rota selecionada no momento para marcar a BottomNavigation
  let bottomValue = fixedItems.findIndex((item) => item.path === pathname);
  if (bottomValue === -1 && openMenu) {
    bottomValue = 2; // Marca o botão "Mais" como selecionado se estivermos numa rota do menu
  } else if (bottomValue === -1 && overflowItems.some((item) => item.path === pathname)) {
    bottomValue = 2; // Marca o botão "Mais" se a rota atual for de um item do menu
  }

  return (
    <Paper
      sx={{
        position: "fixed",
        bottom: 16,
        left: 16,
        right: 16,
        zIndex: 1300,
        display: { xs: "block", md: "none" }, // Só aparece no mobile
        borderRadius: 8,
        overflow: "hidden", // Para a navegação respeitar o border-radius
      }}
      elevation={8}
    >
      <MuiBottomNavigation
        showLabels
        value={bottomValue >= 0 ? bottomValue : false}
      >
        {fixedItems.map((item, index) => (
          <BottomNavigationAction
            key={item.path}
            label={item.label}
            icon={item.icon}
            onClick={() => handleNavigation(item.path)}
          />
        ))}

        <BottomNavigationAction
          label="Mais"
          icon={<MoreVertIcon />}
          onClick={handleOpenMenu}
        />
      </MuiBottomNavigation>

      <Menu
        anchorEl={anchorEl}
        open={openMenu}
        onClose={handleCloseMenu}
        anchorOrigin={{ vertical: "top", horizontal: "center" }}
        transformOrigin={{ vertical: "bottom", horizontal: "center" }}
        slotProps={{
          paper: {
            sx: {
              width: 250,
              mb: 1, // Espaçamento entre o menu e a barra inferior
              borderRadius: 2,
            },
          },
        }}
      >
        {/* Info do Usuário */}
        <Box sx={{ px: 2, py: 1.5, display: "flex", alignItems: "center", gap: 1.5 }}>
          <Avatar sx={{ width: 32, height: 32, bgcolor: "primary.main", fontSize: "0.875rem", fontWeight: "bold" }}>
            {(user?.user_metadata?.nome || user?.email || "U").charAt(0).toUpperCase()}
          </Avatar>
          <Box sx={{ overflow: "hidden" }}>
            <Typography variant="subtitle2" noWrap sx={{ fontWeight: 700 }}>
              {user?.user_metadata?.nome || "Usuário"}
            </Typography>
            <Typography variant="caption" noWrap color="text.secondary" sx={{ display: "block" }}>
              {user?.email || ""}
            </Typography>
          </Box>
        </Box>

        <Divider />

        {/* Itens extras de Navegação */}
        {overflowItems.map((item) => (
          <MenuItem
            key={item.path}
            onClick={() => handleNavigation(item.path)}
            selected={pathname === item.path}
            sx={{ py: 1.5 }}
          >
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={item.label} />
          </MenuItem>
        ))}

        <Divider />

        {/* Botão Sair */}
        <MenuItem onClick={handleLogout} sx={{ py: 1.5, color: "error.main" }}>
          <ListItemIcon>
            <LogoutIcon color="error" />
          </ListItemIcon>
          <ListItemText primary="Sair" primaryTypographyProps={{ fontWeight: "bold" }} />
        </MenuItem>
      </Menu>
    </Paper>
  );
}
