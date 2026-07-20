"use client";

import React from "react";
import { Box, Paper, Typography, Chip, alpha } from "@mui/material";
import {
  LocationOn as LocationIcon,
  Business as BusinessIcon,
} from "@mui/icons-material";
import { IDemanda, STATUS_CONFIG } from "@/types/demanda";

interface Props {
  demanda: IDemanda;
  onClick: (d: IDemanda) => void;
}

export const DemandaCardList = ({ demanda, onClick }: Props) => {
  const statusColor = STATUS_CONFIG[demanda.status] || "#ccc";

  // 👇 1. Identificamos as condições de status
  const isCanceladaOuDeclinada = demanda.status === "Cancelada" || demanda.status === "Declinada";
  const isCreditada = demanda.status === "Creditada";

  // 👇 2. Definimos a cor de fundo (usando alpha para manter suavidade)
  let bgColor = "background.paper";
  let hoverBgColor = "background.paper";

  if (isCanceladaOuDeclinada) {
    bgColor = alpha("#9e9e9e", 0.12); // Cinza claro
    hoverBgColor = alpha("#9e9e9e", 0.20);
  } else if (isCreditada) {
    bgColor = alpha("#4caf50", 0.08); // Verde claro
    hoverBgColor = alpha("#4caf50", 0.15);
  }

  return (
    <Paper
      onClick={() => onClick(demanda)}
      elevation={0}
      sx={{
        mb: 2,
        cursor: "pointer",
        border: "1px solid",
        borderColor: isCanceladaOuDeclinada ? "transparent" : "divider", // Remove borda se cancelada para ficar mais discreto
        borderRadius: 2,
        overflow: "hidden", 
        display: "flex",
        bgcolor: bgColor, // 👈 Aplica o fundo definido
        transition: "all 0.2s ease-in-out",
        "&:hover": {
          boxShadow: `0 4px 12px ${alpha(statusColor, 0.15)}`,
          transform: "translateX(4px)",
          bgcolor: hoverBgColor, // 👈 Escurece levemente no hover
        },
      }}
    >
      {/* BARRA LATERAL DE STATUS */}
      {/* Se estiver cancelada, deixamos a barra cinza. Senão, usa a cor do status. */}
      <Box sx={{ width: 6, bgcolor: isCanceladaOuDeclinada ? "#bdbdbd" : statusColor }} />

      {/* CONTEÚDO DO CARD */}
      <Box
        sx={{
          p: 2,
          flex: 1,
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          alignItems: { xs: "flex-start", sm: "center" },
          gap: 2,
          flexWrap: "wrap",
          opacity: isCanceladaOuDeclinada ? 0.55 : 1, // 👈 Apaga o texto pela metade se for cancelada/declinada
          transition: "opacity 0.2s",
        }}
      >
        {/* CLIENTE E NÚMERO */}
        <Box sx={{ flex: 1.5 }}>
          <Typography
            variant="caption"
            sx={{ fontWeight: 800, color: isCanceladaOuDeclinada ? "text.secondary" : statusColor }}
          >
            #{demanda.numero}
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <BusinessIcon sx={{ fontSize: 18, color: "text.secondary" }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {demanda.cliente}
            </Typography>
          </Box>
        </Box>

        {/* LOCALIZAÇÃO */}
        <Box sx={{ flex: 2 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {demanda.local}
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <LocationIcon sx={{ fontSize: 14, color: "text.disabled" }} />
            <Typography variant="caption" color="text.secondary">
              {demanda.cidade} - {demanda.uf}
            </Typography>
          </Box>
        </Box>

        {/* VALOR FINANCEIRO */}
        <Box sx={{ display: "flex", flexDirection:"column", alignItems: "flex-end", gap: 1, flex: 1 }}>
          <Chip
            label={demanda.status}
            size="small"
            sx={{
              bgcolor: alpha(isCanceladaOuDeclinada ? "#9e9e9e" : statusColor, 0.1),
              color: isCanceladaOuDeclinada ? "text.secondary" : statusColor,
              fontWeight: 800,
              borderRadius: 1,
            }}
          />
          <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
            {(demanda.valor || 0).toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}
          </Typography>
        </Box>
      </Box>
    </Paper>
  );
};