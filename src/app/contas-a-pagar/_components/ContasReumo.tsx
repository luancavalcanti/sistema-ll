// src/app/contas-a-pagar/_components/ContasResumo.tsx
import React from "react";
import { Box, Paper, Typography } from "@mui/material";
import { ReceiptLong as ReceiptIcon, AccountBalanceWallet as WalletIcon } from "@mui/icons-material";
import { IContaAPagar } from "@/types/conta";

export function ContasResumo({ contasPendentes }: { contasPendentes: IContaAPagar[] }) {
  const valorTotalPendentes = contasPendentes.reduce((acc, conta) => acc + Number(conta.valor), 0);

  const formatarMoeda = (valor: number) => {
    return valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <Box sx={{ display: "flex", gap: 2, flexDirection: { xs: "column", sm: "row" } }}>
      <Paper sx={{ p: 2, flex: 1, borderRadius: 2, borderLeft: "4px solid", borderColor: "warning.main", display: "flex", alignItems: "center", gap: 2 }}>
        {/* <Box sx={{ bgcolor: "warning.light", p: 1, borderRadius: 2, display: "flex", color: "warning.dark" }}>
          <ReceiptIcon fontSize="large" />
        </Box> */}
        <Box>
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: "bold", textTransform: "uppercase" }}>Boletos Pendentes</Typography>
          <Typography variant="h6" sx={{ fontWeight: 900, color: "text.primary" }}>{contasPendentes.length}</Typography>
        </Box>
      </Paper>

      <Paper sx={{ p: 2, flex: 1, borderRadius: 2, borderLeft: "4px solid", borderColor: "error.main", display: "flex", alignItems: "center", gap: 2 }}>
        {/* <Box sx={{ bgcolor: "error.light", p: 1, borderRadius: 2, display: "flex", color: "error.dark" }}>
          <WalletIcon fontSize="large" />
        </Box> */}
        <Box>
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: "bold", textTransform: "uppercase" }}>Valor Total a Pagar</Typography>
          <Typography variant="h6" sx={{ fontWeight: 900, color: "error.main" }}>R$ {formatarMoeda(valorTotalPendentes)}</Typography>
        </Box>
      </Paper>
    </Box>
  );
}