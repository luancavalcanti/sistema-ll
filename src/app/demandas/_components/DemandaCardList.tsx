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

  return (
    <Paper
      onClick={() => onClick(demanda)}
      elevation={0}
      sx={{
        mb: 2,
        cursor: "pointer",
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 2,
        overflow: "hidden", // Importante para a barra lateral não vazar
        display: "flex",
        transition: "0.2s",
        "&:hover": {
          boxShadow: `0 4px 12px ${alpha(statusColor, 0.15)}`,
          transform: "translateX(4px)",
        },
      }}
    >
      {/* BARRA LATERAL DE STATUS */}
      <Box sx={{ width: 6, bgcolor: statusColor }} />

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
        }}
      >
        {/* CLIENTE E NÚMERO */}
        <Box sx={{ flex: 1.5 }}>
          <Typography
            variant="caption"
            sx={{ fontWeight: 800, color: statusColor }}
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
              bgcolor: alpha(statusColor, 0.1),
              color: statusColor,
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
