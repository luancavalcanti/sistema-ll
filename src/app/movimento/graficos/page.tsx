"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Box,
  Paper,
  Typography,
  TextField,
  MenuItem,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  OutlinedInput,
  Chip,
  Checkbox,
  ListItemText,
  SelectChangeEvent,
  Alert,
} from "@mui/material";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { IMovimento } from "@/types/movimento";
import {
  buscarTodosMovimentos,
  buscarRegrasOcultacao,
} from "@/services/movimentosService";
import Title from "@/components/Title";
import MovimentoMobileTabs from "../_components/MovimentoMobileTabs";

type TipoMovimento = "saidas" | "entradas";
type PeriodoFiltro = "3m" | "6m" | "12m" | "ano_atual";
type TipoGrafico = "barra" | "linha" | "pizza";

const TOTAL_SAIDAS_KEY = "__TOTAL_SAIDAS__";
const TOTAL_ENTRADAS_KEY = "__TOTAL_ENTRADAS__";
const SELECIONAR_TODAS_KEY = "__SELECIONAR_TODAS__";
const SEM_CLASSIFICACAO_KEY = "__SEM_CLASSIFICACAO__";

const CORES_PASTEL = [
  "#E57373", // Vermelho coral pastel
  "#64B5F6", // Azul celeste
  "#81C784", // Verde menta
  "#BA68C8", // Lilás
  "#FFD54F", // Amarelo âmbar
  "#4DD0E1", // Turquesa
  "#F06292", // Rosa
  "#7986CB", // Índigo suave
  "#FFB74D", // Laranja pêssego
  "#90A4AE", // Cinza azulado
];

const CORES_ENTRADAS = [
  "#66BB6A", // Verde pastel
  "#64B5F6", // Azul celeste
  "#4DD0E1", // Turquesa
  "#BA68C8", // Lilás
  "#FFD54F", // Amarelo âmbar
  "#7986CB", // Índigo suave
  "#F06292", // Rosa
  "#90A4AE", // Cinza azulado
];

const MESES_CURTOS = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

const formatarMoeda = (valor: number) =>
  valor.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

const formatarMoedaCompacta = (valor: number) => {
  if (valor >= 1000000) return `R$ ${(valor / 1000000).toFixed(1)}M`;
  if (valor >= 1000) return `R$ ${(valor / 1000).toFixed(0)}k`;
  return `R$ ${valor.toFixed(0)}`;
};

