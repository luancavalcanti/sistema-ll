"use client";

import React, { useState, useEffect } from "react";
import { Box, useTheme, CircularProgress, Paper, Typography } from "@mui/material";
import {
  Assignment as DemandasIcon,
  Receipt as NFIcon,
  TrendingUp as ResultadoIcon,
} from "@mui/icons-material";

// Contextos e Componentes Base
import { useAuth } from "@/contexts/AuthContext";
import Title from "@/components/Title";

// Componentes Modularizados do Dashboard
import StatCard from "@/components/dashboard/StatCard";
import FaturamentoChart from "@/components/dashboard/FaturamentoChart";
import ResultadoChart from "@/components/dashboard/ResultadoChart";

// Serviços (Certifique-se de que os caminhos estão corretos para o seu projeto)
import { buscarDemandas } from "@/services/demandasService";
import { buscarTodasNotasFiscais } from "@/services/faturamentosService";
import { buscarRegrasOcultacao, buscarTodosMovimentos } from "@/services/movimentosService";

export default function DashboardPage() {
  const { user, role } = useAuth();
  const theme = useTheme();

  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<any[]>([]);
  const [metrics, setMetrics] = useState({
    demandasAprovadas: 0,
    fatMesAnterior: 0,
    resMesAnterior: 0,
    nomeMesAnterior: "",
    totalFat12m: 0,
    totalRes12m: 0,
  });

  useEffect(() => {
    if (!user || !role) return;

    const carregarDashboard = async () => {
      setLoading(true);

      try {
        let demandas: any[] = [];
        let faturamentos: any[] = [];
        let movimentos: any[] = [];
        let regrasOcultacao: string[] = [];

        if (role === "admin" || role === "user") {
          demandas = await buscarDemandas(user, role === "admin");
        }

        const meusNumerosDemandas = demandas.map((d) => String(d.numero));

        if (role === "admin" || role === "consulta") {
          faturamentos = await buscarTodasNotasFiscais();
          // 👇 Busca os movimentos E as regras
          movimentos = await buscarTodosMovimentos();
          regrasOcultacao = await buscarRegrasOcultacao(); 
        } else if (role === "user") {
          const allFats = await buscarTodasNotasFiscais();
          const allMovs = await buscarTodosMovimentos();
          regrasOcultacao = await buscarRegrasOcultacao(); // 👇 Busca para o User também

          faturamentos = allFats.filter((f) =>
            meusNumerosDemandas.includes(String(f.demandaId))
          );
          movimentos = allMovs.filter((m) =>
            meusNumerosDemandas.includes(String(m.demanda_numero || m.demandaId))
          );
        }

        // --- 👇 FUNÇÕES AUXILIARES ---
        const getAnoMesLocal = (dataString: string) => {
          if (!dataString) return "";
          const data = new Date(dataString);
          const ano = data.getFullYear();
          const mes = String(data.getMonth() + 1).padStart(2, "0");
          return `${ano}-${mes}`;
        };

        const normalizarTexto = (texto?: string) => {
          if (!texto) return "";
          return texto.toString().toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        };

        const regrasLimpas = regrasOcultacao.map((regra) => normalizarTexto(regra));

        // 👇 Aplica a regra de ocultação logo de cara (Igual no seu useMemo de Movimentos)
        const movimentosValidos = movimentos.filter((mov) => {
          const textoDescricao = mov.descricao || "";
          const descricaoLimpa = normalizarTexto(textoDescricao);
          return !regrasLimpas.includes(descricaoLimpa);
        });

        // --- CÁLCULO DE DATAS E NOMES ---
        const hoje = new Date();
        const anoAtual = hoje.getFullYear();
        const mesAtual = hoje.getMonth();

        let anoMesAnterior = anoAtual;
        let mesAnterior = mesAtual - 1;
        if (mesAnterior < 0) {
          mesAnterior = 11;
          anoMesAnterior -= 1;
        }

        const prefixoMesAnterior = `${anoMesAnterior}-${String(mesAnterior + 1).padStart(2, "0")}`;
        const nomesMesesCompletos = [
          "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
          "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
        ];
        const nomeDoMes = nomesMesesCompletos[mesAnterior];

        // --- CÁLCULO DAS MÉTRICAS DOS CARDS ---
        const demandasAprovadas = demandas.filter((d) => {
          const isAprovada = String(d.status).toLowerCase() === "aprovada";
          const isDesteAno =
            String(d.numero).startsWith(String(anoAtual)) ||
            (d.criadoEm && getAnoMesLocal(d.criadoEm).startsWith(String(anoAtual)));
          return isAprovada && isDesteAno;
        }).length;

        // Faturamento do mês anterior (Mantemos isso apenas para o Card de Faturamento)
        const fatMesAnterior = faturamentos
          .filter((f) => f.data_fat && getAnoMesLocal(f.data_fat) === prefixoMesAnterior && !f.cancelada)
          .reduce((acc, f) => acc + Number(f.valor_fat || 0), 0);

        // 👇 RESULTADO DO MÊS ANTERIOR (Apenas Movimentos)
        // Soma TUDO (entradas e saídas) que aconteceu no mês, ignorando as regras ocultas
        const resMesAnterior = movimentosValidos
          .filter((m) => m.data && getAnoMesLocal(m.data) === prefixoMesAnterior)
          .reduce((acc, m) => acc + Number(m.valor || 0), 0);


        // --- CÁLCULO DOS GRÁFICOS (Últimos 12 meses) ---
        const ultimos12Meses = [];
        const nomesMesesCurtos = [
          "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
          "Jul", "Ago", "Set", "Out", "Nov", "Dez",
        ];

        let somaFat12m = 0;
        let somaRes12m = 0;

        for (let i = 11; i >= 0; i--) {
          const d = new Date(anoAtual, mesAtual - i, 1);
          const y = d.getFullYear();
          const m = d.getMonth();
          const prefix = `${y}-${String(m + 1).padStart(2, "0")}`;

          // Faturamento do Mês (Para a Linha Verde)
          const fatMes = faturamentos
            .filter((f) => f.data_fat && getAnoMesLocal(f.data_fat) === prefix && !f.cancelada)
            .reduce((acc, f) => acc + Number(f.valor_fat || 0), 0);

          // 👇 RESULTADO DO MÊS NO GRÁFICO (Apenas Movimentos)
          const resultadoMesMovimento = movimentosValidos
            .filter((mov) => mov.data && getAnoMesLocal(mov.data) === prefix)
            .reduce((acc, mov) => acc + Number(mov.valor || 0), 0);

          somaFat12m += fatMes;
          somaRes12m += resultadoMesMovimento;

          ultimos12Meses.push({
            name: `${nomesMesesCurtos[m]}/${String(y).substring(2)}`,
            faturamento: fatMes, // Linha de faturamento
            resultado: resultadoMesMovimento, // Barra de resultado (Lucro/Prejuízo real do banco)
          });
        }

        setChartData(ultimos12Meses);

        setMetrics({
          demandasAprovadas,
          fatMesAnterior,
          resMesAnterior,
          nomeMesAnterior: nomeDoMes,
          totalFat12m: somaFat12m,
          totalRes12m: somaRes12m,
        });

      } catch (error) {
        console.error("Erro ao montar dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    carregarDashboard();
  }, [user?.id, role]);

  const formatarMoeda = (valor: number) =>
    valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <Paper sx={{ p: 2, border: "1px solid #ddd", bgcolor: "#fff" }}>
          <Typography variant="subtitle2">{label}</Typography>
          <Typography
            variant="body2"
            sx={{
              color: payload[0].color || payload[0].payload.fill,
              fontWeight: "bold",
            }}
          >
            {payload[0].name}: {formatarMoeda(payload[0].value)}
          </Typography>
        </Paper>
      );
    }
    return null;
  };

  if (loading) {
    return <CircularProgress sx={{ display: "block", m: "15% auto" }} />;
  }

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 4, pb: 5 }}>
      {/* CABEÇALHO */}
      <Box>
        <Title
          title="Visão Geral"
          subtitle={
            role === "consulta"
              ? `Visão Geral Financeira - Logado como Consulta`
              : `Bem-vindo de volta, ${user?.user_metadata?.nome || user?.email || "Engenheiro"}`
          }
        />
      </Box>

      {/* CONTAINER DE CARDS */}
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
        {role !== "consulta" && (
          <StatCard
            title={`Demandas Aprovadas ${new Date().getFullYear()}`}
            value={String(metrics.demandasAprovadas)}
            icon={<DemandasIcon />}
            color={theme.palette.primary.main}
          />
        )}

        {role !== "user" && (
          <>
            <StatCard
              title={`Faturamento (${metrics.nomeMesAnterior})`}
              value={formatarMoeda(metrics.fatMesAnterior)}
              icon={<NFIcon />}
              color={theme.palette.success.main}
            />

            <StatCard
              title={`Resultado (${metrics.nomeMesAnterior})`}
              value={formatarMoeda(metrics.resMesAnterior)}
              icon={<ResultadoIcon />}
              color={
                metrics.resMesAnterior >= 0
                  ? theme.palette.info.main
                  : theme.palette.error.main
              }
            />
          </>
        )}
      </Box>

      {/* CONTAINER DE GRÁFICOS */}
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", lg: "row" },
          gap: 3,
        }}
      >
        {role !== "user" && (
          <>
            <FaturamentoChart
              data={chartData}
              total={metrics.totalFat12m}
              formatarMoeda={formatarMoeda}
              CustomTooltip={CustomTooltip}
            />
            <ResultadoChart
              data={chartData}
              total={metrics.totalRes12m}
              formatarMoeda={formatarMoeda}
              CustomTooltip={CustomTooltip}
            />
          </>
        )}
      </Box>
    </Box>
  );
}