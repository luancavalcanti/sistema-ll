"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Box, Typography, Button, Paper, Collapse, TextField, MenuItem, CircularProgress, Divider
} from "@mui/material";
import {
  FilterList as FilterIcon, UploadFile as UploadIcon, AutoFixHigh as AutoFixIcon,
  CheckCircle as CheckCircleIcon, Warning as WarningIcon, FileDownload as DownloadIcon,
  ErrorOutline as ErrorIcon
} from "@mui/icons-material";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { IMovimento } from "@/types/movimento";

import { buscarTodosMovimentos, buscarRegrasOcultacao, marcarComoNaoDuplicado, excluirMovimento } from "@/services/movimentosService";

import ImportarOFXModal from "./_components/ImportarOFXModal";
import RegrasOcultacaoModal from "./_components/RegrasOcultacaoModal";
import Title from "@/components/Title";
import ResumoFinanceiro from "./_components/ResumoFinanceiro";
import MovimentoCard from "./_components/MovimentoCard";

const MESES = [
  { valor: "01", nome: "Janeiro" }, { valor: "02", nome: "Fevereiro" },
  { valor: "03", nome: "Março" }, { valor: "04", nome: "Abril" },
  { valor: "05", nome: "Maio" }, { valor: "06", nome: "Junho" },
  { valor: "07", nome: "Julho" }, { valor: "08", nome: "Agosto" },
  { valor: "09", nome: "Setembro" }, { valor: "10", nome: "Outubro" },
  { valor: "11", nome: "Novembro" }, { valor: "12", nome: "Dezembro" },
];

