"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Box, Typography, Button, Chip, alpha, CircularProgress, Paper, Badge } from "@mui/material";
import { Add as AddIcon } from "@mui/icons-material";
import { useRouter } from "next/navigation";
import Title from "@/components/Title";
import { useAuth } from "@/contexts/AuthContext";
import { IDemanda, STATUS_CONFIG } from "@/types/demanda";
import { DemandaCardList } from "./_components/DemandaCardList";

// 👇 Importamos apenas o nosso serviço novo
import { buscarDemandas } from "@/services/demandasService";

export default function DemandasPage() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [demandas, setDemandas] = useState<IDemanda[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Estados dos Filtros
  const [anoFiltro, setAnoFiltro] = useState<string>("2026");
  const [statusFiltro, setStatusFiltro] = useState<string>("Todos");
  

  useEffect(() => {
    if (authLoading || !user) return;

    const iniciar = async () => {
      try {
        setLoading(true);
        // Chama a função limpa e aguarda os dados
        const dadosProntos = await buscarDemandas(user, isAdmin);
        setDemandas(dadosProntos);
      } catch (error) {
        console.error("Falha ao carregar demandas:", error);
      } finally {
        setLoading(false);
      }
    };

    iniciar();
  }, [user, isAdmin, authLoading]);

  // Lógica de Filtro em Memória (Rápida)
  const demandasFiltradas = useMemo(() => {
    return demandas.filter((d) => {
      const matchAno = anoFiltro === "Todas" || d.numero.toString().startsWith(anoFiltro);
      const matchStatus = statusFiltro === "Todos" || d.status === statusFiltro;
      return matchAno && matchStatus;
    });
  }, [demandas, anoFiltro, statusFiltro]);

  if (loading || authLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", mt: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  // Lista de anos com base nas demandas registradas.
  const listaAnos = demandas.map((demanda) => demanda.numero.toString().slice(0, 4));

  // Quantidade de demandas por status/ano para usar nas badges.
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
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
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

      {/* FILTRO DE STATUS */}
      <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", pb: 3, borderBottom: "1px solid", borderColor: "divider" }}>
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
                  fontWeight: 600,
                  fontSize: "0.75rem",
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
            <Typography color="text.secondary">Nenhuma demanda encontrada.</Typography>
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