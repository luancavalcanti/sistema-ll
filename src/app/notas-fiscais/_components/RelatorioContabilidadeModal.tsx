"use client";

import React, { useState, useMemo } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  TextField,
  MenuItem,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Divider,
} from "@mui/material";
import {
  Close as CloseIcon,
} from "@mui/icons-material";
import dynamic from "next/dynamic";

// 👇 Importamos a interface direto da página pai
import { INotaFiscalUI } from "../page";

const MESES = [
  { valor: "01", nome: "Janeiro" },
  { valor: "02", nome: "Fevereiro" },
  { valor: "03", nome: "Março" },
  { valor: "04", nome: "Abril" },
  { valor: "05", nome: "Maio" },
  { valor: "06", nome: "Junho" },
  { valor: "07", nome: "Julho" },
  { valor: "08", nome: "Agosto" },
  { valor: "09", nome: "Setembro" },
  { valor: "10", nome: "Outubro" },
  { valor: "11", nome: "Novembro" },
  { valor: "12", nome: "Dezembro" },
];

interface RelatorioContabilidadeModalProps {
  open: boolean;
  onClose: () => void;
  notas: INotaFiscalUI[]; // 👈 Usando o Type novo
}

const BotaoBaixarPDF = dynamic(() => import("./BotaoBaixarPDF"), { ssr: false });

