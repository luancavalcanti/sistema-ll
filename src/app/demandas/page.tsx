"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  Box, Typography, Button, Chip, alpha, CircularProgress, 
  Paper, Badge, TextField, MenuItem, InputAdornment,
  FormControlLabel, Switch, Divider
} from "@mui/material";
import {
  Add as AddIcon,
  Search as SearchIcon,
  Person as PersonIcon,
  AccessTime as AccessTimeIcon,
  ViewStream as GroupIcon
} from "@mui/icons-material";
import { useRouter } from "next/navigation";
import Title from "@/components/Title";
import { useAuth } from "@/contexts/AuthContext";
import { IDemanda, STATUS_CONFIG } from "@/types/demanda";
import { DemandaCardList } from "./_components/DemandaCardList";
import { calcularDiasSemAtualizar } from "@/utils/sla";
import { supabase } from "@/lib/supabase";

import { buscarDemandas } from "@/services/demandasService";

type TipoAgrupamento = "nenhum" | "gestor" | "status" | "dias_sem_atualizar";

export default function DemandasPage() {
  const { user, nome, isAdmin, role, loading: authLoading } = useAuth();
  const [demandas, setDemandas] = useState<IDemanda[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Estados dos Filtros (Inicialmente definidos com padrão, depois hidratados pelo sessionStorage)
  const [anoFiltro, setAnoFiltro] = useState<string>(new Date().getFullYear().toString());
  const [statusFiltro, setStatusFiltro] = useState<string>("Todos");
  const [busca, setBusca] = useState<string>("");
  const [mostrarCanceladas, setMostrarCanceladas] = useState<boolean>(false);
  const [agrupamento, setAgrupamento] = useState<TipoAgrupamento>("nenhum");
  const [filtrosCarregados, setFiltrosCarregados] = useState(false);

  // 1. Carrega os filtros salvos na sessão ao montar a tela
  useEffect(() => {
    const savedAno = sessionStorage.getItem("demandas_ano");
    const savedStatus = sessionStorage.getItem("demandas_status");
    const savedBusca = sessionStorage.getItem("demandas_busca");
    const savedMostrarCanceladas = sessionStorage.getItem("demandas_mostrar_canceladas");
    const savedAgrupamento = sessionStorage.getItem("demandas_agrupamento") as TipoAgrupamento | null;

    if (savedAno) setAnoFiltro(savedAno);
    if (savedStatus) setStatusFiltro(savedStatus);
    if (savedBusca) setBusca(savedBusca);
    if (savedMostrarCanceladas) setMostrarCanceladas(savedMostrarCanceladas === "true");
    if (savedAgrupamento) setAgrupamento(savedAgrupamento);

    setFiltrosCarregados(true);
  }, []);

  // 2. Salva os filtros na sessão sempre que mudarem
  useEffect(() => {
    if (filtrosCarregados) {
      sessionStorage.setItem("demandas_ano", anoFiltro);
      sessionStorage.setItem("demandas_status", statusFiltro);
      sessionStorage.setItem("demandas_busca", busca);
      sessionStorage.setItem("demandas_mostrar_canceladas", mostrarCanceladas.toString());
      sessionStorage.setItem("demandas_agrupamento", agrupamento);
    }
  }, [anoFiltro, statusFiltro, busca, mostrarCanceladas, agrupamento, filtrosCarregados]);

  // Se desativar "Mostrar Canceladas / Declinadas" enquanto uma delas estava selecionada no filtro, volta para "Todos"
  useEffect(() => {
    if (!mostrarCanceladas && (statusFiltro === "Cancelada" || statusFiltro === "Declinada")) {
      setStatusFiltro("Todos");
    }
  }, [mostrarCanceladas, statusFiltro]);

  // Se o usuário não for admin e o agrupamento salvo for "gestor", volta para "nenhum"
  useEffect(() => {
    if (!authLoading && !isAdmin && agrupamento === "gestor") {
      setAgrupamento("nenhum");
    }
  }, [authLoading, isAdmin, agrupamento]);
  const [nomeUsuarioLogado, setNomeUsuarioLogado] = useState<string>("");

  useEffect(() => {
    if (authLoading || !user) return;

    const iniciar = async () => {
      try {
        setLoading(true);

        const nomeGestor = nome || user?.user_metadata?.nome || user?.email || "";
        if (!isAdmin) {
          setNomeUsuarioLogado(nomeGestor);
        }

        // Busca as demandas
        const dadosProntos = await buscarDemandas(nomeGestor, isAdmin);
        setDemandas(dadosProntos);
      } catch (error) {
        console.error("Falha ao carregar demandas:", error);
      } finally {
        setLoading(false);
      }
    };

    iniciar();
  }, [user?.id, nome, isAdmin, authLoading]);

  // Função auxiliar para ignorar acentos e maiúsculas na busca
  const normalizarTexto = (texto?: string) => {
    if (!texto) return "";
    return texto.toString().toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  };

  // 👇 Restrição de visualização baseada no Role/Gestor
  const demandasVisiveis = useMemo(() => {
    let filtradas = demandas;

    if (!isAdmin) {
      const nomeNormalizado = normalizarTexto(nomeUsuarioLogado);
      filtradas = filtradas.filter((d) => {
        if (!nomeNormalizado) return false; 
        return normalizarTexto(d.gestor) === nomeNormalizado;
      });
    }

    if (!mostrarCanceladas) {
      filtradas = filtradas.filter(d => d.status !== "Cancelada" && d.status !== "Declinada");
    }

    return filtradas;
  }, [demandas, isAdmin, nomeUsuarioLogado, mostrarCanceladas]);

  // 👇 2. Filtro de Tela (Ano + Status + Busca) alimentado pelas demandas permitidas
  const demandasFiltradas = useMemo(() => {
    const termoBusca = normalizarTexto(busca);

    return demandasVisiveis.filter((d) => {
      const matchAno = anoFiltro === "Todas" || d.numero.toString().startsWith(anoFiltro);
      const matchStatus = statusFiltro === "Todos" || d.status === statusFiltro;
      
      let matchBusca = true;
      if (termoBusca) {
        const stringNumero = d.numero.toString();
        const textoLocal = normalizarTexto(d.local);
        matchBusca = stringNumero.includes(termoBusca) || textoLocal.includes(termoBusca);
      }

      return matchAno && matchStatus && matchBusca;
    });
  }, [demandasVisiveis, anoFiltro, statusFiltro, busca]);

  // Normaliza o nome do gestor para evitar separar "Edvaldo" de "Edvaldo Cavalcanti"
  const normalizarNomeGestor = (gestor?: string) => {
    const g = (gestor || "").trim();
    if (!g) return "Sem Gestor Definido";
    if (g === "Edvaldo") return "Edvaldo Cavalcanti";
    if (g === "Tiago") return "Tiago Santana";
    return g;
  };

  // 👇 Lógica de Agrupamento (Gestor, Status ou Dias sem Atualizar decrescente)
  const gruposDemandas = useMemo(() => {
    if (agrupamento === "nenhum") return [];

    if (agrupamento === "gestor") {
      const mapa = new Map<string, IDemanda[]>();
      demandasFiltradas.forEach((d) => {
        const chave = normalizarNomeGestor(d.gestor);
        if (!mapa.has(chave)) mapa.set(chave, []);
        mapa.get(chave)!.push(d);
      });

      return Array.from(mapa.entries())
        .sort(([a], [b]) => {
          if (a === "Sem Gestor Definido") return 1;
          if (b === "Sem Gestor Definido") return -1;
          return a.localeCompare(b, "pt-BR");
        })
        .map(([titulo, itens]) => ({
          chave: titulo,
          titulo,
          cor: undefined as string | undefined,
          icone: "gestor" as const,
          itens,
        }));
    }

    if (agrupamento === "status") {
      const ordemStatus = Object.keys(STATUS_CONFIG);
      const mapa = new Map<string, IDemanda[]>();
      demandasFiltradas.forEach((d) => {
        const chave = d.status || "Sem Status";
        if (!mapa.has(chave)) mapa.set(chave, []);
        mapa.get(chave)!.push(d);
      });

      return Array.from(mapa.entries())
        .sort(([a], [b]) => {
          const idxA = ordemStatus.indexOf(a);
          const idxB = ordemStatus.indexOf(b);
          if (idxA === -1 && idxB === -1) return a.localeCompare(b, "pt-BR");
          if (idxA === -1) return 1;
          if (idxB === -1) return -1;
          return idxA - idxB;
        })
        .map(([titulo, itens]) => ({
          chave: titulo,
          titulo,
          cor: STATUS_CONFIG[titulo] || "#ccc",
          icone: "status" as const,
          itens,
        }));
    }

    // agrupamento === "dias_sem_atualizar" (da maior quantidade de dias para a menor)
    const mapa = new Map<number | null, IDemanda[]>();
    demandasFiltradas.forEach((d) => {
      const dias = calcularDiasSemAtualizar(d.atualizado_em || d.criadoEm);
      if (!mapa.has(dias)) mapa.set(dias, []);
      mapa.get(dias)!.push(d);
    });

    return Array.from(mapa.entries())
      .sort(([diasA], [diasB]) => {
        if (diasA === null && diasB === null) return 0;
        if (diasA === null) return 1;
        if (diasB === null) return -1;
        return diasB - diasA; // Maior quantidade de dias primeiro
      })
      .map(([dias, itens]) => {
        const titulo =
          dias === null
            ? "Sem data de atualização"
            : dias === 0
              ? "Atualizadas hoje (0 dias)"
              : dias === 1
                ? "1 dia sem atualizar"
                : `${dias} dias sem atualizar`;
        return {
          chave: `dias-${dias ?? "null"}`,
          titulo,
          cor: undefined as string | undefined,
          icone: "dias" as const,
          itens,
        };
      });
  }, [demandasFiltradas, agrupamento]);

  // Status disponíveis nos filtros (oculta Cancelada e Declinada quando mostrarCanceladas === false)
  const statusDisponiveisNoFiltro = useMemo(() => {
    return Object.entries(STATUS_CONFIG).filter(([label]) => {
      if (!mostrarCanceladas && (label === "Cancelada" || label === "Declinada")) {
        return false;
      }
      return true;
    });
  }, [mostrarCanceladas]);

  if (loading || authLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  // 👇 3. Atualizado para extrair os anos apenas das demandas visíveis
  const listaAnos = demandasVisiveis.map((demanda) => demanda.numero.toString().slice(0, 4));

  // 👇 4. Atualizado para contar os status apenas das demandas visíveis
  const contagemStatusPorAno = demandasVisiveis
    .filter((demanda) => demanda.numero.toString().slice(0, 4) === anoFiltro)
    .map((demanda) => demanda.status)
    .reduce((acc: Record<string, number>, item) => {
      acc[item] = (acc[item] || 0) + 1;
      return acc;
    }, {});

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3, maxWidth: "lg", mx: "auto", pb: 5 }}>
      {/* CABEÇALHO */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2 }}>
        <Title title="Demandas" subtitle="Gerenciamento de ordens de serviço - LL Engenharia" />
        {role !== "user" && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            sx={{ borderRadius: 2, fontWeight: "bold" }}
            onClick={() => router.push('/demandas/nova')}
          >
            Nova Demanda
          </Button>
        )}
      </Box>

      {/* CAMPO DE BUSCA */}
      <TextField
        fullWidth
        placeholder="Buscar por número ou nome do local..."
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        sx={{ bgcolor: "background.paper", borderRadius: 1 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon color="action" />
            </InputAdornment>
          ),
        }}
      />

      {/* FILTRO DE ANO E CONTROLES */}
      <Box sx={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 2, alignItems: "center", mb: 1 }}>
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          {[...new Set(listaAnos)].map((ano) => (
            <Button
              key={ano}
              variant={anoFiltro === ano ? "contained" : "outlined"}
              onClick={() => setAnoFiltro(ano)}
              size="small"
              sx={{ borderRadius: "8px", px: 3, fontWeight: 700 }}
            >
              {ano}
            </Button>
          ))}
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
          <TextField
            select
            size="small"
            label="Agrupar por"
            value={agrupamento}
            onChange={(e) => setAgrupamento(e.target.value as TipoAgrupamento)}
            sx={{ minWidth: 230, bgcolor: "background.paper", borderRadius: 1 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <GroupIcon fontSize="small" color="action" />
                </InputAdornment>
              ),
            }}
          >
            <MenuItem value="nenhum">Sem agrupamento</MenuItem>
            {isAdmin && <MenuItem value="gestor">Gestor</MenuItem>}
            <MenuItem value="status">Status</MenuItem>
            <MenuItem value="dias_sem_atualizar">Dias sem atualizar (Maior → Menor)</MenuItem>
          </TextField>

          <FormControlLabel
            control={
              <Switch
                checked={mostrarCanceladas}
                onChange={(e) => setMostrarCanceladas(e.target.checked)}
                size="small"
                color="primary"
              />
            }
            label={<Typography variant="body2" color="text.secondary" fontWeight="bold">Mostrar Canceladas / Declinadas</Typography>}
          />
        </Box>
      </Box>

      {/* FILTRO DE STATUS - CELULAR */}
      <Box sx={{ display: { xs: "block", md: "none" }, mb: 1 }}>
        <TextField
          select
          fullWidth
          size="small"
          label="Filtrar por Status"
          value={statusFiltro}
          onChange={(e) => setStatusFiltro(e.target.value)}
          sx={{ bgcolor: "background.paper", borderRadius: 1 }}
        >
          <MenuItem value="Todos">
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Box sx={{ width: 12, height: 12, borderRadius: "50%", bgcolor: "#ccc" }} />
              Ver Todas
            </Box>
          </MenuItem>
          {statusDisponiveisNoFiltro.map(([label, color]) => (
            <MenuItem key={label} value={label}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Box sx={{ width: 12, height: 12, borderRadius: "50%", bgcolor: color }} />
                <Typography variant="body2">
                  {label} ({contagemStatusPorAno[label] || 0})
                </Typography>
              </Box>
            </MenuItem>
          ))}
        </TextField>
      </Box>

      {/* FILTRO DE STATUS - PC */}
      <Box 
        sx={{ 
          display: { xs: "none", md: "flex" }, gap: 1, flexWrap: "wrap", pb: 3, 
          borderBottom: "1px solid", borderColor: "divider" 
        }}
      >
        <Chip
          label="Ver Todas"
          onClick={() => setStatusFiltro("Todos")}
          variant={statusFiltro === "Todos" ? "filled" : "outlined"}
          sx={{ fontWeight: "bold" }}
        />

        {statusDisponiveisNoFiltro.map(([label, color]) => {
          return (
            <Badge badgeContent={contagemStatusPorAno[label]} color="primary" key={label}>
              <Chip
                label={label}
                onClick={() => setStatusFiltro(label)}
                sx={{
                  fontWeight: 600, fontSize: "0.75rem",
                  bgcolor: statusFiltro === label ? color : alpha(color, 0.08),
                  color: statusFiltro === label ? "#fff" : color,
                  border: "1px solid",
                  borderColor: statusFiltro === label ? color : alpha(color, 0.2),
                  "&:hover": { bgcolor: statusFiltro === label ? color : alpha(color, 0.15) },
                }}
              />
            </Badge>
          );
        })}
      </Box>

      {/* LISTAGEM */}
      <Box sx={{ display: "flex", flexDirection: "column" }}>
        {demandasFiltradas.length === 0 ? (
          <Paper sx={{ p: 10, textAlign: "center", bgcolor: "transparent", border: "2px dashed", borderColor: "divider" }}>
            <Typography color="text.secondary">
              {busca !== "" 
                ? `Nenhuma demanda encontrada para "${busca}".` 
                : "Nenhuma demanda encontrada neste filtro."}
            </Typography>
          </Paper>
        ) : agrupamento === "nenhum" ? (
          demandasFiltradas.map((demanda) => (
            <DemandaCardList
              key={demanda.id}
              demanda={demanda}
              onClick={(d) => router.push(`/demandas/${d.numero}`)}
            />
          ))
        ) : (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {gruposDemandas.map((grupo) => {
              const totalValorGrupo = grupo.itens.reduce((acc, d) => acc + (Number(d.valor) || 0), 0);
              return (
                <Box key={grupo.chave} sx={{ display: "flex", flexDirection: "column" }}>
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      flexWrap: "wrap",
                      gap: 1,
                      mb: 1.5,
                      px: 2,
                      py: 1,
                      borderRadius: 2,
                      bgcolor: "action.hover",
                      borderLeft: "4px solid",
                      borderColor: grupo.cor || "primary.main",
                    }}
                  >
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      {grupo.icone === "gestor" && <PersonIcon fontSize="small" color="primary" />}
                      {grupo.icone === "dias" && <AccessTimeIcon fontSize="small" color="primary" />}
                      {grupo.icone === "status" && (
                        <Box sx={{ width: 12, height: 12, borderRadius: "50%", bgcolor: grupo.cor || "primary.main" }} />
                      )}
                      <Typography variant="subtitle1" sx={{ fontWeight: 800 }}>
                        {grupo.titulo}
                      </Typography>
                      <Chip
                        label={`${grupo.itens.length} ${grupo.itens.length === 1 ? "demanda" : "demandas"}`}
                        size="small"
                        sx={{ fontWeight: 700, height: 22, fontSize: "0.75rem" }}
                      />
                    </Box>

                    <Typography variant="body2" sx={{ fontWeight: 700, color: "text.secondary" }}>
                      Total:{" "}
                      {totalValorGrupo.toLocaleString("pt-BR", {
                        style: "currency",
                        currency: "BRL",
                      })}
                    </Typography>
                  </Box>

                  {grupo.itens.map((demanda) => (
                    <DemandaCardList
                      key={demanda.id}
                      demanda={demanda}
                      mostrarDiasSemAtualizar={agrupamento === "dias_sem_atualizar"}
                      onClick={(d) => router.push(`/demandas/${d.numero}`)}
                    />
                  ))}
                </Box>
              );
            })}
          </Box>
        )}
      </Box>
    </Box>
  );
}