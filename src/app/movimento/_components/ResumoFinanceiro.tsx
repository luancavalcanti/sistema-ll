import { Paper, Box, Typography } from "@mui/material";

interface ResumoFinanceiroProps {
  nomeMesSelecionado: string;
  ano: string;
  totalItens: number;
  saldoMes: number;
}

export default function ResumoFinanceiro({ nomeMesSelecionado, ano, totalItens, saldoMes }: ResumoFinanceiroProps) {
  return (
    <Paper sx={{ 
      p: 3, 
      borderRadius: 3, 
      display: "flex", 
      justifyContent: "space-between", 
      alignItems: "center",
      flexWrap: "wrap",
      gap: 2,
      bgcolor: "#ffffff",
      border: "1px solid #e0e0e0",
      boxShadow: "0 2px 8px rgba(0,0,0,0.05)"
    }}>
      <Box sx={{ display: "flex", flexDirection: "column" }}>
        <Typography variant="body2" color="text.secondary" fontWeight="bold" textTransform="uppercase">
          Período
        </Typography>
        <Typography variant="h6" fontWeight="800" >
          {nomeMesSelecionado} / {ano}
        </Typography>
      </Box>

      <Box sx={{ display: "flex", flexDirection: "column", alignItems: { xs: "flex-start", sm: "center" } }}>
        <Typography variant="body2" color="text.secondary" fontWeight="bold" textTransform="uppercase">
          Movimentações
        </Typography>
        <Typography variant="h6" fontWeight="600">
          {totalItens} {totalItens === 1 ? 'item' : 'itens'}
        </Typography>
      </Box>

      <Box sx={{ display: "flex", flexDirection: "column", alignItems: { xs: "flex-start", sm: "flex-end" } }}>
        <Typography variant="body2" color="text.secondary" fontWeight="bold" textTransform="uppercase">
          Saldo do Período
        </Typography>
        <Typography variant="h6" sx={{ 
          fontWeight: 600, 
          color: saldoMes < 0 ? "error.main" : (saldoMes > 0 ? "success.main" : "text.primary") 
        }}>
          {saldoMes.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
        </Typography>
      </Box>
    </Paper>
  );
}