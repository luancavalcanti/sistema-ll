"use client";

import React, { useState, useEffect } from "react";
import { Box, Button, CircularProgress } from "@mui/material";
import { Save as SaveIcon, ArrowBack as ArrowBackIcon } from "@mui/icons-material";
import { useRouter, useParams } from "next/navigation";
import { IDemanda } from "@/types/demanda";
import { IMovimento } from "@/types/movimento";
import { IFaturamento } from "@/types/faturamento";
import Title from "@/components/Title";

import { atualizarDemanda, buscarDemandaPorNumero } from "@/services/demandasService";
import { buscarMovimentosDaDemanda } from "@/services/movimentosService";
// 👇 Importamos o serviço de faturamento para puxar as notas desta demanda específica
import { buscarFaturamentosPorDemanda } from "@/services/faturamentosService";

import InformacoesBasicas from "../_components/InformacoesBasicas";
import Faturamento from "../_components/Faturamento";
import ResumoFinanceiro from "../_components/ResumoFinanceiro";

export default function EditarDemandaPage() {
  const router = useRouter();
  const params = useParams();
  // No Supabase, você decidiu usar o 'numero' na URL. 
  // O Next.js ainda chama de 'id' por causa da pasta [id], mas o valor é o numero (ex: 2026001).
  const numeroDemandaDaURL = params.id as string;

  const [demanda, setDemanda] = useState<Partial<IDemanda>>({});
  const [faturamentos, setFaturamentos] = useState<IFaturamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [ufs, setUfs] = useState<{ sigla: string; nome: string }[]>([]);
  const [cidades, setCidades] = useState<{ nome: string }[]>([]);
  
  const [movimentosDemanda, setMovimentosDemanda] = useState<IMovimento[]>([]);
  const [loadingFinanceiro, setLoadingFinanceiro] = useState(true);

  // 1. CARREGAMENTO INICIAL (Demanda + Faturamento)
  useEffect(() => {
    const fetchDadosDaDemanda = async () => {
      if (!numeroDemandaDaURL) return;
      try {
        // Busca a demanda limpa
        const dadosDemanda = await buscarDemandaPorNumero(numeroDemandaDaURL);
        
        if (dadosDemanda) {
          setDemanda(dadosDemanda);
          
          // Busca o faturamento atrelado a essa demanda
          const dadosFaturamento = await buscarFaturamentosPorDemanda(numeroDemandaDaURL);
          setFaturamentos(dadosFaturamento || []);
        } else {
          console.error("Demanda não encontrada.");
          // Opcional: router.push('/demandas') se não achar
        }
      } catch (error) {
        console.error("Erro ao carregar dados principais:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDadosDaDemanda();
  }, [numeroDemandaDaURL]);

  // 2. IBGE: Buscar UFs e Cidades
  useEffect(() => {
    fetch("https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome")
      .then((res) => res.json())
      .then((data) => setUfs(data));
  }, []);

  useEffect(() => {
    if (!demanda.uf) { setCidades([]); return; }
    fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${demanda.uf}/municipios`)
      .then((res) => res.json())
      .then((data) => setCidades(data));
  }, [demanda.uf]);

  // 3. Financeiro (Buscando Despesas atreladas à demanda)
  useEffect(() => {
    const fetchMovimentos = async () => {
      if (!numeroDemandaDaURL) return;

      try {
        const movimentos = await buscarMovimentosDaDemanda(numeroDemandaDaURL);
        setMovimentosDemanda(movimentos || []);
      } catch (error) {
        console.error("Erro ao carregar o financeiro", error);
      } finally {
        setLoadingFinanceiro(false);
      }
    };

    fetchMovimentos();
  }, [numeroDemandaDaURL]);

  // Handlers do Formulário Base
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setDemanda((prev) => {
      if (name === "uf") return { ...prev, uf: value, cidade: "" };
      return { ...prev, [name]: value };
    });
  };

  // Handlers de Faturamento (Agora manipulando IFaturamento com snake_case)
  // Usamos um ID temporário apenas para o frontend saber qual linha ele está editando antes de salvar
  const addFaturamento = () => {
    setFaturamentos([
      ...faturamentos, 
      { 
        id: `temp-${Date.now()}`, // ID temporário para o React não se perder
        demandaId: numeroDemandaDaURL,
        nota_fiscal: "", 
        valor_fat: 0, 
        valor_cred: 0, 
        data_fat: "", 
        data_cred: "", 
        cancelada: false 
      }
    ]);
  };

  const updateFaturamento = (idDoFaturamento: string, field: string, value: any) => {
    setFaturamentos(faturamentos.map((fat) => 
      fat.id === idDoFaturamento ? { ...fat, [field]: value } : fat
    ));
  };

  const cancelarFaturamento = (idDoFaturamento: string) => {
    setFaturamentos(faturamentos.map((fat) => 
      fat.id === idDoFaturamento ? { ...fat, valor_fat: 0, valor_cred: 0, cancelada: true } : fat
    ));
  };

  const removerFaturamento = (idDoFaturamento: string) => {
    setFaturamentos(faturamentos.filter((fat) => fat.id !== idDoFaturamento));
  };

  // Cálculos Compartilhados
  const valorTotalDemanda = Number(demanda.valor) || 0;
  // Atualizado para ler valor_fat em vez de valorFat
  const valorTotalFaturado = faturamentos.reduce((acc, fat) => acc + (Number(fat.valor_fat) || 0), 0);
  const diferencaFaturamento = valorTotalDemanda - valorTotalFaturado;
  const is100Porcento = valorTotalDemanda > 0 && diferencaFaturamento <= 0;
  
  const totalDespesas = movimentosDemanda.filter((m) => Number(m.valor) < 0).reduce((acc, m) => acc + Number(m.valor), 0);
  const saldoDemanda = valorTotalFaturado + totalDespesas;

  // 4. Salvar Alterações
  const handleSave = async () => {
    setSaving(true);
    try {
      // Passamos o array de faturamentos para o serviço tratar a sincronização no Supabase
      await atualizarDemanda(numeroDemandaDaURL, demanda, faturamentos);
      router.push("/demandas");
    } catch (error) {
      console.error("Erro ao salvar demanda:", error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <CircularProgress sx={{ display: "block", m: "10% auto" }} />;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3, maxWidth: 1000, mx: "auto", pb: 5 }}>
      {/* CABEÇALHO */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Button variant="outlined" onClick={() => router.back()} sx={{ minWidth: "auto", p: 1 }}>
            <ArrowBackIcon />
          </Button>
          <Title title={`Demanda ${demanda.numero}`} subtitle="Gerencie as informações gerais, faturamento e o balanço financeiro desta demanda" />
        </Box>
        <Button variant="contained" onClick={handleSave} disabled={saving} startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}>
          {saving ? "Salvando..." : "Salvar Alterações"}
        </Button>
      </Box>

      {/* COMPONENTES MODULARIZADOS */}
      <InformacoesBasicas 
        demanda={demanda} 
        handleChange={handleChange} 
        ufs={ufs} 
        cidades={cidades} 
      />

      {!["Nova", "Proposta"].includes(demanda.status || "") && (
        <Faturamento 
          faturamentos={faturamentos} 
          addFaturamento={addFaturamento} 
          updateFaturamento={updateFaturamento} 
          cancelarFaturamento={cancelarFaturamento} 
          removerFaturamento={removerFaturamento} 
          valorTotalDemanda={valorTotalDemanda} 
          valorTotalFaturado={valorTotalFaturado} 
          diferencaFaturamento={diferencaFaturamento} 
          is100Porcento={is100Porcento} 
        />
      )}

      {!["Nova", "Proposta"].includes(demanda.status || "") && (
        <ResumoFinanceiro 
          loadingFinanceiro={loadingFinanceiro} 
          movimentosDemanda={movimentosDemanda} 
          totalDespesas={totalDespesas} 
          valorTotalFaturado={valorTotalFaturado} 
          saldoDemanda={saldoDemanda} 
        />
      )}
    </Box>
  );
}