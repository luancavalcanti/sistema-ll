"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Box, Button, CircularProgress, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, IconButton, Typography, Chip, alpha,
  Snackbar, Alert, Fab, Zoom
} from "@mui/material";
import {
  Save as SaveIcon, ArrowBack as ArrowBackIcon, Edit as EditIcon,
  ContentCopy as ContentCopyIcon, WhatsApp as WhatsAppIcon,
  WarningAmber as WarningAmberIcon
} from "@mui/icons-material";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { IDemanda } from "@/types/demanda";
import { IMovimento } from "@/types/movimento";
import { IFaturamento } from "@/types/faturamento";
import Title from "@/components/Title";
import { supabase } from "@/lib/supabase"; // Necessário para a validação
import { calcularSLA } from "@/utils/sla";
import { AccessTime as AccessTimeIcon } from "@mui/icons-material";

import { atualizarDemanda, buscarDemandaPorNumero } from "@/services/demandasService";
import { buscarMovimentosDaDemanda, obterUltimaDataMovimento } from "@/services/movimentosService";
import { buscarFaturamentosPorDemanda } from "@/services/faturamentosService";
import { UFS_BRASIL, obterCidadesPorUF } from "@/utils/localidades";

import InformacoesBasicas from "../_components/InformacoesBasicas";
import Faturamento from "../_components/Faturamento";
import ResumoFinanceiro from "../_components/ResumoFinanceiro";