export default function RelatorioContabilidadeModal({
  open,
  onClose,
  notas,
}: RelatorioContabilidadeModalProps) {
  const dataAtual = new Date();
  const [ano, setAno] = useState<string>(dataAtual.getFullYear().toString());
  // Por padrão, sugere o mês anterior para contabilidade
  const [mes, setMes] = useState<string>(
    String(dataAtual.getMonth() === 0 ? 12 : dataAtual.getMonth()).padStart(2, "0")
  );

  // 1. Filtra as notas faturadas no mês/ano selecionado
  const faturadas = useMemo(() => {
    return notas.filter(
      (n) =>
        !n.cancelada && !n.isFaltante && n.data_fat && String(n.data_fat).startsWith(`${ano}-${mes}`)
    );
  }, [notas, ano, mes]);

  // 2. Filtra as notas creditadas (pagas) no mês/ano selecionado
  const creditadas = useMemo(() => {
    return notas.filter(
      (n) => n.data_cred && String(n.data_cred).startsWith(`${ano}-${mes}`)
    );
  }, [notas, ano, mes]);

  // 3. Filtra as notas creditadas que tiveram valor diferente do faturado
  const comDesconto = useMemo(() => {
    return creditadas.filter((n) => Number(n.valor_cred || 0) !== Number(n.valor_fat || 0));
  }, [creditadas]);

  // Funções auxiliares de formatação (Tratam os dados com segurança)
  const formatarMoeda = (valor: number | string) =>
    Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  
  const formatarData = (data?: string) =>
    data ? String(data).split("-").reverse().join("/") : "---";

  // --- CÁLCULOS DE TOTAIS (Garantindo conversão para Number) ---
  const totalFaturadoPeriodo = faturadas.reduce(
    (acc, n) => acc + Number(n.valor_fat || 0),
    0
  );
  const totalOriginalCreditadas = creditadas.reduce(
    (acc, n) => acc + Number(n.valor_fat || 0),
    0
  );
  const totalCreditadoPeriodo = creditadas.reduce(
    (acc, n) => acc + Number(n.valor_cred || 0),
    0
  );
  const totalRetencoesPeriodo = comDesconto.reduce(
    (acc, n) => acc + (Number(n.valor_fat || 0) - Number(n.valor_cred || 0)),
    0
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontWeight: 800,
        }}
      >
        Relatório para Contabilidade
      </DialogTitle>

      <DialogContent
        dividers
        sx={{
          bgcolor: "#f8f9fa",
          display: "flex",
          flexDirection: "column",
          gap: 3,
        }}
      >
        {/* SELETORES DE PERÍODO */}
        <Box sx={{ display: "flex", gap: 2 }}>
          <TextField
            select
            label="Ano"
            size="small"
            value={ano}
            onChange={(e) => setAno(e.target.value)}
            sx={{ minWidth: 120, bgcolor: "#fff" }}
          >
            {["2024", "2025", "2026", "2027"].map((a) => (
              <MenuItem key={a} value={a}>
                {a}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Mês"
            size="small"
            value={mes}
            onChange={(e) => setMes(e.target.value)}
            sx={{ minWidth: 180, bgcolor: "#fff" }}
          >
            {MESES.map((m) => (
              <MenuItem key={m.valor} value={m.valor}>
                {m.nome}
              </MenuItem>
            ))}
          </TextField>
        </Box>

        {/* PARTE 1: NOTAS FATURADAS */}
        <Box>
          <Typography variant="subtitle1" fontWeight="800" color="primary.main" gutterBottom>
            1. Notas Fiscais Emitidas (Faturamento)
          </Typography>
          {faturadas.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: "italic" }}>
              Não houve emissão de notas neste período.
            </Typography>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead sx={{ bgcolor: "#f5f5f5" }}>
                  <TableRow>
                    <TableCell><strong>NF</strong></TableCell>
                    <TableCell><strong>Data Emissão</strong></TableCell>
                    <TableCell><strong>Demanda</strong></TableCell>
                    <TableCell align="right"><strong>Valor Faturado</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {faturadas.map((n) => (
                    <TableRow key={n.id || n.nota_fiscal}>
                      <TableCell>{n.nota_fiscal}</TableCell>
                      <TableCell>{formatarData(n.data_fat)}</TableCell>
                      <TableCell>{n.demandaId || "---"}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: "bold" }}>
                        {formatarMoeda(n.valor_fat)}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow sx={{ bgcolor: "#eeeeee" }}>
                    <TableCell colSpan={3} align="right">
                      <strong>TOTAL FATURADO:</strong>
                    </TableCell>
                    <TableCell align="right" sx={{ color: "primary.main" }}>
                      <strong>{formatarMoeda(totalFaturadoPeriodo)}</strong>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>

        <Divider />

        {/* PARTE 2: NOTAS CREDITADAS (RECEBIDAS) */}
        <Box>
          <Typography variant="subtitle1" fontWeight="800" color="success.main" gutterBottom>
            2. Notas Fiscais Recebidas (Crédito em Conta)
          </Typography>
          {creditadas.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: "italic" }}>
              Nenhum recebimento registrado neste período.
            </Typography>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead sx={{ bgcolor: "#f5f5f5" }}>
                  <TableRow>
                    <TableCell><strong>NF</strong></TableCell>
                    <TableCell><strong>Data Crédito</strong></TableCell>
                    <TableCell align="right"><strong>Valor Original (NF)</strong></TableCell>
                    <TableCell align="right"><strong>Valor Creditado</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {creditadas.map((n) => (
                    <TableRow key={n.id || n.nota_fiscal}>
                      <TableCell>{n.nota_fiscal}</TableCell>
                      <TableCell>{formatarData(n.data_cred)}</TableCell>
                      <TableCell align="right">
                        {formatarMoeda(n.valor_fat)}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: "bold", color: "success.main" }}>
                        {formatarMoeda(n.valor_cred || 0)}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow sx={{ bgcolor: "#eeeeee" }}>
                    <TableCell colSpan={2} align="right">
                      <strong>TOTAIS:</strong>
                    </TableCell>
                    <TableCell align="right">
                      <strong>{formatarMoeda(totalOriginalCreditadas)}</strong>
                    </TableCell>
                    <TableCell align="right" sx={{ color: "success.main" }}>
                      <strong>{formatarMoeda(totalCreditadoPeriodo)}</strong>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>

        <Divider />

        {/* PARTE 3: DESCONTOS E RETENÇÕES */}
        <Box>
          <Typography variant="subtitle1" fontWeight="800" color="warning.main" gutterBottom>
            3. Retenções / Diferenças de Crédito
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            Notas recebidas no mês onde o valor creditado foi diferente do valor da nota.
          </Typography>
          {comDesconto.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ fontStyle: "italic" }}>
              Nenhuma divergência de valor neste período.
            </Typography>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead sx={{ bgcolor: "#fff4e5" }}>
                  <TableRow>
                    <TableCell><strong>NF</strong></TableCell>
                    <TableCell align="right"><strong>Valor NF</strong></TableCell>
                    <TableCell align="right"><strong>Creditado</strong></TableCell>
                    <TableCell align="right"><strong>Diferença (Retenção)</strong></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {comDesconto.map((n) => {
                    const diferenca = Number(n.valor_fat || 0) - Number(n.valor_cred || 0);
                    return (
                      <TableRow key={n.id || n.nota_fiscal}>
                        <TableCell>{n.nota_fiscal}</TableCell>
                        <TableCell align="right">
                          {formatarMoeda(n.valor_fat)}
                        </TableCell>
                        <TableCell align="right">
                          {formatarMoeda(n.valor_cred || 0)}
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: "bold", color: "error.main" }}>
                          - {formatarMoeda(diferenca)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  <TableRow sx={{ bgcolor: "#eeeeee" }}>
                    <TableCell colSpan={3} align="right">
                      <strong>TOTAL DE RETENÇÕES:</strong>
                    </TableCell>
                    <TableCell align="right" sx={{ color: "error.main" }}>
                      <strong>- {formatarMoeda(totalRetencoesPeriodo)}</strong>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2, bgcolor: "#f5f5f5" }}>
        <Button onClick={onClose} color="inherit" startIcon={<CloseIcon />}>
          Fechar
        </Button>
        
        {/* COMPONENTE ISOLADO (Livre de SSR) */}
        <BotaoBaixarPDF 
          mes={mes} 
          ano={ano} 
          faturadas={faturadas} 
          creditadas={creditadas} 
          comDesconto={comDesconto} 
        />
      </DialogActions>
    </Dialog>
  );
}