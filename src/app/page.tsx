"use client";

import React, { useState, useEffect } from "react";
import { Box, useTheme, CircularProgress, Paper, Typography, Button, Divider, List, ListItem, ListItemText, ListItemIcon, Avatar, Chip, IconButton } from "@mui/material";
import {
  Assignment as DemandasIcon,
  Receipt as ReceiptIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Warning as WarningIcon,
  AccountBalanceWallet as WalletIcon,
  ArrowForward as ArrowForwardIcon,
  ErrorOutline as ErrorIcon,
  MonetizationOn as MoneyIcon
} from "@mui/icons-material";
import { useRouter } from "next/navigation";

import { useAuth } from "@/contexts/AuthContext";
import Title from "@/components/Title";
import StatCard from "@/components/dashboard/StatCard";
import FaturamentoChart from "@/components/dashboard/FaturamentoChart";
import ResultadoChart from "@/components/dashboard/ResultadoChart";

import { buscarDemandas } from "@/services/demandasService";
import { buscarTodasNotasFiscais } from "@/services/faturamentosService";
import { buscarRegrasOcultacao, buscarTodosMovimentos } from "@/services/movimentosService";
import { STATUS_CONFIG } from "@/types/demanda";
import { alpha } from "@mui/material";

export default function NovoDashboardPage() {
  const { user, role, nome } = useAuth();
  const theme = useTheme();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState<any[]>([]);
  
  // Novas Métricas
  const [metrics, setMetrics] = useState({
    saldoMes: 0,
    aReceber: 0,
    faturamentoPendente: 0,
    demandasAtivas: 0,
    totalFat12m: 0,
    totalRes12m: 0,
  });

  // Listas Rápidas
  const [topDemandasFaturar, setTopDemandasFaturar] = useState<any[]>([]);
  const [ultimosMovimentos, setUltimosMovimentos] = useState<any[]>([]);

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
          const nomeGestor = nome || user?.user_metadata?.nome || user?.email || "";
          demandas = await buscarDemandas(nomeGestor, role === "admin");
        }

        const meusNumerosDemandas = demandas.map((d) => String(d.numero));

        if (role === "admin" || role === "consulta") {
          faturamentos = await buscarTodasNotasFiscais();
          movimentos = await buscarTodosMovimentos();
          regrasOcultacao = await buscarRegrasOcultacao(); 
        } else if (role === "user") {
          const allFats = await buscarTodasNotasFiscais();
          const allMovs = await buscarTodosMovimentos();
          regrasOcultacao = await buscarRegrasOcultacao();

          faturamentos = allFats.filter((f) =>
            meusNumerosDemandas.includes(String(f.demandaId))
          );
          movimentos = allMovs.filter((m) =>
            meusNumerosDemandas.includes(String(m.demanda_numero || m.demandaId))
          );
        }

        // --- FUNÇÕES AUXILIARES ---
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
        const movimentosValidos = movimentos.filter((mov) => {
          const textoDescricao = mov.descricao || "";
          return !regrasLimpas.includes(normalizarTexto(textoDescricao));
        });

        const hoje = new Date();
        const anoAtual = hoje.getFullYear();
        const mesAtual = hoje.getMonth();
        const prefixoMesAtual = `${anoAtual}-${String(mesAtual + 1).padStart(2, "0")}`;

        // --- CÁLCULO DAS MÉTRICAS NOVAS ---
        
        // 1. Saldo do Mês Atual
        const saldoMes = movimentosValidos
          .filter((m) => m.data && getAnoMesLocal(m.data) === prefixoMesAtual)
          .reduce((acc, m) => acc + Number(m.valor || 0), 0);

        // 2. A Receber (Notas Emitidas - Notas Pagas)
        const aReceber = faturamentos
          .filter(f => !f.cancelada)
          .reduce((acc, f) => {
            const valFat = Number(f.valor_fat || 0);
            const valCred = Number(f.valor_cred || 0);
            return acc + Math.max(0, valFat - valCred);
          }, 0);

        // 3. Faturamento Pendente e Top Demandas para Faturar
        let faturamentoPendenteTotal = 0;
        const demandasParaFaturar: any[] = [];

        demandas.forEach(d => {
          // Foca em demandas ativas que estão aguardando faturamento
          if (["Concluída", "Autorizada a Faturar"].includes(d.status)) {
            const valorDemanda = Number(d.valor || 0);
            const notasDaDemanda = faturamentos.filter(f => String(f.demandaId) === String(d.numero) && !f.cancelada);
            const totalFaturadoDemanda = notasDaDemanda.reduce((acc, f) => acc + Number(f.valor_fat || 0), 0);
            
            const pendente = valorDemanda - totalFaturadoDemanda;
            
            if (pendente > 0) {
              faturamentoPendenteTotal += pendente;
              demandasParaFaturar.push({
                numero: d.numero,
                cliente: d.cliente,
                local: d.local,
                status: d.status,
                pendente: pendente
              });
            }
          }
        });

        // Ordenar as demandas com maior valor pendente primeiro e pegar as top 5
        demandasParaFaturar.sort((a, b) => b.pendente - a.pendente);
        setTopDemandasFaturar(demandasParaFaturar.slice(0, 5));

        // 4. Demandas Ativas
        const demandasAtivas = demandas.filter(d => ["Aprovada", "Em Andamento"].includes(d.status)).length;

        // 5. Últimos Movimentos (já vem ordenado decrescente do banco)
        setUltimosMovimentos(movimentosValidos.slice(0, 5));


        // --- GRÁFICOS (12 Meses) ---
        const ultimos12Meses = [];
        const nomesMesesCurtos = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
        let somaFat12m = 0;
        let somaRes12m = 0;

        for (let i = 11; i >= 0; i--) {
          const d = new Date(anoAtual, mesAtual - i, 1);
          const y = d.getFullYear();
          const m = d.getMonth();
          const prefix = `${y}-${String(m + 1).padStart(2, "0")}`;

          const fatMes = faturamentos
            .filter((f) => f.data_fat && getAnoMesLocal(f.data_fat) === prefix && !f.cancelada)
            .reduce((acc, f) => acc + Number(f.valor_fat || 0), 0);

          const resMes = movimentosValidos
            .filter((mov) => mov.data && getAnoMesLocal(mov.data) === prefix)
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
        setMetrics({
          saldoMes,
          aReceber,
          faturamentoPendente: faturamentoPendenteTotal,
          demandasAtivas,
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
  }, [user?.id, role, nome]);

  const formatarMoeda = (valor: number) =>
    (valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

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
          title="Dashboard"
          subtitle={`Visão executiva atualizada • Bem-vindo(a), ${nome || user?.user_metadata?.nome || user?.email || "Engenheiro"}`}
        />
      </Box>

      {/* LINHA 1: KPIs (Cartões de Indicadores) */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 3 }}>
        {role !== "user" && (
          <>
            <Box sx={{ gridColumn: { xs: 'span 12', sm: 'span 6', md: 'span 6', lg: 'span 3' } }}>
              <StatCard
                title="Saldo do Mês Atual"
                value={formatarMoeda(metrics.saldoMes)}
                icon={<WalletIcon />}
                color={metrics.saldoMes >= 0 ? theme.palette.success.main : theme.palette.error.main}
              />
            </Box>

            <Box sx={{ gridColumn: { xs: 'span 12', sm: 'span 6', md: 'span 6', lg: 'span 3' } }}>
              <StatCard
                title="A Receber"
                value={formatarMoeda(metrics.aReceber)}
                icon={<ErrorIcon />}
                color={theme.palette.warning.main}
              />
            </Box>

            <Box sx={{ gridColumn: { xs: 'span 12', sm: 'span 6', md: 'span 6', lg: 'span 3' } }}>
              <StatCard
                title="Pendente de Faturamento"
                value={formatarMoeda(metrics.faturamentoPendente)}
                icon={<ReceiptIcon />}
                color={theme.palette.info.main}
              />
            </Box>
          </>
        )}
      </Box>

      {/* LINHA 2: Listas de Ação Rápida */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: 3 }}>
        {/* Top Demandas para Faturar */}
        <Box sx={{ gridColumn: { xs: 'span 12', md: role === "user" ? 'span 12' : 'span 6' } }}>
            <Paper sx={{ p: 3, borderRadius: 3, height: "100%", border: "1px solid #e0e0e0", boxShadow: "0 4px 20px rgba(0,0,0,0.03)" }}>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1, mb: 2 }}>
                <Typography variant="h6" fontWeight="bold" color="primary">Demandas em destaque</Typography>
                <Chip label={`${topDemandasFaturar.length} demandas listadas`} size="small" color="primary" variant="outlined" />
              </Box>
              <Divider sx={{ mb: 2 }} />
              
              {topDemandasFaturar.length === 0 ? (
                <Typography color="text.secondary" textAlign="center" py={4}>Todas as demandas ativas já foram 100% faturadas!</Typography>
              ) : (
                <List disablePadding>
                  {topDemandasFaturar.map((d, idx) => (
                    <ListItem 
                      key={d.numero} 
                      disableGutters 
                      sx={{ 
                        display: 'flex',
                        flexWrap: 'wrap',
                        borderBottom: idx === topDemandasFaturar.length - 1 ? "none" : "1px solid #f0f0f0", 
                        py: 1.5 
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 40 }}>
                        <Avatar sx={{ bgcolor: "info.light", width: 32, height: 32, fontSize: 14, fontWeight: "bold" }}>{d.numero.toString().slice(-3)}</Avatar>
                      </ListItemIcon>
                      <ListItemText 
                        primary={<Typography variant="subtitle2" fontWeight="bold">{d.cliente} - {d.local}</Typography>}
                        secondaryTypographyProps={{ component: 'div' }}
                        secondary={
                          <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1, mt: 0.5 }}>
                            <Typography variant="caption" color="text.secondary">Demanda {d.numero}</Typography>
                            <Chip 
                              label={d.status} 
                              size="small" 
                              sx={{ 
                                height: 20, 
                                fontSize: '0.65rem', 
                                fontWeight: 'bold',
                                bgcolor: alpha(STATUS_CONFIG[d.status] || '#ccc', 0.1),
                                color: STATUS_CONFIG[d.status] || '#ccc',
                                borderRadius: 1
                              }} 
                            />
                          </Box>
                        }
                      />
                      <Box 
                        sx={{ 
                          textAlign: "right", 
                          display: "flex", 
                          alignItems: "center", 
                          gap: 2,
                          ml: { xs: 7, sm: 'auto' }, 
                          mt: { xs: 1, sm: 0 },
                          width: { xs: 'calc(100% - 56px)', sm: 'auto' },
                          justifyContent: { xs: 'space-between', sm: 'flex-end' } 
                        }}
                      >
                        <Typography variant="body2" fontWeight="bold" color="warning.main">
                          {formatarMoeda(d.pendente)}
                        </Typography>
                        <IconButton size="small" color="primary" onClick={() => router.push(`/demandas/${d.numero}`)}>
                          <ArrowForwardIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </ListItem>
                  ))}
                </List>
              )}
            </Paper>
          </Box>

          {/* Últimos Movimentos */}
        {role !== "user" && (
          <Box sx={{ gridColumn: { xs: 'span 12', md: 'span 6' } }}>
            <Paper sx={{ p: 3, borderRadius: 3, height: "100%", border: "1px solid #e0e0e0", boxShadow: "0 4px 20px rgba(0,0,0,0.03)" }}>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 1, mb: 2 }}>
                <Typography variant="h6" fontWeight="bold" color="primary">Últimas Movimentações</Typography>
                <Button size="small" onClick={() => router.push("/movimento")}>Ver Extrato Completo</Button>
              </Box>
              <Divider sx={{ mb: 2 }} />
              
              {ultimosMovimentos.length === 0 ? (
                <Typography color="text.secondary" textAlign="center" py={4}>Nenhuma movimentação recente registrada.</Typography>
              ) : (
                <List disablePadding>
                  {ultimosMovimentos.map((m, idx) => (
                    <ListItem 
                      key={m.id} 
                      disableGutters 
                      sx={{ 
                        display: 'flex',
                        flexWrap: 'wrap',
                        borderBottom: idx === ultimosMovimentos.length - 1 ? "none" : "1px solid #f0f0f0", 
                        py: 1.5 
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 40 }}>
                        <Avatar sx={{ bgcolor: m.valor >= 0 ? "success.light" : "error.light", width: 32, height: 32 }}>
                          {m.valor >= 0 ? <TrendingUpIcon fontSize="small" /> : <TrendingDownIcon fontSize="small" />}
                        </Avatar>
                      </ListItemIcon>
                      <ListItemText 
                        primary={<Typography variant="subtitle2" fontWeight="bold" noWrap>{m.observacao || m.descricao}</Typography>}
                        secondary={<Typography variant="caption" color="text.secondary">{m.data ? m.data.split("-").reverse().join("/") : ""} • {m.banco}</Typography>}
                      />
                      <Box 
                        sx={{ 
                          textAlign: { xs: "left", sm: "right" }, 
                          display: "flex", 
                          alignItems: "center", 
                          ml: { xs: 7, sm: 'auto' }, 
                          mt: { xs: 1, sm: 0 },
                          width: { xs: 'calc(100% - 56px)', sm: 'auto' },
                          justifyContent: { xs: 'flex-start', sm: 'flex-end' } 
                        }}
                      >
                        <Typography variant="body2" fontWeight="bold" color={m.valor >= 0 ? "success.main" : "error.main"}>
                          {formatarMoeda(m.valor)}
                        </Typography>
                      </Box>
                    </ListItem>
                  ))}
                </List>
              )}
            </Paper>
          </Box>
        )}
      </Box>

      {/* LINHA 3: GRÁFICOS */}
      {role !== "user" && (
        <Box sx={{ mt: 2 }}>
          <Typography variant="h6" fontWeight="bold" color="text.secondary" sx={{ mb: 2 }}>Evolução em 12 Meses</Typography>
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", lg: "row" },
              gap: 3,
            }}
          >
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
          </Box>
        </Box>
      )}
    </Box>
  );
}