export default function EditarDemandaPage() {
  const router = useRouter();
  const params = useParams();
  const { role } = useAuth();
  const numeroDemandaDaURL = params.id as string;

  const [demanda, setDemanda] = useState<Partial<IDemanda>>({});
  const [faturamentos, setFaturamentos] = useState<IFaturamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const ufs = UFS_BRASIL;
  const cidades = obterCidadesPorUF(demanda.uf);

  const [movimentosDemanda, setMovimentosDemanda] = useState<IMovimento[]>([]);
  const [contasEmAberto, setContasEmAberto] = useState<any[]>([]);
  const [loadingFinanceiro, setLoadingFinanceiro] = useState(true);
  const [ultimaDataAtualizacao, setUltimaDataAtualizacao] = useState<string | null>(null);

  // Estados para o Modal de Edição de Número
  const [openModalNumero, setOpenModalNumero] = useState(false);
  const [novoNumeroTemp, setNovoNumeroTemp] = useState("");
  const [validandoNumero, setValidandoNumero] = useState(false);
  const [erroNumero, setErroNumero] = useState("");

  // Controle de alterações não salvas, feedback de salvamento e confirmação de saída
  const [snapshotSalvo, setSnapshotSalvo] = useState<string>("");
  const [snackbar, setSnackbar] = useState<{ open: boolean; message: string; severity: "success" | "error" }>({
    open: false,
    message: "",
    severity: "success",
  });
  const [modalSairOpen, setModalSairOpen] = useState(false);
  const destinoPendenteRef = useRef<string | "BACK" | null>(null);

  const snapshotAtual = useMemo(
    () => JSON.stringify({ demanda, faturamentos }),
    [demanda, faturamentos]
  );
  const temAlteracoes = Boolean(snapshotSalvo && snapshotAtual !== snapshotSalvo);

  // 1. CARREGAMENTO INICIAL
  useEffect(() => {
    const fetchDadosDaDemanda = async () => {
      if (!numeroDemandaDaURL) return;
      try {
        const dadosDemanda = await buscarDemandaPorNumero(numeroDemandaDaURL);

        if (dadosDemanda) {
          const dadosFaturamento = (await buscarFaturamentosPorDemanda(numeroDemandaDaURL)) || [];
          setDemanda(dadosDemanda);
          setFaturamentos(dadosFaturamento);
          setSnapshotSalvo(JSON.stringify({ demanda: dadosDemanda, faturamentos: dadosFaturamento }));
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

  // Proteção ao fechar/recarregar a aba do navegador e ao clicar em links internos
  useEffect(() => {
    if (!temAlteracoes) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };

    const handleDocumentClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const anchor = target?.closest("a[href]") as HTMLAnchorElement | null;
      if (!anchor) return;

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("javascript:")) return;
      if (anchor.target === "_blank" || e.ctrlKey || e.metaKey || e.shiftKey) return;

      const urlDestino = new URL(anchor.href, window.location.origin);
      if (
        urlDestino.origin === window.location.origin &&
        urlDestino.pathname !== window.location.pathname
      ) {
        e.preventDefault();
        e.stopPropagation();
        destinoPendenteRef.current = urlDestino.pathname + urlDestino.search;
        setModalSairOpen(true);
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("click", handleDocumentClick, true);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("click", handleDocumentClick, true);
    };
  }, [temAlteracoes]);

  const handleTentativaVoltar = () => {
    if (temAlteracoes) {
      destinoPendenteRef.current = "BACK";
      setModalSairOpen(true);
    } else {
      router.back();
    }
  };

  const confirmarSaidaSemSalvar = () => {
    const destino = destinoPendenteRef.current;
    setModalSairOpen(false);
    setSnapshotSalvo(snapshotAtual);
    if (destino === "BACK" || !destino) {
      router.back();
    } else {
      router.push(destino);
    }
  };

  // 3. Financeiro
  useEffect(() => {
    const fetchMovimentos = async () => {
      if (!numeroDemandaDaURL) return;
      try {
        const [movimentos, ultimaData, { data: contasData }] = await Promise.all([
          buscarMovimentosDaDemanda(numeroDemandaDaURL),
          obterUltimaDataMovimento(),
          supabase.from("contas_a_pagar").select("*").eq("demanda_numero", numeroDemandaDaURL).eq("status", "Pendente")
        ]);
        setMovimentosDemanda(movimentos || []);
        setUltimaDataAtualizacao(ultimaData);
        setContasEmAberto(contasData || []);
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
    const valorFinal = name === "topico" ? value.toUpperCase() : value;
    setDemanda((prev) => {
      if (name === "uf") return { ...prev, uf: valorFinal, cidade: "" };
      return { ...prev, [name]: valorFinal };
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
    setFaturamentos(prev => prev.map(fat => fat.id === id ? { ...fat, [field]: value } : fat));
  };

  const cancelarFaturamento = (id: string) => {
    setFaturamentos(prev => prev.map(fat => fat.id === id ? { ...fat, valor_fat: 0, valor_cred: 0, cancelada: true } : fat));
  };

  const removerFaturamento = (id: string) => {
    setFaturamentos(prev => prev.filter(fat => fat.id !== id));
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

  const totalBoletosEmAberto = contasEmAberto.reduce((acc, c) => acc + Number(c.valor || 0), 0);
  const totalDespesas = movimentosDemanda.filter((m) => Number(m.valor) < 0).reduce((acc, m) => acc + Number(m.valor), 0) - totalBoletosEmAberto;
  const saldoDemanda = valorTotalFaturado + totalDespesas;

  // 4. Salvar Alterações
  const handleSave = async () => {
    setSaving(true);
    try {
      await atualizarDemanda(numeroDemandaDaURL, demanda, faturamentos);

      const numeroFinal = String(demanda.numero || numeroDemandaDaURL);
      const [dadosDemandaAtualizados, dadosFaturamentoAtualizados] = await Promise.all([
        buscarDemandaPorNumero(numeroFinal),
        buscarFaturamentosPorDemanda(numeroFinal),
      ]);

      const demandaNova = dadosDemandaAtualizados || demanda;
      const faturamentosNovos = dadosFaturamentoAtualizados || faturamentos;

      setDemanda(demandaNova);
      setFaturamentos(faturamentosNovos);
      setSnapshotSalvo(JSON.stringify({ demanda: demandaNova, faturamentos: faturamentosNovos }));

      setSnackbar({
        open: true,
        message: "Alterações salvas com sucesso!",
        severity: "success",
      });

      // Se o número da demanda foi alterado pelo Admin, atualiza apenas o parâmetro na URL mantendo na mesma tela
      if (numeroFinal !== numeroDemandaDaURL) {
        router.replace(`/demandas/${numeroFinal}`);
      }
    } catch (error) {
      console.error("Erro ao salvar demanda:", error);
      setSnackbar({
        open: true,
        message: "Erro ao salvar as alterações. Tente novamente.",
        severity: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <CircularProgress sx={{ display: "block", m: "10% auto" }} />;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3, maxWidth: 1000, mx: "auto", pb: 10 }}>
      {/* CABEÇALHO */}
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 2 }}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>

          {/* LINHA SUPERIOR: Botão Voltar + Título Principal + Botão Editar */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
            <Button variant="outlined" onClick={handleTentativaVoltar} sx={{ minWidth: "auto", p: 1, borderRadius: 2 }}>
              <ArrowBackIcon />
            </Button>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
              <Typography sx={{ fontWeight: 400, color: "primary.main", lineHeight: 1 }}>
                Demanda
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 800, color: "primary.main", lineHeight: 1 }}>
                {demanda.numero}
              </Typography>
            </Box>

            {role === "admin" && (
              <IconButton
                size="small"
                color="primary"
                onClick={() => {
                  setNovoNumeroTemp(String(demanda.numero));
                  setOpenModalNumero(true);
                }}
              >
                <EditIcon fontSize="small" />
              </IconButton>
            )}
          </Box>

          {/* INFORMAÇÕES SECUNDÁRIAS: Subtítulo, SLA e Grupos */}
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
            {/* Grupos do WhatsApp */}
            {demanda.numero && (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5, mt: 1 }}>
                {[
                  {
                    prefix: 'G-EXE:', value: (() => {
                      const cliente = demanda.cliente || "";
                      const map: Record<string, string> = {
                        "bradesco": "BRD",
                        "santander": "STD",
                        "itaú": "ITA",
                        "itau": "ITA",
                        "crefisa": "CRF"
                      };
                      const normalized = cliente.toLowerCase().trim();
                      const sigla = map[normalized] || cliente.substring(0, 3).toUpperCase();
                      const local = demanda.local || "N/D";
                      const topico = demanda.topico || (demanda.obs ? demanda.obs.substring(0, 15) : "N/D");
                      return `${sigla} - ${local} - ${topico}`;
                    })()
                  },
                  { prefix: 'G-ADM:', value: `${demanda.numero} - ${demanda.local || "N/D"} - ${demanda.topico || (demanda.obs ? demanda.obs.substring(0, 15) : "N/D")}` }
                ].map((grupo) => {
                  const upperValue = grupo.value.toUpperCase();
                  return (
                    <Box key={grupo.prefix} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <WhatsAppIcon sx={{ fontSize: 16, color: '#25D366' }} />
                      <Typography variant="body2" sx={{ fontSize: 12, color: "text.secondary", bgcolor: "background.paper", px: 1, py: 0.5, borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                        {grupo.prefix} {upperValue}
                      </Typography>
                      <IconButton
                        size="small"
                        onClick={() => {
                          navigator.clipboard.writeText(upperValue);
                        }}
                      title="Copiar nome do grupo"
                      sx={{ p: 0.5 }}
                    >
                      <ContentCopyIcon sx={{ fontSize: 14 }} />
                    </IconButton>
                  </Box>
                );
                })}
              </Box>
            )}

            {demanda.status && (() => {
              const sla = calcularSLA(demanda.status, demanda.atualizado_em || demanda.criadoEm);
              if (sla.atrasada) {
                return (
                  <Chip
                    icon={<AccessTimeIcon sx={{ fontSize: '14px !important' }} />}
                    label={`${sla.diasOcioso} dias sem atualização`}
                    size="small"
                    color="error"
                    variant="outlined"
                    sx={{
                      fontWeight: 700,
                      bgcolor: alpha("#d32f2f", 0.05),
                      alignSelf: "flex-start",
                      mt: 0.5
                    }}
                  />
                );
              }
              return null;
            })()}
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
      <InformacoesBasicas demanda={demanda} handleChange={handleChange} ufs={ufs} cidades={cidades} role={role} />

      {!["Nova", "Proposta"].includes(demanda.status || "") && (
        <Faturamento
          faturamentos={faturamentos} addFaturamento={addFaturamento} updateFaturamento={updateFaturamento}
          cancelarFaturamento={cancelarFaturamento} removerFaturamento={removerFaturamento}
          valorTotalDemanda={valorTotalDemanda} valorTotalFaturado={valorTotalFaturado}
          diferencaFaturamento={diferencaFaturamento} is100Porcento={is100Porcento}
        />
      )}

      {!["Nova", "Proposta"].includes(demanda.status || "") && role !== "user" && (
        <ResumoFinanceiro
          loadingFinanceiro={loadingFinanceiro} movimentosDemanda={movimentosDemanda}
          totalDespesas={totalDespesas} valorTotalFaturado={valorTotalFaturado} saldoDemanda={saldoDemanda}
          ultimaDataAtualizacao={ultimaDataAtualizacao} contasEmAberto={contasEmAberto} totalBoletosEmAberto={totalBoletosEmAberto}
        />
      )}

      {/* BOTÃO FLUTUANTE DE SALVAR (Exibido apenas quando há alterações pendentes) */}
      <Zoom in={temAlteracoes} unmountOnExit>
        <Fab
          variant="extended"
          color="primary"
          onClick={handleSave}
          disabled={saving}
          sx={{
            position: "fixed",
            bottom: { xs: 80, md: 32 },
            right: { xs: 16, md: 32 },
            zIndex: 1200,
            px: 3,
            fontWeight: 700,
            boxShadow: 6,
          }}
        >
          {saving ? (
            <CircularProgress size={20} color="inherit" sx={{ mr: 1 }} />
          ) : (
            <SaveIcon sx={{ mr: 1 }} />
          )}
          {saving ? "Salvando..." : "Salvar Alterações"}
        </Fab>
      </Zoom>

      {/* MODAL DE CONFIRMAÇÃO AO SAIR COM ALTERAÇÕES NÃO SALVAS */}
      <Dialog open={modalSairOpen} onClose={() => setModalSairOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ display: "flex", alignItems: "center", gap: 1, fontWeight: "bold", color: "warning.main" }}>
          <WarningAmberIcon color="warning" />
          Alterações não salvas
        </DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary">
            Existem dados digitados que ainda não foram salvos. Deseja realmente voltar ou sair da página e descartar essas alterações?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setModalSairOpen(false)} variant="contained" color="primary">
            Continuar Editando
          </Button>
          <Button onClick={confirmarSaidaSemSalvar} color="error" variant="outlined">
            Sair sem Salvar
          </Button>
        </DialogActions>
      </Dialog>

      {/* NOTIFICAÇÃO DE FEEDBACK AO SALVAR */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: "100%", fontWeight: 600 }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}