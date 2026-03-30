"use client";

import React, { useState, useEffect } from "react";
import {
  Typography,
  Box,
  Paper,
  Card,
  CardContent,
  useTheme,
  alpha,
  CircularProgress,
} from "@mui/material";
import {
  Assignment as DemandasIcon,
  Receipt as NFIcon,
  TrendingUp as ResultadoIcon,
} from "@mui/icons-material";
import { useAuth } from "@/contexts/AuthContext";
import {
  // 👇 Adicionamos o Cell aqui para colorir as barras dinamicamente
  BarChart,
  Bar,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  ReferenceLine,
} from "recharts";
import Title from "@/components/Title";

import { buscarDemandas } from "@/services/demandasService";
import { buscarTodasNotasFiscais } from "@/services/faturamentosService";
import { buscarTodosMovimentos } from "@/services/movimentosService";

export default function DashboardPage() {
  const { user, role } = useAuth();
  const theme = useTheme();

  const [loading, setLoading] = useState(true);

  // 👇 Adicionamos o nome do mês e os totais anuais ao estado
  const [metrics, setMetrics] = useState({
    demandasAprovadas: 0,
    fatMesAnterior: 0,
    resMesAnterior: 0,
    nomeMesAnterior: "",
    totalFat12m: 0,
    totalRes12m: 0,
  });

  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    if (!user || !role) return;

    const carregarDashboard = async () => {
      setLoading(true);

      try {
        let demandas: any[] = [];
        let faturamentos: any[] = [];
        let movimentos: any[] = [];

        if (role === "admin" || role === "user") {
          demandas = await buscarDemandas(user, role === "admin");
        }

        const meusNumerosDemandas = demandas.map((d) => String(d.numero));

        if (role === "admin" || role === "consulta") {
          faturamentos = await buscarTodasNotasFiscais();
          movimentos = await buscarTodosMovimentos();
        } else if (role === "user") {
          const allFats = await buscarTodasNotasFiscais();
          const allMovs = await buscarTodosMovimentos();
          faturamentos = allFats.filter((f) =>
            meusNumerosDemandas.includes(String(f.demandaId)),
          );
          movimentos = allMovs.filter((m) =>
            meusNumerosDemandas.includes(
              String(m.demanda_numero || m.demandaId),
            ),
          );
        }

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
          "Janeiro",
          "Fevereiro",
          "Março",
          "Abril",
          "Maio",
          "Junho",
          "Julho",
          "Agosto",
          "Setembro",
          "Outubro",
          "Novembro",
          "Dezembro",
        ];
        const nomeDoMes = nomesMesesCompletos[mesAnterior];

        // --- CÁLCULO DAS MÉTRICAS DOS CARDS ---
        const demandasAprovadas = demandas.filter((d) => {
          const isAprovada = String(d.status).toLowerCase() === "aprovada";
          const isDesteAno =
            String(d.numero).startsWith(String(anoAtual)) ||
            String(d.criadoEm).startsWith(String(anoAtual));
          return isAprovada && isDesteAno;
        }).length;

        const fatMesAnterior = faturamentos
          .filter(
            (f) =>
              f.data_fat &&
              String(f.data_fat).startsWith(prefixoMesAnterior) &&
              !f.cancelada,
          )
          .reduce((acc, f) => acc + Number(f.valor_fat || 0), 0);

        const resMesAnterior = movimentos
          .filter(
            (m) => m.data && String(m.data).startsWith(prefixoMesAnterior),
          )
          .reduce((acc, m) => acc + Number(m.valor || 0), 0);

        // --- CÁLCULO DOS GRÁFICOS (Últimos 12 meses) ---
        const ultimos12Meses = [];
        const nomesMesesCurtos = [
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

        let somaFat12m = 0;
        let somaRes12m = 0;

        for (let i = 11; i >= 0; i--) {
          const d = new Date(anoAtual, mesAtual - i, 1);
          const y = d.getFullYear();
          const m = d.getMonth();
          const prefix = `${y}-${String(m + 1).padStart(2, "0")}`;

          const fatMes = faturamentos
            .filter(
              (f) =>
                f.data_fat &&
                String(f.data_fat).startsWith(prefix) &&
                !f.cancelada,
            )
            .reduce((acc, f) => acc + Number(f.valor_fat || 0), 0);

          const resMes = movimentos
            .filter((mov) => mov.data && String(mov.data).startsWith(prefix))
            .reduce((acc, mov) => acc + Number(mov.valor || 0), 0);

          somaFat12m += fatMes;
          somaRes12m += resMes;

          ultimos12Meses.push({
            name: `${nomesMesesCurtos[m]}/${String(y).substring(2)}`,
            faturamento: fatMes,
            resultado: resMes,
          });
        }

        setChartData(ultimos12Meses);

        // Salvamos tudo de uma vez no estado
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
  }, [user, role]);

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

  if (loading)
    return <CircularProgress sx={{ display: "block", m: "15% auto" }} />;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 4, pb: 5 }}>
      {/* CABEÇALHO */}
      <Box>
        <Title
          title="Dashboard"
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
        {/* GRÁFICO 1: FATURAMENTO (LINHA) */}
        {role !== "user" && (
          <Paper
            sx={{
              flex: 1,
              p: 3,
              borderRadius: 2,
              minHeight: 400,
              boxShadow: "0 4px 12px 0 rgba(0,0,0,0.05)",
            }}
          >
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                mb: 3,
                flexWrap: "wrap",
                gap: 1,
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Faturamento (Últimos 12 Meses)
              </Typography>
              {/* 👇 Legenda do acumulado no topo do gráfico */}
              <Box
                sx={{
                  bgcolor: alpha(theme.palette.success.main, 0.1),
                  px: 1.5,
                  py: 0.5,
                  borderRadius: 1,
                }}
              >
                <Typography
                  variant="caption"
                  sx={{ fontWeight: 700, color: theme.palette.success.dark }}
                >
                  ACUMULADO: {formatarMoeda(metrics.totalFat12m)}
                </Typography>
              </Box>
            </Box>

            <Box sx={{ width: "100%", height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(val) => `${val / 1000}k`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Line
                    name="Faturamento"
                    type="monotone"
                    dataKey="faturamento"
                    stroke={theme.palette.success.main}
                    strokeWidth={3}
                    dot={{ r: 4 }}
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        )}

        {/* GRÁFICO 2: RESULTADO (BARRAS MULTICORES) */}
        {role !== "user" && (
          <Paper
            sx={{
              flex: 1,
              p: 3,
              borderRadius: 2,
              minHeight: 400,
              boxShadow: "0 4px 12px 0 rgba(0,0,0,0.05)",
            }}
          >
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                mb: 3,
                flexWrap: "wrap",
                gap: 1,
              }}
            >
              <Typography variant="h6" sx={{ fontWeight: 600 }}>
                Resultado do Exercício (Últimos 12 Meses)
              </Typography>
              {/* 👇 Legenda do acumulado no topo do gráfico, muda de cor se for negativo */}
              <Box
                sx={{
                  bgcolor:
                    metrics.totalRes12m >= 0
                      ? alpha(theme.palette.info.main, 0.1)
                      : alpha(theme.palette.error.main, 0.1),
                  px: 1.5,
                  py: 0.5,
                  borderRadius: 1,
                }}
              >
                <Typography
                  variant="caption"
                  sx={{
                    fontWeight: 700,
                    color:
                      metrics.totalRes12m >= 0
                        ? theme.palette.info.dark
                        : theme.palette.error.dark,
                  }}
                >
                  ACUMULADO: {formatarMoeda(metrics.totalRes12m)}
                </Typography>
              </Box>
            </Box>

            <Box sx={{ width: "100%", height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(val) => `${val / 1000}k`}
                  />
                  <Tooltip
                    content={<CustomTooltip />}
                    cursor={{ fill: alpha(theme.palette.text.primary, 0.05) }}
                  />
                  <ReferenceLine y={0} stroke="#000" />
                  <Bar
                    name="Resultado"
                    dataKey="resultado"
                    radius={[4, 4, 0, 0]}
                  >
                    {/* 👇 Mágica do Recharts: Mapeamos cada barra para decidir a cor dela */}
                    {chartData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          entry.resultado >= 0
                            ? theme.palette.info.main
                            : theme.palette.error.main
                        }
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        )}
      </Box>
    </Box>
  );
}

// COMPONENTE DE CARD MODULARIZADO
interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: string;
}

function StatCard({ title, value, icon, color }: StatCardProps) {
  return (
    <Card
      sx={{
        flex: "1 1 280px",
        borderRadius: 2,
        boxShadow: "0 4px 12px 0 rgba(0,0,0,0.05)",
      }}
    >
      <CardContent sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        <Box
          sx={{
            display: "flex",
            p: 1.5,
            borderRadius: 2,
            bgcolor: alpha(color, 0.1),
            color: color,
          }}
        >
          {icon}
        </Box>
        <Box>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontWeight: 600, textTransform: "uppercase" }}
          >
            {title}
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>
            {value}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}
