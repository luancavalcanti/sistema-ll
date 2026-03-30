import { Paper, Box, Typography } from "@mui/material";

interface ResumoNotasProps {
  totalFaturado: number;
  totalCreditado: number;
  saldoAReceber: number;
  totalNotas: number;
}

export default function ResumoNotas({ totalFaturado, totalCreditado, saldoAReceber, totalNotas }: ResumoNotasProps) {
  return (
    <Paper sx={{ p: 3, borderRadius: 3, display: "flex", gap: 3, flexWrap: "wrap", border: "1px solid #e0e0e0", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}>
      
      <Box sx={{ flex: 1, minWidth: "180px", borderLeft: "4px solid", borderColor: "primary.main", pl: 2 }}>
        <Typography variant="body2" color="text.secondary" fontWeight="bold" textTransform="uppercase">
          Total Faturado
        </Typography>
        <Typography variant="h6" fontWeight="600" color="primary.main">
          {totalFaturado.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
        </Typography>
      </Box>

      <Box sx={{ flex: 1, minWidth: "180px", borderLeft: "4px solid", borderColor: "success.main", pl: 2 }}>
        <Typography variant="body2" color="text.secondary" fontWeight="bold" textTransform="uppercase">
          Total Recebido
        </Typography>
        <Typography variant="h6" fontWeight="600" color="success.main">
          {totalCreditado.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
        </Typography>
      </Box>

      <Box sx={{ flex: 1, minWidth: "180px", borderLeft: "4px solid", borderColor: saldoAReceber > 0 ? "warning.main" : "text.disabled", pl: 2 }}>
        <Typography variant="body2" color="text.secondary" fontWeight="bold" textTransform="uppercase">
          A Receber
        </Typography>
        <Typography variant="h6" fontWeight="600" color={saldoAReceber > 0 ? "warning.main" : "text.secondary"}>
          {saldoAReceber.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
        </Typography>
      </Box>

      <Box sx={{ display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "flex-end", borderLeft: "1px solid #eee", pl: 3 }}>
        <Typography variant="h6" fontWeight="600">{totalNotas}</Typography>
        <Typography variant="body2" color="text.secondary" fontWeight="bold">NOTAS EMITIDAS</Typography>
      </Box>

    </Paper>
  );
}