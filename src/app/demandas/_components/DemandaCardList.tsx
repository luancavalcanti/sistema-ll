"use client";

import React from "react";
import { Box, Paper, Typography, Chip, alpha, Tooltip } from "@mui/material";
import {
  LocationOn as LocationIcon,
  Business as BusinessIcon,
  Warning as WarningIcon
} from "@mui/icons-material";
import { IDemanda, STATUS_CONFIG } from "@/types/demanda";
import { calcularSLA } from "@/utils/sla";
import { AccessTime as AccessTimeIcon } from "@mui/icons-material";

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

  // 👇 3. Lógica para destacar faturamento parcial
  const valorTotal = demanda.valor || 0;
  const faturamentosValidos = demanda.faturamento?.filter(f => !f.cancelada) || [];
  const totalFaturado = faturamentosValidos.reduce((acc, f) => acc + (Number(f.valor_fat) || 0), 0);
  const faltaFaturar = valorTotal - totalFaturado;

  // Mostra o alerta se o valor total for maior que 0, já tem algo faturado (totalFaturado > 0)
  // e ainda falta faturar (faltaFaturar > 0.01)
  const isParcialmenteFaturado = valorTotal > 0 && totalFaturado > 0 && faltaFaturar > 0.01;

  // 👇 4. Cálculo do SLA (Atraso)
  const sla = calcularSLA(demanda.status, demanda.atualizado_em || demanda.criadoEm);
  const isSlaAtrasado = sla.atrasada;

  return (
    <Paper
      onClick={() => onClick(demanda)}
      elevation={0}
      sx={{
        mb: 2,
        cursor: "pointer",
        border: "1px solid",
        borderColor: isCanceladaOuDeclinada ? "transparent" : (isParcialmenteFaturado ? "warning.main" : "divider"), // Destaca a borda do card
        borderRadius: 2,
        overflow: "hidden", 
        display: "flex",
        bgcolor: bgColor, // 👈 Aplica o fundo definido
        transition: "all 0.2s ease-in-out",
        "&:hover": {
          boxShadow: `0 4px 12px ${alpha(isParcialmenteFaturado ? "#ed6c02" : statusColor, 0.15)}`,
          transform: "translateX(4px)",
          bgcolor: hoverBgColor, // 👈 Escurece levemente no hover
        },
      }}
    >
      {/* BARRA LATERAL DE STATUS */}
      {/* Se estiver cancelada, deixamos a barra cinza. Senão, usa a cor do status. Se tiver alerta de fat, usa amarelo/laranja */}
      <Box sx={{ width: 6, bgcolor: isCanceladaOuDeclinada ? "#bdbdbd" : (isParcialmenteFaturado ? "warning.main" : statusColor) }} />

      {/* CONTEÚDO DO CARD */}
      <Box
        sx={{
          p: { xs: 1.5, sm: 2 },
          flex: 1,
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          alignItems: { xs: "stretch", sm: "center" },
          gap: { xs: 1, sm: 2 },
          opacity: isCanceladaOuDeclinada ? 0.55 : 1,
          transition: "opacity 0.2s",
        }}
      >
        {/* CABEÇALHO MOBILE / COLUNA 1 DESKTOP */}
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flex: { sm: 1.5 } }}>
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 800, color: isCanceladaOuDeclinada ? "text.secondary" : statusColor }}>
              #{demanda.numero}
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <BusinessIcon sx={{ fontSize: 18, color: "text.secondary", display: { xs: 'none', sm: 'block' } }} />
              <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                {demanda.cliente}
              </Typography>
            </Box>
          </Box>

          {/* SLA no canto direito superior (Mobile) / Fica na terceira coluna no Desktop */}
          {isSlaAtrasado && (
            <Chip 
              icon={<AccessTimeIcon sx={{ fontSize: '14px !important' }} />}
              label={`${sla.diasOcioso} dias`}
              sx={{ display: { xs: "flex", sm: "none" }, height: 22, fontSize: '0.7rem', fontWeight: 700, bgcolor: alpha("#d32f2f", 0.05) }}
              size="small"
              color="error"
              variant="outlined"
            />
          )}
        </Box>

        {/* LOCALIZAÇÃO (COLUNA 2 DESKTOP) */}
        <Box sx={{ flex: { sm: 2 } }}>
          <Typography variant="body2" sx={{ fontWeight: 600, fontSize: { xs: '0.8rem', sm: '0.875rem' } }}>
            {demanda.local}
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <LocationIcon sx={{ fontSize: 14, color: "text.disabled" }} />
            <Typography variant="caption" color="text.secondary">
              {demanda.cidade} - {demanda.uf}
            </Typography>
          </Box>
        </Box>

        {/* VALOR E CHIPS (COLUNA 3 DESKTOP / RODAPÉ MOBILE) */}
        <Box sx={{ display: "flex", flexDirection: { xs: "row", sm: "column" }, justifyContent: "space-between", alignItems: { xs: "flex-end", sm: "flex-end" }, flexWrap: "wrap", gap: {xs: 1, sm: 1}, flex: { sm: 1.5 }, mt: { xs: 0.5, sm: 0 } }}>
          
          {/* LINHA 1 DESKTOP / DIREITA MOBILE */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, order: { xs: 1, sm: 1 } }}>
            {/* SLA apenas Desktop (Fica do lado do Valor) */}
            {isSlaAtrasado && (
              <Chip 
                icon={<AccessTimeIcon sx={{ fontSize: '14px !important' }} />}
                label={`${sla.diasOcioso} dias`}
                size="small"
                color="error"
                variant="outlined"
                sx={{ display: { xs: "none", sm: "flex" }, fontWeight: 700, bgcolor: alpha("#d32f2f", 0.05), height: 24, fontSize: '0.75rem' }}
              />
            )}
            <Typography variant="subtitle2" sx={{ fontWeight: 800, fontSize: { xs: '0.95rem', sm: '0.95rem' } }}>
              {(demanda.valor || 0).toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </Typography>
          </Box>

          {/* LINHA 2 DESKTOP / ESQUERDA MOBILE */}
          <Box sx={{ display: 'flex', gap: 1, flexWrap: "wrap", order: { xs: 2, sm: 2 }, justifyContent: "flex-end" }}>
            {isParcialmenteFaturado && (
              <Tooltip title={`Falta faturar: ${(faltaFaturar).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`}>
                <Chip
                  icon={<WarningIcon sx={{ fontSize: '14px !important' }} />}
                  label="Fat. Parcial"
                  size="small"
                  color="warning"
                  variant="outlined"
                  sx={{ fontWeight: 800, borderRadius: 1, bgcolor: alpha("#ed6c02", 0.05), height: 24, fontSize: '0.7rem' }}
                />
              </Tooltip>
            )}
            <Chip
              label={demanda.status}
              size="small"
              sx={{
                bgcolor: alpha(isCanceladaOuDeclinada ? "#9e9e9e" : statusColor, 0.1),
                color: isCanceladaOuDeclinada ? "text.secondary" : statusColor,
                fontWeight: 800,
                borderRadius: 1,
                height: 24, fontSize: '0.7rem'
              }}
            />
          </Box>
        </Box>
      </Box>
    </Paper>
  );
};