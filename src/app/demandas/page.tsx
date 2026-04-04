"use client";

import React, { useState, useEffect, useMemo } from "react";
import { 
  Box, Typography, Button, Chip, alpha, CircularProgress, 
  Paper, Badge, TextField, MenuItem, InputAdornment 
} from "@mui/material";
import { Add as AddIcon, Search as SearchIcon } from "@mui/icons-material";
import { useRouter } from "next/navigation";
import Title from "@/components/Title";
import { useAuth } from "@/contexts/AuthContext";
import { IDemanda, STATUS_CONFIG } from "@/types/demanda";
import { DemandaCardList } from "./_components/DemandaCardList";

import { buscarDemandas } from "@/services/demandasService";

export default function DemandasPage() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [demandas, setDemandas] = useState<IDemanda[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Estados dos Filtros
  const [anoFiltro, setAnoFiltro] = useState<string>("2026");
  const [statusFiltro, setStatusFiltro] = useState<string>("Todos");
  // 👇 1. Novo Estado para o campo de busca
  const [busca, setBusca] = useState<string>("");

  useEffect(() => {
    if (authLoading || !user) return;

    const iniciar = async () => {
      try {
        setLoading(true);
        const dadosProntos = await buscarDemandas(user, isAdmin);
        setDemandas(dadosProntos);
      } catch (error) {
        console.error("Falha ao carregar demandas:", error);
      } finally {
        setLoading(false);
      }
    };

    iniciar();
  }, [user?.id, isAdmin, authLoading]);

  // 👇 Função auxiliar para ignorar acentos e maiúsculas na busca
  const normalizarTexto = (texto?: string) => {
    if (!texto) return "";
    return texto.toString().toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  };

  // 👇 2. Lógica de Filtro em Memória (Atualizada com a Busca)
  const demandasFiltradas = useMemo(() => {
    const termoBusca = normalizarTexto(busca);

    return demandas.filter((d) => {
      const matchAno = anoFiltro === "Todas" || d.numero.toString().startsWith(anoFiltro);
      const matchStatus = statusFiltro === "Todos" || d.status === statusFiltro;
      
      // Lógica da Busca em Tempo Real
      let matchBusca = true;
      if (termoBusca) {
        // Verifica se o termo está no número ou no nome do local
        const stringNumero = d.numero.toString();
        const textoLocal = normalizarTexto(d.local);
        
        matchBusca = stringNumero.includes(termoBusca) || textoLocal.includes(termoBusca);
      }

      // Só exibe a demanda se ela passar nos três filtros (Ano + Status + Busca)
      return matchAno && matchStatus && matchBusca;
    });
  }, [demandas, anoFiltro, statusFiltro, busca]);

  if (loading || authLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  // Lista de anos com base nas demandas registradas.
  const listaAnos = demandas.map((demanda) => demanda.numero.toString().slice(0, 4));

  // Quantidade de demandas por status/ano
  const contagemStatusPorAno = demandas
    .filter((demanda) => demanda.numero.toString().slice(0, 4) === anoFiltro)
    .map((demanda) => demanda.status)
    .reduce((acc: Record<string, number>, item) => {
      acc[item] = (acc[item] || 0) + 1;
      return acc;
    }, {});

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3, maxWidth: "lg", mx: "auto", pb: 5 }}>
      {/* CABEÇALHO */}
      <Box sx={{ display: "flex", justifyContent: {xs: "flex-end", sm: "space-between"}, alignItems: "center", flexWrap: "wrap", gap: 2 }}>
        <Title title="Demandas" subtitle="Gerenciamento de ordens de serviço - LL Engenharia" />
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          sx={{ borderRadius: 2, fontWeight: "bold" }}
          onClick={() => router.push('/demandas/nova')}
        >
          Nova Demanda
        </Button>
      </Box>

      {/* 👇 3. NOVO CAMPO DE BUSCA */}
      <TextField
        fullWidth
        placeholder="Buscar por número ou nome do local..."
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        sx={{ bgcolor: "#fff", borderRadius: 1 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon color="action" />
            </InputAdornment>
          ),
        }}
      />

      {/* FILTRO DE ANO */}
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

      {/* 📱 FILTRO DE STATUS - VERSÃO CELULAR (Dropdown) */}
      <Box sx={{ display: { xs: "block", md: "none" }, mb: 1 }}>
        <TextField
          select
          fullWidth
          size="small"
          label="Filtrar por Status"
          value={statusFiltro}
          onChange={(e) => setStatusFiltro(e.target.value)}
          sx={{ bgcolor: "#fff", borderRadius: 1 }}
        >
          <MenuItem value="Todos">
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Box sx={{ width: 12, height: 12, borderRadius: "50%", bgcolor: "#ccc" }} />
              Ver Todas
            </Box>
          </MenuItem>
          {Object.entries(STATUS_CONFIG).map(([label, color]) => (
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

      {/* 💻 FILTRO DE STATUS - VERSÃO PC/TABLET (Chips) */}
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

        {Object.entries(STATUS_CONFIG).map(([label, color]) => {
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

      {/* LISTAGEM DE CARDS */}
      <Box sx={{ display: "flex", flexDirection: "column" }}>
        {demandasFiltradas.length === 0 ? (
          <Paper sx={{ p: 10, textAlign: "center", bgcolor: "transparent", border: "2px dashed #ddd" }}>
            <Typography color="text.secondary">
              {busca !== "" 
                ? `Nenhuma demanda encontrada para "${busca}".` 
                : "Nenhuma demanda encontrada neste filtro."}
            </Typography>
          </Paper>
        ) : (
          demandasFiltradas.map((demanda) => (
            <DemandaCardList key={demanda.id} demanda={demanda} onClick={(d) => router.push(`/demandas/${d.numero}`)} />
          ))
        )}
      </Box>
    </Box>
  );
}