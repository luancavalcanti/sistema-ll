"use client";

import React, { useState, useEffect } from "react";
import { 
  Box, Button, CircularProgress, Dialog, DialogTitle, DialogContent, 
  DialogActions, TextField, IconButton, Typography 
} from "@mui/material";
import { 
  Save as SaveIcon, ArrowBack as ArrowBackIcon, Edit as EditIcon 
} from "@mui/icons-material";
import { useRouter, useParams } from "next/navigation";
import { IDemanda } from "@/types/demanda";
import { IMovimento } from "@/types/movimento";
import { IFaturamento } from "@/types/faturamento";
import Title from "@/components/Title";
import { supabase } from "@/lib/supabase"; // Necessário para a validação

import { atualizarDemanda, buscarDemandaPorNumero } from "@/services/demandasService";
import { buscarMovimentosDaDemanda } from "@/services/movimentosService";
import { buscarFaturamentosPorDemanda } from "@/services/faturamentosService";

import InformacoesBasicas from "../_components/InformacoesBasicas";
import Faturamento from "../_components/Faturamento";
import ResumoFinanceiro from "../_components/ResumoFinanceiro";

export default function EditarDemandaPage() {
  const router = useRouter();
  const params = useParams();
  const numeroDemandaDaURL = params.id as string;

  const [demanda, setDemanda] = useState<Partial<IDemanda>>({});
  const [faturamentos, setFaturamentos] = useState<IFaturamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [ufs, setUfs] = useState<{ sigla: string; nome: string }[]>([]);
  const [cidades, setCidades] = useState<{ nome: string }[]>([]);
  
  const [movimentosDemanda, setMovimentosDemanda] = useState<IMovimento[]>([]);
  const [loadingFinanceiro, setLoadingFinanceiro] = useState(true);

  // Estados para o Modal de Edição de Número
  const [openModalNumero, setOpenModalNumero] = useState(false);
  const [novoNumeroTemp, setNovoNumeroTemp] = useState("");
  const [validandoNumero, setValidandoNumero] = useState(false);
  const [erroNumero, setErroNumero] = useState("");

  // 1. CARREGAMENTO INICIAL
  useEffect(() => {
    const fetchDadosDaDemanda = async () => {
      if (!numeroDemandaDaURL) return;
      try {
        const dadosDemanda = await buscarDemandaPorNumero(numeroDemandaDaURL);
        
        if (dadosDemanda) {
          setDemanda(dadosDemanda);
          const dadosFaturamento = await buscarFaturamentosPorDemanda(numeroDemandaDaURL);
          setFaturamentos(dadosFaturamento || []);
        } else {
          console.error("Demanda não encontrada.");
        }
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDadosDaDemanda();
  }, [numeroDemandaDaURL]);

  // 2. IBGE
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

  // 3. Financeiro
  useEffect(() => {
    const fetchMovimentos = async () => {
      if (!numeroDemandaDaURL) return;
      try {
        const movimentos = await buscarMovimentosDaDemanda(numeroDemandaDaURL);
        setMovimentosDemanda(movimentos || []);
      } catch (error) {
        console.error("Erro ao carregar financeiro", error);
      } finally {
        setLoadingFinanceiro(false);
      }
    };
    fetchMovimentos();
  }, [numeroDemandaDaURL]);

  // Handlers do Formulário
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setDemanda((prev) => {
      if (name === "uf") return { ...prev, uf: value, cidade: "" };
      return { ...prev, [name]: value };
    });
  };

  // Handlers de Faturamento
  const addFaturamento = () => {
    setFaturamentos([
      ...faturamentos, 
      { 
        id: `temp-${Date.now()}`, 
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

  const updateFaturamento = (id: string, field: string, value: any) => {
    setFaturamentos(faturamentos.map(fat => fat.id === id ? { ...fat, [field]: value } : fat));
  };

  const cancelarFaturamento = (id: string) => {
    setFaturamentos(faturamentos.map(fat => fat.id === id ? { ...fat, valor_fat: 0, valor_cred: 0, cancelada: true } : fat));
  };

  const removerFaturamento = (id: string) => {
    setFaturamentos(faturamentos.filter(fat => fat.id !== id));
  };

  // Handler para Alterar o Número da Demanda
  const handleMudarNumero = async () => {
    setErroNumero("");
    if (!novoNumeroTemp || novoNumeroTemp.length < 3) {
      setErroNumero("O número precisa ter pelo menos 3 dígitos.");
      return;
    }
    
    // Se o número for igual ao atual, apenas fecha o modal
    if (novoNumeroTemp === String(demanda.numero)) {
      setOpenModalNumero(false);
      return;
    }

    setValidandoNumero(true);
    try {
      // Verifica se já existe no banco
      const { data, error } = await supabase
        .from('demandas')
        .select('id')
        .eq('numero', novoNumeroTemp)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setErroNumero(`O número ${novoNumeroTemp} já está em uso.`);
        setValidandoNumero(false);
        return;
      }

      // Se passou, atualiza o estado local (será salvo de verdade no handleSave final)
      setDemanda(prev => ({ ...prev, numero: Number(novoNumeroTemp) }));
      setOpenModalNumero(false);
      
    } catch (err) {
      console.error("Erro ao validar número:", err);
      setErroNumero("Erro ao validar. Tente novamente.");
    } finally {
      setValidandoNumero(false);
    }
  };

  // Cálculos Compartilhados
  const valorTotalDemanda = Number(demanda.valor) || 0;
  const valorTotalFaturado = faturamentos.reduce((acc, fat) => acc + (Number(fat.valor_fat) || 0), 0);
  const diferencaFaturamento = valorTotalDemanda - valorTotalFaturado;
  const is100Porcento = valorTotalDemanda > 0 && diferencaFaturamento <= 0;
  
  const totalDespesas = movimentosDemanda.filter((m) => Number(m.valor) < 0).reduce((acc, m) => acc + Number(m.valor), 0);
  const saldoDemanda = valorTotalFaturado + totalDespesas;

  // 4. Salvar Alterações
  const handleSave = async () => {
    setSaving(true);
    try {
      // IMPORTANTE: Como o número pode ter mudado, passamos o novo número como ID, 
      // mas precisamos que o serviço lide com a alteração da chave (numero) no banco,
      // ou garantimos que a função de atualizar procure pelo ID interno do banco se houver.
      // Se a sua URL/API espera o numeroDaURL original para achar o registro, passe ele:
      await atualizarDemanda(numeroDemandaDaURL, demanda, faturamentos);
      
      // Se o número mudou, redireciona para a nova URL correspondente
      if (String(demanda.numero) !== numeroDemandaDaURL) {
        router.push(`/demandas/${demanda.numero}`);
      } else {
        router.push("/demandas");
      }
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
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Button variant="outlined" onClick={() => router.back()} sx={{ minWidth: "auto", p: 1 }}>
            <ArrowBackIcon />
          </Button>
          
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Title title={`Demanda ${demanda.numero}`} subtitle="Gerencie as informações financeiras desta demanda" />
            <IconButton 
              size="small" 
              color="primary" 
              onClick={() => {
                setNovoNumeroTemp(String(demanda.numero));
                setOpenModalNumero(true);
              }}
              sx={{ mt: -2 }} // Ajuste fino para alinhar com o Título
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>

        <Button variant="contained" onClick={handleSave} disabled={saving} startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}>
          {saving ? "Salvando..." : "Salvar Alterações"}
        </Button>
      </Box>

      {/* MODAL EDITAR NÚMERO */}
      <Dialog open={openModalNumero} onClose={() => !validandoNumero && setOpenModalNumero(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: "bold" }}>Alterar Número da Demanda</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Digite o novo número. O sistema verificará se ele está disponível.
          </Typography>
          <TextField
            fullWidth
            label="Novo Número"
            value={novoNumeroTemp}
            onChange={(e) => setNovoNumeroTemp(e.target.value.replace(/\D/g, '').slice(0, 7))}
            inputProps={{ maxLength: 7 }}
            error={!!erroNumero}
            helperText={erroNumero}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenModalNumero(false)} color="inherit" disabled={validandoNumero}>
            Cancelar
          </Button>
          <Button 
            onClick={handleMudarNumero} 
            variant="contained" 
            disabled={validandoNumero || !novoNumeroTemp}
            startIcon={validandoNumero ? <CircularProgress size={16} color="inherit" /> : null}
          >
            {validandoNumero ? "Verificando..." : "Aplicar"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* COMPONENTES MODULARIZADOS */}
      <InformacoesBasicas demanda={demanda} handleChange={handleChange} ufs={ufs} cidades={cidades} />

      {!["Nova", "Proposta"].includes(demanda.status || "") && (
        <Faturamento 
          faturamentos={faturamentos} addFaturamento={addFaturamento} updateFaturamento={updateFaturamento} 
          cancelarFaturamento={cancelarFaturamento} removerFaturamento={removerFaturamento} 
          valorTotalDemanda={valorTotalDemanda} valorTotalFaturado={valorTotalFaturado} 
          diferencaFaturamento={diferencaFaturamento} is100Porcento={is100Porcento} 
        />
      )}

      {!["Nova", "Proposta"].includes(demanda.status || "") && (
        <ResumoFinanceiro 
          loadingFinanceiro={loadingFinanceiro} movimentosDemanda={movimentosDemanda} 
          totalDespesas={totalDespesas} valorTotalFaturado={valorTotalFaturado} saldoDemanda={saldoDemanda} 
        />
      )}
    </Box>
  );
}