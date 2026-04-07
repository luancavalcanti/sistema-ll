// src/app/contas-a-pagar/page.tsx

"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Box, Typography, Button, CircularProgress, Paper, Tabs, Tab, TextField, MenuItem } from "@mui/material";
import { Add as AddIcon } from "@mui/icons-material";
import Title from "@/components/Title";
import { useAuth } from "@/contexts/AuthContext";
import { IContaAPagar } from "@/types/conta";
import { buscarContasAPagar, darBaixaConta } from "@/services/contasService";

import { ContaCard } from "./_components/ContaCard";
import { ModalCriarConta } from "./_components/ModalCriarConta";
import { ModalEditarConta } from "./_components/ModalEditarConta";
import { ContasResumo } from "./_components/ContasReumo";

// 👇 Apenas um dicionário para traduzir o número para o nome do mês
const NOME_MESES: Record<string, string> = {
  "01": "Janeiro", "02": "Fevereiro", "03": "Março", "04": "Abril",
  "05": "Maio", "06": "Junho", "07": "Julho", "08": "Agosto",
  "09": "Setembro", "10": "Outubro", "11": "Novembro", "12": "Dezembro"
};

export default function ContasAPagarPage() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  
  const [contas, setContas] = useState<IContaAPagar[]>([]);
  const [loading, setLoading] = useState(true);
  const [abaAtual, setAbaAtual] = useState(0);

  const [anoFiltro, setAnoFiltro] = useState<string>(new Date().getFullYear().toString());
  const [mesFiltro, setMesFiltro] = useState<string>("Todos");

  const [modalCriarOpen, setModalCriarOpen] = useState(false);
  const [modalEditOpen, setModalEditOpen] = useState(false);
  const [contaEditando, setContaEditando] = useState<IContaAPagar | null>(null);

  const carregarContas = async () => {
    setLoading(true);
    try {
      setContas(await buscarContasAPagar());
    } catch (error) { console.error(error); } 
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (authLoading || !user) return;
    carregarContas();
  }, [user?.id, authLoading]);

  // GERAÇÃO DA LISTA DE ANOS
  const listaAnos = useMemo(() => {
    const anos = contas.map(c => c.data_vencimento.split("-")[0]);
    const anosUnicos = Array.from(new Set(anos)).sort((a, b) => b.localeCompare(a));
    return ["Todos", ...anosUnicos];
  }, [contas]);

  // 👇 NOVA LÓGICA: Geração dinâmica de meses com contagem!
  const listaMeses = useMemo(() => {
    // Primeiro, filtramos as contas pelo ano que o usuário escolheu (se não for "Todos")
    const contasDoAno = anoFiltro === "Todos" 
      ? contas 
      : contas.filter(c => c.data_vencimento.split("-")[0] === anoFiltro);

    // Contamos quantos boletos tem em cada mês daquele ano
    const contagemMeses: Record<string, number> = {};
    contasDoAno.forEach(c => {
      const mes = c.data_vencimento.split("-")[1];
      if (mes) {
        contagemMeses[mes] = (contagemMeses[mes] || 0) + 1;
      }
    });

    // Pegamos só os meses que têm boletos, ordenamos (01, 02...) e criamos o Label
    const mesesDisponiveis = Object.keys(contagemMeses).sort();
    const opcoes = mesesDisponiveis.map(mes => ({
      valor: mes,
      label: `${NOME_MESES[mes]} (${contagemMeses[mes]})` // Ex: Janeiro (5)
    }));

    // Se o usuário trocar o ano e o mês atual selecionado não existir no novo ano, volta para "Todos"
    if (mesFiltro !== "Todos" && !contagemMeses[mesFiltro]) {
      setMesFiltro("Todos");
    }

    return [
      { valor: "Todos", label: `Todos os Meses (${contasDoAno.length})` },
      ...opcoes
    ];
  }, [contas, anoFiltro, mesFiltro]);

  // LÓGICA DE FILTRAGEM FINAL PARA TELA
  const contasFiltradas = useMemo(() => {
    return contas.filter((c) => {
      const [ano, mes] = c.data_vencimento.split("-");
      const matchAno = anoFiltro === "Todos" || ano === anoFiltro;
      const matchMes = mesFiltro === "Todos" || mes === mesFiltro;
      return matchAno && matchMes;
    });
  }, [contas, anoFiltro, mesFiltro]);

  if (!authLoading && !isAdmin) return <Box sx={{ p: 5, textAlign: "center" }}><Typography variant="h5" color="error">Acesso Restrito</Typography></Box>;

  const handleBaixa = async (conta: IContaAPagar) => {
    if (!confirm("Confirmar o pagamento desta conta?")) return;
    setLoading(true);
    try {
      await darBaixaConta(conta);
      await carregarContas();
    } catch (error) { alert("Erro ao dar baixa."); setLoading(false); }
  };

  if (loading || authLoading) return <CircularProgress sx={{ display: "block", mx: "auto", mt: 10 }} />;
  
  const contasPendentes = contasFiltradas.filter(c => c.status === "Pendente");
  const contasPagas = contasFiltradas.filter(c => c.status === "Pago");
  const contasExibidas = abaAtual === 0 ? contasPendentes : contasPagas;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3, maxWidth: "lg", mx: "auto", pb: 5 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2 }}>
        <Title title="Contas a Pagar" subtitle="Gestão de pagamentos e boletos" />
        <Button variant="contained" startIcon={<AddIcon />} sx={{ borderRadius: 2, fontWeight: "bold" }} onClick={() => setModalCriarOpen(true)}>
          Registrar Pagamento
        </Button>
      </Box>

      {/* Resumo (Baseado nos filtros atuais) */}
      <ContasResumo contasPendentes={contasPendentes} />

      {/* 👇 BARRA DE FILTROS */}
      <Paper sx={{ p: 2, display: "flex", gap: 2, flexDirection: { xs: "column", sm: "row" }, bgcolor: "#f8f9fa" }}>
        <TextField
          select
          label="Ano"
          size="small"
          value={anoFiltro}
          onChange={(e) => setAnoFiltro(e.target.value)}
          sx={{ minWidth: 120, bgcolor: "#fff" }}
        >
          {listaAnos.map(ano => <MenuItem key={ano} value={ano}>{ano}</MenuItem>)}
        </TextField>

        <TextField
          select
          label="Mês"
          size="small"
          value={mesFiltro}
          onChange={(e) => setMesFiltro(e.target.value)}
          sx={{ minWidth: 200, bgcolor: "#fff" }}
        >
          {listaMeses.map(mes => <MenuItem key={mes.valor} value={mes.valor}>{mes.label}</MenuItem>)}
        </TextField>
      </Paper>

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={abaAtual} onChange={(e, val) => setAbaAtual(val)} textColor="primary" indicatorColor="primary" variant="fullWidth">
          <Tab label={`Pendentes (${contasPendentes.length})`} sx={{ fontWeight: "bold" }} />
          <Tab label={`Pagos (${contasPagas.length})`} sx={{ fontWeight: "bold" }} />
        </Tabs>
      </Box>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {contasExibidas.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: "center", border: "1px dashed #ccc", bgcolor: "transparent" }}>
            <Typography color="text.secondary">Nenhum registro encontrado para este período.</Typography>
          </Paper>
        ) : (
          contasExibidas.map(conta => (
            <ContaCard 
              key={conta.id} 
              conta={conta} 
              abaAtual={abaAtual} 
              onEdit={(c) => { setContaEditando(c); setModalEditOpen(true); }} 
              onBaixa={handleBaixa} 
            />
          ))
        )}
      </Box>

      {user && (
        <ModalCriarConta 
          open={modalCriarOpen} 
          onClose={() => setModalCriarOpen(false)} 
          onSuccess={carregarContas} 
          userId={user.id} 
        />
      )}
      
      <ModalEditarConta 
        open={modalEditOpen} 
        onClose={() => setModalEditOpen(false)} 
        conta={contaEditando} 
        onSuccess={carregarContas} 
      />
    </Box>
  );
}