export default function MovimentoPage() {
  const { role } = useAuth();
  const router = useRouter();

  const [movimentos, setMovimentos] = useState<IMovimento[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggerRefresh, setTriggerRefresh] = useState(0);

  // Armazena os IDs dos movimentos marcados como "Autênticos" (Não Duplicados)
  const [ignoradosDuplicidade, setIgnoradosDuplicidade] = useState<string[]>([]);

  const [modalOfxOpen, setModalOfxOpen] = useState(false);
  const [modalRegrasOpen, setModalRegrasOpen] = useState(false);
  const [regrasOcultacao, setRegrasOcultacao] = useState<string[]>([]);

  const dataAtual = new Date();
  const [ano, setAno] = useState<string>(dataAtual.getFullYear().toString());
  const [mes, setMes] = useState<string>(String(dataAtual.getMonth() + 1).padStart(2, "0"));

  const [showFilters, setShowFilters] = useState(false);
  const [filtrosExtras, setFiltrosExtras] = useState({ banco: "", classificacao: "" });

  const isConsulta = role === "consulta";
  const isFilterActive = filtrosExtras.banco !== "" || filtrosExtras.classificacao !== "";

  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const savedAno = sessionStorage.getItem("movimentoAno");
    const savedMes = sessionStorage.getItem("movimentoMes");
    if (savedAno) setAno(savedAno);
    if (savedMes) setMes(savedMes);
    setIsInitialized(true);
  }, []);

  useEffect(() => {
    if (isInitialized) {
      sessionStorage.setItem("movimentoAno", ano);
      sessionStorage.setItem("movimentoMes", mes);
    }
  }, [ano, mes, isInitialized]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [movs, regras] = await Promise.all([buscarTodosMovimentos(), buscarRegrasOcultacao()]);
        setMovimentos(movs);
        setRegrasOcultacao(regras);
      } catch (error) {
        console.error("Erro ao carregar dados financeiros:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [triggerRefresh]);

  const anos = [...new Set(movimentos.map((m) => m.data.slice(0, 4)))];

  const normalizarTexto = (texto?: string) => {
    if (!texto) return "";
    return texto.toString().toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  };

  const movimentosValidos = useMemo(() => {
    const regrasLimpas = regrasOcultacao.map((regra) => normalizarTexto(regra));
    return movimentos.filter((mov) => {
      const descricaoLimpa = normalizarTexto(mov.descricao || "");
      return !regrasLimpas.includes(descricaoLimpa);
    });
  }, [movimentos, regrasOcultacao]);

  const getStatusPreenchimento = (mov: IMovimento) => {
    const hasFavorecido = !!mov.favorecido?.trim();
    const hasClassificacao = !!mov.classificacao;
    const isObra = mov.classificacao === "Obra";
    const hasDemanda = !!mov.demanda?.trim();

    if (!hasFavorecido && !hasClassificacao && !mov.observacao) return "vazio";
    if (hasFavorecido && hasClassificacao && (!isObra || (isObra && hasDemanda))) return "completo";
    return "incompleto";
  };

  const statusColors = { vazio: "#e0e0e0", incompleto: "#ffc107", completo: "#28a745" };

  const statusPorMes = useMemo(() => {
    const status: Record<string, { total: number; completos: number }> = {};
    movimentosValidos.forEach((mov) => {
      const [movAno, movMes] = mov.data.split("-");
      if (movAno === ano) {
        if (!status[movMes]) status[movMes] = { total: 0, completos: 0 };
        status[movMes].total += 1;
        if (getStatusPreenchimento(mov) === "completo") status[movMes].completos += 1;
      }
    });
    return status;
  }, [movimentosValidos, ano]);

  const movimentosFiltrados = useMemo(() => {
    return movimentosValidos.filter((mov) => {
      const [movAno, movMes] = mov.data.split("-");
      if (ano && movAno !== ano) return false;
      if (mes && movMes !== mes) return false;
      if (filtrosExtras.banco && mov.banco !== filtrosExtras.banco) return false;
      if (filtrosExtras.classificacao && mov.classificacao !== filtrosExtras.classificacao) return false;
      return true;
    });
  }, [movimentosValidos, ano, mes, filtrosExtras]);

  // 👇 1. Mapeia duplicatas ignorando as que já foram marcadas como autênticas no banco
  const contagemDuplicatas = useMemo(() => {
    const mapa = new Map<string, number>();
    
    // Conta apenas os que NÃO tem a flag ignorar_duplicidade = true
    const movsParaContar = movimentosFiltrados.filter(m => !m.ignorar_duplicidade);
    
    movsParaContar.forEach((mov) => {
      const chave = `${mov.data}_${mov.valor}_${mov.banco}`;
      mapa.set(chave, (mapa.get(chave) || 0) + 1);
    });
    return mapa;
  }, [movimentosFiltrados]);

  // Verifica se é duplicada lendo do banco e do mapa
  const checkIsDuplicada = (mov: IMovimento) => {
    if (mov.ignorar_duplicidade) return false;
    const chave = `${mov.data}_${mov.valor}_${mov.banco}`;
    return (contagemDuplicatas.get(chave) || 0) > 1;
  };

  // 👇 Funções de Ação Rápida
  const handleIgnorarDuplicidade = async (id: string) => {
    try {
      await marcarComoNaoDuplicado(id);
      // Atualiza a tela instantaneamente
      setMovimentos(prev => prev.map(m => m.id === id ? { ...m, ignorar_duplicidade: true } : m));
    } catch (error) {
      alert("Erro ao marcar como autêntico.");
    }
  };

  const handleExcluirDuplicata = async (id: string, valor: number) => {
    if (window.confirm(`Tem certeza que deseja EXCLUIR DEFINITIVAMENTE este registro de R$ ${valor}?`)) {
      try {
        await excluirMovimento(id);
        // Remove da tela instantaneamente
        setMovimentos(prev => prev.filter(m => m.id !== id));
      } catch (error) {
        alert("Erro ao excluir duplicata.");
      }
    }
  };

  // DIVISÃO EM 3 GRUPOS
  const movimentosDuplicados = movimentosFiltrados.filter(checkIsDuplicada);
  const movimentosRestantes = movimentosFiltrados.filter((mov) => !checkIsDuplicada(mov));

  const movimentosPendentes = movimentosRestantes.filter((mov) => getStatusPreenchimento(mov) !== "completo");
  const movimentosClassificados = movimentosRestantes.filter((mov) => getStatusPreenchimento(mov) === "completo");

  // AGRUPAMENTO DOS DUPLICADOS PARA A MOLDURA
  const gruposDuplicados = useMemo(() => {
    const grupos: Record<string, IMovimento[]> = {};
    movimentosDuplicados.forEach(mov => {
      const chave = `${mov.data}_${mov.valor}_${mov.banco}`;
      if (!grupos[chave]) grupos[chave] = [];
      grupos[chave].push(mov);
    });
    return grupos;
  }, [movimentosDuplicados]);

  const handleClearFilters = () => setFiltrosExtras({ banco: "", classificacao: "" });

  if (loading) return <CircularProgress sx={{ display: "block", m: "10% auto" }} />;

  const totalItens = movimentosFiltrados.length;
  const saldoMes = movimentosFiltrados.reduce((acc, mov) => acc + Number(mov.valor || 0), 0);
  const nomeMesSelecionado = MESES.find((m) => m.valor === mes)?.nome || "Mês";

  // Função para renderizar os cards dinamicamente
  const renderCard = (mov: IMovimento) => {
    const status = getStatusPreenchimento(mov);
    const corBorda = statusColors[status];
    const tituloCard = mov.observacao === "" || !mov.observacao ? mov.descricao : mov.observacao;
    const dataFormatada = mov.data.split("-").reverse().join("/");
    const isDuplicada = checkIsDuplicada(mov);

    return (
      <MovimentoCard
        key={mov.id}
        mov={mov}
        corBorda={corBorda}
        tituloCard={tituloCard}
        dataFormatada={dataFormatada}
        isConsulta={isConsulta}
        isDuplicada={isDuplicada}
        onIgnore={isDuplicada ? () => handleIgnorarDuplicidade(mov.id) : undefined}
        onDelete={isDuplicada ? () => handleExcluirDuplicata(mov.id, Number(mov.valor)) : undefined}
        onClick={() => !isConsulta && router.push(`/movimento/${mov.id}`)}
      />
    );
  };

  const exportarParaExcel = () => {
    if (!movimentosFiltrados || movimentosFiltrados.length === 0) {
      alert("Não há dados para exportar neste período.");
      return;
    }
    const cabecalho = ["Data", "Banco", "Descricao", "Favorecido", "Classificacao", "Valor", "Demanda", "Observacao"];
    const linhas = movimentosFiltrados.map((m) => {
      const dataFmt = m.data ? String(m.data).split("-").reverse().join("/") : "";
      const valorFmt = Number(m.valor || 0).toFixed(2).replace(".", ",");
      return [dataFmt, `"${m.banco || ""}"`, `"${m.descricao || ""}"`, `"${m.favorecido || ""}"`, `"${m.classificacao || ""}"`, valorFmt, `"${m.demanda || ""}"`, `"${m.observacao || ""}"`].join(";");
    });
    const csvString = [cabecalho.join(";"), ...linhas].join("\n");
    const blob = new Blob(["\uFEFF" + csvString], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `Movimentos_${mes}_${ano}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3, maxWidth: "lg", mx: "auto", pb: 5 }}>
      {/* CABEÇALHO E FILTROS MANTIDOS IGUAIS... */}
      <Box sx={{ display: "flex", justifyContent: { xs: "flex-end", sm: "space-between" }, alignItems: "center", flexWrap: "wrap", gap: 2 }}>
        <Title title="Movimento Financeiro" subtitle="Extratos bancários unificados e detalhados" />
        <Box sx={{ display: "flex", gap: 2 }}>
          <Button variant="outlined" color="success" startIcon={<DownloadIcon />} onClick={exportarParaExcel} sx={{ borderRadius: 2 }}>
            <Typography variant="body2" sx={{ display: { xs: "none", sm: "block" } }}>Exportar Excel</Typography>
            <Typography variant="body2" sx={{ display: { xs: "block", sm: "none" } }}>xls</Typography>
          </Button>
          {!isConsulta && (
            <>
              <Button variant="contained" color="secondary" startIcon={<AutoFixIcon />} sx={{ borderRadius: 2 }} onClick={() => setModalRegrasOpen(true)}>
                <Typography variant="body2" sx={{ display: { xs: "none", sm: "block" } }}>Ocultar Registros</Typography>
                <Typography variant="body2" sx={{ display: { xs: "block", sm: "none" } }}>Ocultar</Typography>
              </Button>
              <Button variant="contained" color="primary" startIcon={<UploadIcon />} sx={{ borderRadius: 2 }} onClick={() => setModalOfxOpen(true)}>
                <Typography variant="body2" sx={{ display: { xs: "none", sm: "block" } }}>Importar OFX</Typography>
                <Typography variant="body2" sx={{ display: { xs: "block", sm: "none" } }}>OFX</Typography>
              </Button>
            </>
          )}
        </Box>
      </Box>

      <Box sx={{ display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
        <TextField select label="Ano" size="small" value={ano} onChange={(e) => setAno(e.target.value)} sx={{ minWidth: 100, bgcolor: "#fff", borderRadius: 1 }}>
          {anos.map((a) => <MenuItem key={a} value={a}>{a}</MenuItem>)}
        </TextField>

        <TextField select label="Mês" size="small" value={mes} onChange={(e) => setMes(e.target.value)} sx={{ minWidth: 200, bgcolor: "#fff", borderRadius: 1 }}>
          {MESES.map((m) => {
            const dadosMes = statusPorMes[m.valor];
            let icone = null;
            if (dadosMes) {
              icone = dadosMes.completos === dadosMes.total 
                ? <CheckCircleIcon fontSize="small" sx={{ color: "success.main", ml: 1 }} />
                : <WarningIcon fontSize="small" sx={{ color: "warning.main", ml: 1 }} />;
            }
            return (
              <MenuItem key={m.valor} value={m.valor}>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                  {m.nome} {icone}
                </Box>
              </MenuItem>
            );
          })}
        </TextField>

        <Button variant={showFilters ? "contained" : "outlined"} startIcon={<FilterIcon />} onClick={() => setShowFilters(!showFilters)} sx={{ height: 40, borderRadius: 2 }}>
          Filtros {isFilterActive && "Ativos"}
        </Button>
      </Box>

      <Collapse in={showFilters}>
        <Paper sx={{ p: 3, borderRadius: 3, display: "flex", gap: 2, flexWrap: "wrap", alignItems: "center", bgcolor: "#f8f9fa" }}>
          <TextField select label="Banco" size="small" value={filtrosExtras.banco} onChange={(e) => setFiltrosExtras({ ...filtrosExtras, banco: e.target.value })} sx={{ minWidth: 170 }}>
            <MenuItem value="">Todos</MenuItem>
            {["SANTANDER", "BRADESCO", "ITAU"].map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
          </TextField>
          <TextField select label="Tipo de Despesa" size="small" value={filtrosExtras.classificacao} onChange={(e) => setFiltrosExtras({ ...filtrosExtras, classificacao: e.target.value })} sx={{ minWidth: 170 }}>
            <MenuItem value="">Todos</MenuItem>
            {["Fixa", "Obra", "Tributo", "Empréstimo", "Outra"].map((t) => <MenuItem key={t} value={t}>{t}</MenuItem>)}
          </TextField>
          {isFilterActive && (
            <Button onClick={handleClearFilters} sx={{ ml: "auto", fontWeight: "200", color: "gray", textTransform: "none" }}>
              Limpar Filtros
            </Button>
          )}
        </Paper>
      </Collapse>

      <ResumoFinanceiro nomeMesSelecionado={nomeMesSelecionado} ano={ano} totalItens={totalItens} saldoMes={saldoMes} />

      {/* LISTAGEM DE CARDS DIVIDIDA */}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {movimentosFiltrados.length === 0 ? (
          <Paper sx={{ p: 5, textAlign: "center", border: "1px dashed #ccc", bgcolor: "transparent" }}>
            <Typography color="text.secondary">Nenhuma movimentação encontrada com estes filtros.</Typography>
          </Paper>
        ) : (
          <>
            {/* GRUPO 1: DUPLICADOS (COM MOLDURAS) */}
            {movimentosDuplicados.length > 0 && (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: "bold", color: "error.main", display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <ErrorIcon /> Possíveis Duplicados ({movimentosDuplicados.length})
                </Typography>
                
                {/* Aqui criamos a moldura para cada grupo de lançamentos idênticos */}
                {Object.entries(gruposDuplicados).map(([chave, grupoMovs]) => (
                  <Box 
                    key={chave} 
                    sx={{ 
                      border: '2px dashed', 
                      borderColor: 'error.light', 
                      borderRadius: 3, 
                      p: 2, 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: 2,
                      bgcolor: '#fffafa' // Fundo levíssimo avermelhado para agrupar
                    }}
                  >
                    <Typography variant="caption" sx={{ color: 'error.main', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: 1 }}>
                      Identificados {grupoMovs.length} registros iguais (Banco, Data e Valor)
                    </Typography>
                    
                    {grupoMovs.map(renderCard)}
                  </Box>
                ))}
              </Box>
            )}

            {/* DIVISOR 1 */}
            {movimentosDuplicados.length > 0 && (movimentosPendentes.length > 0 || movimentosClassificados.length > 0) && (
              <Divider sx={{ my: 1 }} />
            )}

            {/* GRUPO 2: PENDENTES */}
            {movimentosPendentes.length > 0 && (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: "bold", color: "warning.main", display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <WarningIcon /> Sem Classificação ({movimentosPendentes.length})
                </Typography>
                {movimentosPendentes.map(renderCard)}
              </Box>
            )}

            {/* DIVISOR 2 */}
            {movimentosPendentes.length > 0 && movimentosClassificados.length > 0 && (
              <Divider sx={{ my: 1 }} />
            )}

            {/* GRUPO 3: CLASSIFICADOS */}
            {movimentosClassificados.length > 0 && (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: "bold", color: "success.main", display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <CheckCircleIcon /> Classificadas ({movimentosClassificados.length})
                </Typography>
                {movimentosClassificados.map(renderCard)}
              </Box>
            )}
          </>
        )}
      </Box>

      <ImportarOFXModal open={modalOfxOpen} onClose={() => setModalOfxOpen(false)} onSuccess={(anoImportado, mesImportado) => { setAno(anoImportado); setMes(mesImportado); setTriggerRefresh((prev) => prev + 1); }} />
      <RegrasOcultacaoModal open={modalRegrasOpen} onClose={() => { setModalRegrasOpen(false); setTriggerRefresh((prev) => prev + 1); }} />
    </Box>
  );
}