"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Box, Typography, Paper, TextField, MenuItem, CircularProgress,
  ToggleButtonGroup, ToggleButton, Button,
} from "@mui/material";
import Title from "@/components/Title";
import { useRouter } from "next/navigation";
import { PictureAsPdf as PdfIcon } from "@mui/icons-material";
import { buscarTodasNotasFiscais } from "@/services/faturamentosService";
import ResumoNotas from "./_components/ResumoNotas";
import NotaFiscalCard from "./_components/NotaFiscalCard";
import RelatorioContabilidadeModal from "./_components/RelatorioContabilidadeModal";
import { IFaturamento } from "@/types/faturamento";

// Estendemos o type base do banco para adicionar os campos que só a tela usa
export interface INotaFiscalUI extends IFaturamento {
  isFaltante?: boolean;
}

export default function NotasFiscaisPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [todasNotas, setTodasNotas] = useState<INotaFiscalUI[]>([]);
  const [modalRelatorioOpen, setModalRelatorioOpen] = useState(false);

  // Filtros dinâmicos
  const [anosDisponiveis, setAnosDisponiveis] = useState<string[]>([new Date().getFullYear().toString()]);
  const [tipoFiltro, setTipoFiltro] = useState<"por_ano" | "ultimos_12">("por_ano");
  const [ano, setAno] = useState<string>(new Date().getFullYear().toString());

  useEffect(() => {
    const carregarDados = async () => {
      setLoading(true);

      const data = await buscarTodasNotasFiscais();
      
      if (!data || data.length === 0) {
        setTodasNotas([]);
        setLoading(false);
        return;
      }

      // 1. Mapeamento direto (agora usando os nomes idênticos ao banco/types)
      const notasMapeadas: INotaFiscalUI[] = data.map((fat: any) => ({
        id: fat.id,
        demandaId: String(fat.demandaId || ""), // Pega direto da coluna do faturamento!
        nota_fiscal: String(fat.nota_fiscal || "S/N"),
        data_fat: fat.data_fat || "", 
        valor_fat: fat.cancelada ? 0 : (Number(fat.valor_fat) || 0),
        data_cred: fat.data_cred || undefined,
        valor_cred: fat.cancelada ? 0 : (Number(fat.valor_cred) || 0),
        cancelada: !!fat.cancelada,
        codigo_verificacao: fat.codigo_verificacao || "",
        isFaltante: false
      }));

      // 2. Extração de Anos Dinâmicos (Usando o Set que remove duplicatas!)
      const anosExtraidos = [...new Set(
        notasMapeadas.filter(n => n.data_fat).map(n => n.data_fat.split("-")[0])
      )].sort((a, b) => Number(b) - Number(a)); // Ordena do mais novo para o mais velho

      if (anosExtraidos.length > 0) {
        setAnosDisponiveis(anosExtraidos);
        // Se o ano atual não tiver notas, joga o select pro ano mais recente disponível
        if (!anosExtraidos.includes(new Date().getFullYear().toString())) {
          setAno(anosExtraidos[0]);
        }
      }

      // 3. Algoritmo Detector de Notas Faltantes
      const notasFaltantes: INotaFiscalUI[] = [];
      const notasNumericas = notasMapeadas
        .filter(n => !isNaN(Number(n.nota_fiscal)) && n.nota_fiscal.trim() !== "")
        .sort((a, b) => Number(a.nota_fiscal) - Number(b.nota_fiscal));

      for (let i = 0; i < notasNumericas.length; i++) {
        if (notasNumericas[i].cancelada && !notasNumericas[i].data_fat && i > 0) {
          notasNumericas[i].data_fat = notasNumericas[i - 1].data_fat;
        }

        if (i < notasNumericas.length - 1) {
          const numAtual = Number(notasNumericas[i].nota_fiscal);
          const numProxima = Number(notasNumericas[i + 1].nota_fiscal);
          const diferenca = numProxima - numAtual;

          if (diferenca > 1 && diferenca <= 100) {
            for (let j = numAtual + 1; j < numProxima; j++) {
              notasFaltantes.push({
                id: `missing-${j}`,
                nota_fiscal: String(j), 
                data_fat: notasNumericas[i].data_fat, 
                valor_fat: 0,
                demandaId: "---",
                isFaltante: true
              });
            }
          }
        }
      }

      const listaCompleta = [...notasMapeadas, ...notasFaltantes];
      listaCompleta.sort((a, b) => Number(b.nota_fiscal) - Number(a.nota_fiscal));
      
      setTodasNotas(listaCompleta);
      setLoading(false);
    };

    carregarDados();
  }, []);

  const notasFiltradas = useMemo(() => {
    return todasNotas.filter((nota) => {
      if (!nota.data_fat) return false;
      if (tipoFiltro === "por_ano") {
        return nota.data_fat.split("-")[0] === ano;
      }
      if (tipoFiltro === "ultimos_12") {
        const hoje = new Date();
        const limite = new Date(hoje.getFullYear() - 1, hoje.getMonth(), 1);
        return new Date(nota.data_fat) >= limite;
      }
      return true;
    });
  }, [todasNotas, tipoFiltro, ano]);

  const totalFaturado = notasFiltradas.reduce((acc, nota) => acc + Number(nota.valor_fat || 0), 0);
  const totalCreditado = notasFiltradas.reduce((acc, nota) => acc + Number(nota.valor_cred || 0), 0);
  const totalNotas = notasFiltradas.length;
  const saldoAReceber = totalFaturado - totalCreditado;

  if (loading) return <CircularProgress sx={{ display: "block", m: "10% auto" }} />;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3, maxWidth: 1200, mx: "auto", pb: 5 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2 }}>
        <Title title="Notas Fiscais" subtitle="Gestão centralizada do faturamento das demandas" />
        <Button 
          variant="contained" 
          startIcon={<PdfIcon />} 
          onClick={() => setModalRelatorioOpen(true)}
          sx={{ borderRadius: 2 }}
        >
          Relatório Contábil
        </Button>
      </Box>

      <Box sx={{ display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap", bgcolor: "#f8f9fa", p: 2, borderRadius: 2 }}>
        <ToggleButtonGroup
          color="primary"
          value={tipoFiltro}
          exclusive
          onChange={(_, newValue) => newValue && setTipoFiltro(newValue)}
          size="small"
          sx={{ bgcolor: "#fff" }}
        >
          <ToggleButton value="por_ano" sx={{ fontWeight: "bold" }}>Por Ano</ToggleButton>
          <ToggleButton value="ultimos_12" sx={{ fontWeight: "bold" }}>Últimos 12 Meses</ToggleButton>
        </ToggleButtonGroup>

        {tipoFiltro === "por_ano" && (
          <TextField
            select
            label="Ano"
            size="small"
            value={ano}
            onChange={(e) => setAno(e.target.value)}
            sx={{ minWidth: 120, bgcolor: "#fff", borderRadius: 1 }}
          >
            {/* 👇 Dropdown gerado dinamicamente pelos dados reais do banco! */}
            {anosDisponiveis.map((a) => (
              <MenuItem key={a} value={a}>{a}</MenuItem>
            ))}
          </TextField>
        )}
      </Box>

      <ResumoNotas
        totalFaturado={totalFaturado}
        totalCreditado={totalCreditado}
        saldoAReceber={saldoAReceber}
        totalNotas={totalNotas}
      />

      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {notasFiltradas.length === 0 ? (
          <Paper sx={{ p: 5, textAlign: "center", border: "1px dashed #ccc", bgcolor: "transparent" }}>
            <Typography color="text.secondary">Nenhuma nota fiscal encontrada neste período.</Typography>
          </Paper>
        ) : (
          notasFiltradas.map((nota) => (
            <NotaFiscalCard
              key={nota.id || nota.nota_fiscal}
              nota={nota}
              onClick={() => nota.demandaId && router.push(`/demandas/${nota.demandaId}`)}
            />
          ))
        )}
      </Box>

      <RelatorioContabilidadeModal 
        open={modalRelatorioOpen} 
        onClose={() => setModalRelatorioOpen(false)} 
        notas={todasNotas} 
      />
    </Box>
  );
}