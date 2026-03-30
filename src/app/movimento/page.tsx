"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  Typography,
  Button,
  Paper,
  Collapse,
  TextField,
  MenuItem,
  CircularProgress,
} from "@mui/material";
import {
  FilterList as FilterIcon,
  UploadFile as UploadIcon,
  AutoFixHigh as AutoFixIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  FileDownload as DownloadIcon,
} from "@mui/icons-material";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { IMovimento } from "@/types/movimento";

// 👇 Novos imports do serviço limpo
import {
  buscarTodosMovimentos,
  buscarRegrasOcultacao,
} from "@/services/movimentosService";

// --- COMPONENTES IMPORTADOS ---
import ImportarOFXModal from "./_components/ImportarOFXModal";
import RegrasOcultacaoModal from "./_components/RegrasOcultacaoModal";
import Title from "@/components/Title";
import ResumoFinanceiro from "./_components/ResumoFinanceiro";
import MovimentoCard from "./_components/MovimentoCard";

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

export default function MovimentoPage() {
  const { role } = useAuth();
  const router = useRouter();

  const [movimentos, setMovimentos] = useState<IMovimento[]>([]);
  const [loading, setLoading] = useState(true);

  // 👇 Gatilho para recarregar a lista quando o modal de OFX fechar
  const [triggerRefresh, setTriggerRefresh] = useState(0);

  // Estados para modais
  const [modalOfxOpen, setModalOfxOpen] = useState(false);
  const [modalRegrasOpen, setModalRegrasOpen] = useState(false);
  const [regrasOcultacao, setRegrasOcultacao] = useState<string[]>([]);

  // 1. ESTADOS FIXOS DE DATA
  const dataAtual = new Date();
  const [ano, setAno] = useState<string>(dataAtual.getFullYear().toString());
  const [mes, setMes] = useState<string>(
    String(dataAtual.getMonth() + 1).padStart(2, "0"),
  );

  // Filtros Ocultáveis
  const [showFilters, setShowFilters] = useState(false);
  const [filtrosExtras, setFiltrosExtras] = useState({
    banco: "",
    classificacao: "",
  });

  const isConsulta = role === "consulta";
  const isFilterActive =
    filtrosExtras.banco !== "" || filtrosExtras.classificacao !== "";

  // 2. Lógica de Persistência (SessionStorage)
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

  // 3. Busca Centralizada (Supabase)
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [movs, regras] = await Promise.all([
          buscarTodosMovimentos(),
          buscarRegrasOcultacao(),
        ]);
        setMovimentos(movs);
        setRegrasOcultacao(regras);
      } catch (error) {
        console.error("Erro ao carregar dados financeiros:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [triggerRefresh]); // Recarrega se o trigger mudar
  const anos = [
    ...new Set(movimentos.map((movimento) => movimento.data.slice(0, 4))),
  ];
  const normalizarTexto = (texto?: string) => {
    if (!texto) return "";
    return texto
      .toString()
      .toLowerCase()
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  };

  const movimentosValidos = useMemo(() => {
    const regrasLimpas = regrasOcultacao.map((regra) => normalizarTexto(regra));
    return movimentos.filter((mov) => {
      const textoDescricao = mov.descricao || "";
      const descricaoLimpa = normalizarTexto(textoDescricao);
      return !regrasLimpas.includes(descricaoLimpa);
    });
  }, [movimentos, regrasOcultacao]);

  const getStatusPreenchimento = (mov: IMovimento) => {
    const hasFavorecido = !!mov.favorecido?.trim();
    const hasClassificacao = !!mov.classificacao;
    const isObra = mov.classificacao === "Obra";
    const hasDemanda = !!mov.demanda?.trim(); // Replace 'demanda' with the correct property name from IMovimento

    if (!hasFavorecido && !hasClassificacao && !mov.observacao) return "vazio";
    if (
      hasFavorecido &&
      hasClassificacao &&
      (!isObra || (isObra && hasDemanda))
    )
      return "completo";
    return "incompleto";
  };

  const statusColors = {
    vazio: "#e0e0e0",
    incompleto: "#ffc107",
    completo: "#28a745",
  };

  const statusPorMes = useMemo(() => {
    const status: Record<string, { total: number; completos: number }> = {};
    movimentosValidos.forEach((mov) => {
      const [movAno, movMes] = mov.data.split("-");
      if (movAno === ano) {
        if (!status[movMes]) status[movMes] = { total: 0, completos: 0 };
        status[movMes].total += 1;
        if (getStatusPreenchimento(mov) === "completo")
          status[movMes].completos += 1;
      }
    });
    return status;
  }, [movimentosValidos, ano]);

  const movimentosFiltrados = useMemo(() => {
    return movimentosValidos.filter((mov) => {
      const [movAno, movMes] = mov.data.split("-");
      if (ano && movAno !== ano) return false;
      if (mes && movMes !== mes) return false;
      if (filtrosExtras.banco && mov.banco !== filtrosExtras.banco)
        return false;
      if (
        filtrosExtras.classificacao &&
        mov.classificacao !== filtrosExtras.classificacao
      )
        return false;
      return true;
    });
  }, [movimentosValidos, ano, mes, filtrosExtras]);

  const handleClearFilters = () =>
    setFiltrosExtras({ banco: "", classificacao: "" });

  if (loading)
    return <CircularProgress sx={{ display: "block", m: "10% auto" }} />;

  const totalItens = movimentosFiltrados.length;
  const saldoMes = movimentosFiltrados.reduce(
    (acc, mov) => acc + Number(mov.valor || 0),
    0,
  );
  const nomeMesSelecionado = MESES.find((m) => m.valor === mes)?.nome || "Mês";

  // Função para exportar os movimentos visíveis na tela para Excel (CSV)
  const exportarParaExcel = () => {
    // ⚠️ Troque 'movimentosFiltrados' pelo nome do estado/variável que guarda a lista da tela
    if (!movimentosFiltrados || movimentosFiltrados.length === 0) {
      alert("Não há dados para exportar neste período.");
      return;
    }

    // 1. Monta o Cabeçalho
    const cabecalho = [
      "Data",
      "Banco",
      "Descricao",
      "Favorecido",
      "Classificacao",
      "Valor",
      "Demanda",
      "Observacao",
    ];

    // 2. Monta as Linhas (Formatando os dados para o padrão BR)
    const linhas = movimentosFiltrados.map((m) => {
      const dataFormatada = m.data
        ? String(m.data).split("-").reverse().join("/")
        : "";
      const valorFormatado = Number(m.valor || 0)
        .toFixed(2)
        .replace(".", ","); // Converte 1500.50 para 1500,50

      return [
        dataFormatada,
        `"${m.banco || ""}"`, // Aspas evitam que o Excel quebre a linha se o texto tiver vírgula
        `"${m.descricao || ""}"`,
        `"${m.favorecido || ""}"`,
        `"${m.classificacao || ""}"`,
        valorFormatado,
        `"${m.demanda || ""}"`,
        `"${m.observacao || ""}"`,
      ].join(";"); // Ponto e vírgula é o separador padrão do Excel em português
    });

    // 3. Junta tudo e cria o arquivo invisível na memória
    const csvString = [cabecalho.join(";"), ...linhas].join("\n");
    const blob = new Blob(["\uFEFF" + csvString], {
      type: "text/csv;charset=utf-8;",
    }); // \uFEFF garante que acentos fiquem certos

    // 4. Força o download
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    // ⚠️ Se você tiver o mês/ano no state, pode colocar aqui (Ex: Movimentos_03_2026.csv)
    link.setAttribute("download", `Movimentos_Exportados.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 3,
        maxWidth: "lg",
        mx: "auto",
        pb: 5,
      }}
    >
      {/* CABEÇALHO */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 2,
        }}
      >
        <Title
          title="Movimento Financeiro"
          subtitle="Extratos bancários unificados e detalhados"
        />

        <Box sx={{ display: "flex", gap: 2 }}>
          {!isConsulta && (
            <>
              <Button
                variant="outlined"
                color="success"
                startIcon={<DownloadIcon />}
                onClick={exportarParaExcel}
                sx={{ fontWeight: "bold" }}
              >
                Exportar Excel
              </Button>
              <Button
                variant="contained"
                color="secondary"
                startIcon={<AutoFixIcon />}
                sx={{ borderRadius: 2 }}
                onClick={() => setModalRegrasOpen(true)}
              >
                Ocultar Registros
              </Button>
              <Button
                variant="contained"
                color="primary"
                startIcon={<UploadIcon />}
                sx={{ borderRadius: 2 }}
                onClick={() => setModalOfxOpen(true)}
              >
                Importar OFX
              </Button>
            </>
          )}
        </Box>
      </Box>

      {/* BARRA FIXA DE FILTROS */}
      <Box
        sx={{ display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}
      >
        <TextField
          select
          label="Ano"
          size="small"
          value={ano}
          onChange={(e) => setAno(e.target.value)}
          sx={{ minWidth: 100, bgcolor: "#fff", borderRadius: 1 }}
        >
          {anos.map((a) => (
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
          sx={{ minWidth: 200, bgcolor: "#fff", borderRadius: 1 }}
        >
          {MESES.map((m) => {
            const dadosMes = statusPorMes[m.valor];
            let icone = null;
            if (dadosMes) {
              icone =
                dadosMes.completos === dadosMes.total ? (
                  <CheckCircleIcon
                    fontSize="small"
                    sx={{ color: "success.main", ml: 1 }}
                  />
                ) : (
                  <WarningIcon
                    fontSize="small"
                    sx={{ color: "warning.main", ml: 1 }}
                  />
                );
            }
            return (
              <MenuItem key={m.valor} value={m.valor}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    width: "100%",
                  }}
                >
                  {m.nome} {icone}
                </Box>
              </MenuItem>
            );
          })}
        </TextField>

        <Button
          variant={showFilters ? "contained" : "outlined"}
          startIcon={<FilterIcon />}
          onClick={() => setShowFilters(!showFilters)}
          sx={{ height: 40, borderRadius: 2 }}
        >
          Filtros {isFilterActive && "Ativos"}
        </Button>
      </Box>

      {/* FILTROS EXTRAS */}
      <Collapse in={showFilters}>
        <Paper
          sx={{
            p: 3,
            borderRadius: 3,
            display: "flex",
            gap: 2,
            flexWrap: "wrap",
            alignItems: "center",
            bgcolor: "#f8f9fa",
          }}
        >
          <TextField
            select
            label="Banco"
            size="small"
            value={filtrosExtras.banco}
            onChange={(e) =>
              setFiltrosExtras({ ...filtrosExtras, banco: e.target.value })
            }
            sx={{ minWidth: 170 }}
          >
            <MenuItem value="">Todos</MenuItem>
            {["SANTANDER", "BRADESCO", "ITAU"].map((t) => (
              <MenuItem key={t} value={t}>
                {t}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            label="Tipo de Despesa"
            size="small"
            value={filtrosExtras.classificacao}
            onChange={(e) =>
              setFiltrosExtras({
                ...filtrosExtras,
                classificacao: e.target.value,
              })
            }
            sx={{ minWidth: 170 }}
          >
            <MenuItem value="">Todos</MenuItem>
            {["Fixa", "Obra", "Tributo", "Empréstimo", "Outra"].map((t) => (
              <MenuItem key={t} value={t}>
                {t}
              </MenuItem>
            ))}
          </TextField>

          {isFilterActive && (
            <Button
              onClick={handleClearFilters}
              sx={{
                ml: "auto",
                fontWeight: "200",
                color: "gray",
                textTransform: "none",
              }}
            >
              Limpar Filtros
            </Button>
          )}
        </Paper>
      </Collapse>

      {/* RESUMO FINANCEIRO */}
      <ResumoFinanceiro
        nomeMesSelecionado={nomeMesSelecionado}
        ano={ano}
        totalItens={totalItens}
        saldoMes={saldoMes}
      />

      {/* LISTAGEM DE CARDS */}
      <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        {movimentosFiltrados.length === 0 ? (
          <Paper
            sx={{
              p: 5,
              textAlign: "center",
              border: "1px dashed #ccc",
              bgcolor: "transparent",
            }}
          >
            <Typography color="text.secondary">
              Nenhuma movimentação encontrada com estes filtros.
            </Typography>
          </Paper>
        ) : (
          movimentosFiltrados.map((mov) => {
            const status = getStatusPreenchimento(mov);
            const corBorda = statusColors[status];
            const tituloCard =
              mov.observacao === "" || !mov.observacao
                ? mov.descricao
                : mov.observacao;
            const dataFormatada = mov.data.split("-").reverse().join("/");

            return (
              <MovimentoCard
                key={mov.id}
                mov={mov}
                corBorda={corBorda}
                tituloCard={tituloCard}
                dataFormatada={dataFormatada}
                isConsulta={isConsulta}
                onClick={() =>
                  !isConsulta && router.push(`/movimento/${mov.id}`)
                }
              />
            );
          })
        )}
      </Box>

      {/* MODAIS */}
      <ImportarOFXModal
        open={modalOfxOpen}
        onClose={() => setModalOfxOpen(false)}
        onSuccess={(anoImportado, mesImportado) => {
          setAno(anoImportado);
          setMes(mesImportado);
          setTriggerRefresh((prev) => prev + 1); // Recarrega a tela com os novos dados
        }}
      />
      <RegrasOcultacaoModal
        open={modalRegrasOpen}
        onClose={() => {
          setModalRegrasOpen(false);
          setTriggerRefresh((prev) => prev + 1); // Recarrega se o usuário alterou as regras
        }}
      />
    </Box>
  );
}
