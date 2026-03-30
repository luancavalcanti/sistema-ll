import React from "react";
import { Box, Typography, Paper, CircularProgress, List, ListItem, Divider } from "@mui/material";

interface ResumoFinanceiroProps {
  loadingFinanceiro: boolean;
  movimentosDemanda: any[];
  totalDespesas: number;
  valorTotalFaturado: number;
  saldoDemanda: number;
}

export default function ResumoFinanceiro({ loadingFinanceiro, movimentosDemanda, totalDespesas, valorTotalFaturado, saldoDemanda }: ResumoFinanceiroProps) {
  return (
    <Box sx={{ mt: 5, display: "flex", flexDirection: "column", gap: 2 }}>
      <Typography variant="h6" sx={{ fontWeight: 700, color: "primary.main" }}>
        Resumo Financeiro
      </Typography>

      {loadingFinanceiro ? (
        <CircularProgress sx={{ display: "block", mx: "auto", my: 3 }} />
      ) : movimentosDemanda.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: "center", border: "1px dashed #ccc", bgcolor: "transparent", borderRadius: 3 }}>
          <Typography color="text.secondary">Nenhuma movimentação financeira vinculada a esta demanda até o momento.</Typography>
        </Paper>
      ) : (
        <>
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
            <Paper sx={{ p: 2, flex: 1, minWidth: "150px", borderLeft: "5px solid #f44336", borderRadius: 2 }}>
              <Typography variant="caption" color="text.secondary" fontWeight="bold" textTransform="uppercase">Total de Despesas</Typography>
              <Typography variant="h6" color="error.main" fontWeight="600">
                {totalDespesas.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </Typography>
            </Paper>

            <Paper sx={{ p: 2, flex: 1, minWidth: "150px", borderLeft: "5px solid #4caf50", borderRadius: 2 }}>
              <Typography variant="caption" color="text.secondary" fontWeight="bold" textTransform="uppercase">Total Faturado</Typography>
              <Typography variant="h6" color="success.main" fontWeight="600">
                {valorTotalFaturado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
              </Typography>
            </Paper>

            <Paper sx={{ p: 2, flex: 1, minWidth: "150px", borderLeft: "5px solid #2196f3", borderRadius: 2, bgcolor: "#f8fbff" }}>
              <Typography variant="caption" color="text.secondary" fontWeight="bold" textTransform="uppercase">Resultado da Obra</Typography>
              <Typography variant="h6" color="primary.main" fontWeight="600">
                {saldoDemanda.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </Typography>
            </Paper>
          </Box>

          <Paper sx={{ borderRadius: 3, overflow: "hidden", border: "1px solid #e0e0e0" }}>
            <List disablePadding>
              {movimentosDemanda.map((mov, index) => {
                const tituloCard = mov.observacao === "" || !mov.observacao ? mov.descricao : mov.observacao;
                const dataFormatada = mov.data ? mov.data.split("-").reverse().join("/") : "";

                return (
                  <React.Fragment key={mov.id}>
                    <ListItem sx={{ py: 2, px: 3, display: "flex", flexWrap: "wrap", gap: 2, "&:hover": { bgcolor: "#f5f5f5" } }}>
                      <Box sx={{ flex: 1, minWidth: "200px" }}>
                        <Typography variant="subtitle2" fontWeight="600">{tituloCard}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {dataFormatada} • {mov.banco} {mov.favorecido ? `• Fav: ${mov.favorecido}` : ""}
                        </Typography>
                      </Box>
                      <Box sx={{ textAlign: "right", minWidth: "120px" }}>
                        <Typography variant="body2" fontWeight="600" color={mov.valor < 0 ? "error.main" : "success.main"}>
                          {Number(mov.valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </Typography>
                      </Box>
                    </ListItem>
                    {index < movimentosDemanda.length - 1 && <Divider />}
                  </React.Fragment>
                );
              })}
            </List>
          </Paper>
        </>
      )}
    </Box>
  );
}