export default function MovimentoGraficosPage() {
  const { isAdmin, isConsulta, loading: authLoading } = useAuth();
  const router = useRouter();

  const [movimentos, setMovimentos] = useState<IMovimento[]>([]);
  const [regrasOcultacao, setRegrasOcultacao] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  const [tipoMovimento, setTipoMovimento] = useState<TipoMovimento>("saidas");
  const [dadosSelecionados, setDadosSelecionados] = useState<string[]>([
    TOTAL_SAIDAS_KEY,
  ]);
  const [periodo, setPeriodo] = useState<PeriodoFiltro>("12m");
  const [tipoGrafico, setTipoGrafico] = useState<TipoGrafico>("barra");

  useEffect(() => {
    if (!authLoading && !isAdmin && !isConsulta) {
      router.push("/");
    }
  }, [authLoading, isAdmin, isConsulta, router]);

  useEffect(() => {
    const carregarDados = async () => {
      setLoading(true);
      try {
        const [movs, regras] = await Promise.all([
          buscarTodosMovimentos(),
          buscarRegrasOcultacao(),
        ]);
        setMovimentos(movs || []);
        setRegrasOcultacao(regras || []);
      } catch (error) {
        console.error("Erro ao carregar dados para gráficos:", error);
      } finally {
        setLoading(false);
      }
    };

    if (isAdmin || isConsulta) {
      carregarDados();
    }
  }, [isAdmin, isConsulta]);

  // 1. Filtra movimentos aplicando as regras de ocultação
  const movimentosVisiveis = useMemo(() => {
    return movimentos.filter((mov) => {
      const desc = (mov.descricao || "").toLowerCase();
      const obs = (mov.observacao || "").toLowerCase();
      const deveOcultar = regrasOcultacao.some((regra) => {
        const r = regra.toLowerCase().trim();
        return r && (desc.includes(r) || obs.includes(r));
      });
      return !deveOcultar;
    });
  }, [movimentos, regrasOcultacao]);

  // 2. Opções disponíveis no campo "Dados" baseadas no Tipo de Movimento
  const opcoesDados = useMemo(() => {
    const isSaida = tipoMovimento === "saidas";
    const movsDoTipo = movimentosVisiveis.filter((m) =>
      isSaida ? Number(m.valor) < 0 : Number(m.valor) > 0
    );

    const classificacoesSet = new Set<string>();
    let temSemClassificacao = false;

    movsDoTipo.forEach((m) => {
      const classif = (m.classificacao || "").trim();
      if (classif) {
        classificacoesSet.add(classif);
      } else {
        temSemClassificacao = true;
      }
    });

    const opcoes: { value: string; label: string }[] = [
      {
        value: isSaida ? TOTAL_SAIDAS_KEY : TOTAL_ENTRADAS_KEY,
        label: isSaida ? "Total de Saídas" : "Total de Entradas",
      },
    ];

    Array.from(classificacoesSet)
      .sort((a, b) => a.localeCompare(b))
      .forEach((c) => {
        opcoes.push({ value: c, label: c });
      });

    if (temSemClassificacao) {
      opcoes.push({
        value: SEM_CLASSIFICACAO_KEY,
        label: "Sem Classificação",
      });
    }

    return opcoes;
  }, [movimentosVisiveis, tipoMovimento]);

  const handleTipoMovimentoChange = (novoTipo: TipoMovimento) => {
    setTipoMovimento(novoTipo);
    setDadosSelecionados([
      novoTipo === "saidas" ? TOTAL_SAIDAS_KEY : TOTAL_ENTRADAS_KEY,
    ]);
  };

  const handleDadosChange = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value;
    const novaSelecao = typeof value === "string" ? value.split(",") : value;
    if (novaSelecao.length === 0) return;

    const totalKey =
      tipoMovimento === "saidas" ? TOTAL_SAIDAS_KEY : TOTAL_ENTRADAS_KEY;
    const categoriasIndividuais = opcoesDados
      .map((o) => o.value)
      .filter((v) => v !== totalKey);

    // Verifica qual item foi clicado por último
    const ultimoClicado = novaSelecao.find(
      (item) => !dadosSelecionados.includes(item)
    );

    // 1. Se clicou em "Selecionar Todas"
    if (ultimoClicado === SELECIONAR_TODAS_KEY) {
      if (categoriasIndividuais.length > 0) {
        setDadosSelecionados(categoriasIndividuais);
      }
      return;
    }

    // 2. Se clicou em "Total de Saídas" ou "Total de Entradas" -> deixa só o Total
    if (ultimoClicado === totalKey) {
      setDadosSelecionados([totalKey]);
      return;
    }

    // 3. Se clicou em uma categoria individual enquanto o Total estava marcado -> remove o Total
    const semTotal = novaSelecao.filter(
      (v) => v !== totalKey && v !== SELECIONAR_TODAS_KEY
    );
    if (semTotal.length > 0) {
      setDadosSelecionados(semTotal);
    }
  };

  // 3. Gera a lista de meses (YYYY-MM) do período selecionado
  const mesesDoPeriodo = useMemo(() => {
    const hoje = new Date();
    const anoAtual = hoje.getFullYear();
    const mesAtual = hoje.getMonth(); // 0-11
    const lista: { chave: string; label: string }[] = [];

    if (periodo === "ano_atual") {
      for (let m = 0; m <= mesAtual; m++) {
        const chave = `${anoAtual}-${String(m + 1).padStart(2, "0")}`;
        const label = `${MESES_CURTOS[m]}/${String(anoAtual).slice(-2)}`;
        lista.push({ chave, label });
      }
    } else {
      const qtdMeses = periodo === "3m" ? 3 : periodo === "6m" ? 6 : 12;
      for (let i = qtdMeses - 1; i >= 0; i--) {
        const d = new Date(anoAtual, mesAtual - i, 1);
        const y = d.getFullYear();
        const m = d.getMonth();
        const chave = `${y}-${String(m + 1).padStart(2, "0")}`;
        const label = `${MESES_CURTOS[m]}/${String(y).slice(-2)}`;
        lista.push({ chave, label });
      }
    }

    return lista;
  }, [periodo]);

  // 4. Monta os dados para os gráficos de Barra e Linha
  const dadosGraficoMensal = useMemo(() => {
    const isSaida = tipoMovimento === "saidas";
    const chavesSet = new Set(mesesDoPeriodo.map((m) => m.chave));

    // Inicializa mapa por mês
    const mapa: Record<string, Record<string, number | string>> = {};
    mesesDoPeriodo.forEach(({ chave, label }) => {
      mapa[chave] = { mes: label };
      dadosSelecionados.forEach((dado) => {
        mapa[chave][dado] = 0;
      });
    });

    movimentosVisiveis.forEach((mov) => {
      if (!mov.data) return;
      const chaveMes = mov.data.slice(0, 7); // YYYY-MM
      if (!chavesSet.has(chaveMes)) return;

      const valorNum = Number(mov.valor || 0);
      if (isSaida && valorNum >= 0) return;
      if (!isSaida && valorNum <= 0) return;

      const valorAbs = Math.abs(valorNum);
      const classif = (mov.classificacao || "").trim();

      dadosSelecionados.forEach((dado) => {
        if (
          (dado === TOTAL_SAIDAS_KEY && isSaida) ||
          (dado === TOTAL_ENTRADAS_KEY && !isSaida)
        ) {
          mapa[chaveMes][dado] = Number(mapa[chaveMes][dado]) + valorAbs;
        } else if (dado === SEM_CLASSIFICACAO_KEY && !classif) {
          mapa[chaveMes][dado] = Number(mapa[chaveMes][dado]) + valorAbs;
        } else if (dado === classif) {
          mapa[chaveMes][dado] = Number(mapa[chaveMes][dado]) + valorAbs;
        }
      });
    });

    return mesesDoPeriodo.map(({ chave }) => mapa[chave]);
  }, [mesesDoPeriodo, movimentosVisiveis, tipoMovimento, dadosSelecionados]);

  // 5. Monta os dados para o gráfico de Pizza / Rosca (totais do período)
  const dadosGraficoPizza = useMemo(() => {
    return dadosSelecionados
      .map((dado) => {
        const label =
          opcoesDados.find((o) => o.value === dado)?.label || dado;
        const total = dadosGraficoMensal.reduce(
          (acc, item) => acc + Number(item[dado] || 0),
          0
        );
        return { name: label, value: total, key: dado };
      })
      .filter((item) => item.value > 0);
  }, [dadosSelecionados, dadosGraficoMensal, opcoesDados]);

  const paletaCores =
    tipoMovimento === "saidas" ? CORES_PASTEL : CORES_ENTRADAS;

  const getLabelDado = (key: string) =>
    opcoesDados.find((o) => o.value === key)?.label || key;

  if (authLoading || loading) {
    return <CircularProgress sx={{ display: "block", m: "10% auto" }} />;
  }

  if (!isAdmin && !isConsulta) {
    return null;
  }

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
      <MovimentoMobileTabs />

      <Box>
        <Title
          title="Gráficos Financeiros"
          subtitle="Análise visual personalizada de entradas e saídas dos extratos"
        />
      </Box>

      {/* PAINEL DE FILTROS */}
      <Paper sx={{ p: 3, borderRadius: 3 }}>
        <Box
          sx={{
            display: "grid",
            gridTemplateColumns: {
              xs: "1fr",
              sm: "1fr 1fr",
              md: "1fr 2fr 1fr 1fr",
            },
            gap: 2,
          }}
        >
          {/* 1. Tipo de Movimento */}
          <TextField
            select
            label="Movimento"
            size="small"
            value={tipoMovimento}
            onChange={(e) =>
              handleTipoMovimentoChange(e.target.value as TipoMovimento)
            }
          >
            <MenuItem value="saidas">Saídas (Gastos)</MenuItem>
            <MenuItem value="entradas">Entradas (Receitas)</MenuItem>
          </TextField>

          {/* 2. Dados (Múltipla Seleção) */}
          <FormControl size="small" fullWidth>
            <InputLabel id="dados-select-label">Dados</InputLabel>
            <Select
              labelId="dados-select-label"
              multiple
              value={dadosSelecionados}
              onChange={handleDadosChange}
              input={<OutlinedInput label="Dados" />}
              renderValue={(selected) => (
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
                  {selected.map((val) => (
                    <Chip
                      key={val}
                      label={getLabelDado(val)}
                      size="small"
                      color={tipoMovimento === "saidas" ? "error" : "success"}
                      variant="outlined"
                    />
                  ))}
                </Box>
              )}
            >
              <MenuItem value={SELECIONAR_TODAS_KEY}>
                <Checkbox
                  checked={
                    opcoesDados.length > 1 &&
                    opcoesDados
                      .filter(
                        (o) =>
                          o.value !== TOTAL_SAIDAS_KEY &&
                          o.value !== TOTAL_ENTRADAS_KEY
                      )
                      .every((o) => dadosSelecionados.includes(o.value))
                  }
                />
                <ListItemText
                  primary="Selecionar Todas as Categorias"
                  primaryTypographyProps={{ fontWeight: 600 }}
                />
              </MenuItem>
              {opcoesDados.map((opcao) => (
                <MenuItem key={opcao.value} value={opcao.value}>
                  <Checkbox
                    checked={dadosSelecionados.indexOf(opcao.value) > -1}
                  />
                  <ListItemText primary={opcao.label} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* 3. Período */}
          <TextField
            select
            label="Período"
            size="small"
            value={periodo}
            onChange={(e) => setPeriodo(e.target.value as PeriodoFiltro)}
          >
            <MenuItem value="3m">Últimos 3 meses</MenuItem>
            <MenuItem value="6m">Últimos 6 meses</MenuItem>
            <MenuItem value="12m">Últimos 12 meses</MenuItem>
            <MenuItem value="ano_atual">Ano atual</MenuItem>
          </TextField>

          {/* 4. Tipo de Gráfico */}
          <TextField
            select
            label="Tipo de Gráfico"
            size="small"
            value={tipoGrafico}
            onChange={(e) => setTipoGrafico(e.target.value as TipoGrafico)}
          >
            <MenuItem value="barra">Barras</MenuItem>
            <MenuItem value="linha">Linhas</MenuItem>
            <MenuItem value="pizza">Pizza / Rosca</MenuItem>
          </TextField>
        </Box>
      </Paper>

      {/* ÁREA DO GRÁFICO */}
      <Paper sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3 }}>
        {dadosGraficoMensal.length === 0 ||
        (tipoGrafico === "pizza" && dadosGraficoPizza.length === 0) ? (
          <Alert severity="info">
            Nenhum movimento encontrado para os filtros selecionados neste
            período.
          </Alert>
        ) : (
          <Box sx={{ width: "100%", height: { xs: 340, sm: 420 } }}>
            <ResponsiveContainer width="100%" height="100%">
              {tipoGrafico === "barra" ? (
                <BarChart
                  data={dadosGraficoMensal}
                  margin={{ top: 10, right: 20, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="mes" />
                  <YAxis tickFormatter={formatarMoedaCompacta} width={75} />
                  <Tooltip
                    formatter={(value: unknown, name: unknown) => [
                      formatarMoeda(Number(value || 0)),
                      getLabelDado(String(name)),
                    ]}
                  />
                  <Legend
                    formatter={(value: string) => getLabelDado(value)}
                  />
                  {dadosSelecionados.map((dado, index) => (
                    <Bar
                      key={dado}
                      dataKey={dado}
                      name={dado}
                      stackId="total"
                      fill={paletaCores[index % paletaCores.length]}
                      radius={
                        index === dadosSelecionados.length - 1
                          ? [4, 4, 0, 0]
                          : [0, 0, 0, 0]
                      }
                    />
                  ))}
                </BarChart>
              ) : tipoGrafico === "linha" ? (
                <LineChart
                  data={dadosGraficoMensal}
                  margin={{ top: 10, right: 20, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="mes" />
                  <YAxis tickFormatter={formatarMoedaCompacta} width={75} />
                  <Tooltip
                    formatter={(value: unknown, name: unknown) => [
                      formatarMoeda(Number(value || 0)),
                      getLabelDado(String(name)),
                    ]}
                  />
                  <Legend
                    formatter={(value: string) => getLabelDado(value)}
                  />
                  {dadosSelecionados.map((dado, index) => (
                    <Line
                      key={dado}
                      type="monotone"
                      dataKey={dado}
                      name={dado}
                      stroke={paletaCores[index % paletaCores.length]}
                      strokeWidth={3}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  ))}
                </LineChart>
              ) : (
                <PieChart>
                  <Pie
                    data={dadosGraficoPizza}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={130}
                    paddingAngle={3}
                    label={({ name, percent }) =>
                      `${name}: ${((percent || 0) * 100).toFixed(1)}%`
                    }
                  >
                    {dadosGraficoPizza.map((entry, index) => (
                      <Cell
                        key={entry.key}
                        fill={paletaCores[index % paletaCores.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: unknown) =>
                      formatarMoeda(Number(value || 0))
                    }
                  />
                  <Legend />
                </PieChart>
              )}
            </ResponsiveContainer>
          </Box>
        )}
      </Paper>

      {/* RESUMO DOS TOTAIS DO PERÍODO */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: {
            xs: "1fr",
            sm: "repeat(auto-fit, minmax(220px, 1fr))",
          },
          gap: 2,
        }}
      >
        {dadosSelecionados.map((dado, index) => {
          const total = dadosGraficoMensal.reduce(
            (acc, item) => acc + Number(item[dado] || 0),
            0
          );
          const cor = paletaCores[index % paletaCores.length];
          return (
            <Paper
              key={dado}
              sx={{
                p: 2.5,
                borderRadius: 3,
                borderLeft: `6px solid ${cor}`,
              }}
            >
              <Typography variant="body2" color="text.secondary" fontWeight={600}>
                {getLabelDado(dado)}
              </Typography>
              <Typography
                variant="h6"
                fontWeight={700}
                sx={{ color: "text.primary", mt: 0.5 }}
              >
                {formatarMoeda(total)}
              </Typography>
            </Paper>
          );
        })}
      </Box>
    </Box>
  );
}
