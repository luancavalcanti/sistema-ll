"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Paper,
  MenuItem,
  Divider,
  Snackbar,
  Alert,
  Tooltip,
  IconButton,
} from "@mui/material";
import {
  Save as SaveIcon,
  Close as CloseIcon,
  VisibilityOff as VisibilityOffIcon,
  Delete as DeleteIcon,
  AutoFixHigh as AutoModeIcon,
} from "@mui/icons-material";
import { IMovimento } from "@/types/movimento";
import {
  obterMovimentoPorId,
  atualizarMovimento,
  excluirMovimento,
} from "@/services/movimentosService";
import { supabase } from "@/lib/supabase";
import { salvarRegra } from "@/services/regrasClassificacaoService";

const TIPOS_DESPESA = ["Fixa", "Obra", "Tributo", "Empréstimo", "Outra"];
const TIPOS_ENTRADA = [
  "Crédito Cliente",
  "Empréstimo",
  "Aporte sócio",
  "Estorno Obra",
  "Estorno outros",
  "Rendimento",
  "Outros",
];

interface EditarMovimentoModalProps {
  open: boolean;
  movimentoId: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditarMovimentoModal({
  open,
  movimentoId,
  onClose,
  onSuccess,
}: EditarMovimentoModalProps) {
  const [movimento, setMovimento] = useState<
    Partial<IMovimento> & { nota_fiscal?: string }
  >({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [ocultando, setOcultando] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    msg: "",
    severity: "success" as "success" | "error" | "warning",
  });

  useEffect(() => {
    if (!open || !movimentoId) return;

    const fetchMovimento = async () => {
      setLoading(true);
      try {
        const dados = await obterMovimentoPorId(movimentoId);
        if (dados) {
          setMovimento(dados);
        } else {
          setSnackbar({
            open: true,
            msg: "Movimento não encontrado.",
            severity: "error",
          });
        }
      } catch (error) {
        console.error("Erro ao carregar o movimento:", error);
        setSnackbar({
          open: true,
          msg: "Erro ao carregar dados do movimento.",
          severity: "error",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchMovimento();
  }, [open, movimentoId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    setMovimento((prev) => {
      const updated = { ...prev, [name]: value };

      if (name === "classificacao") {
        if (value !== "Obra" && value !== "Estorno Obra") {
          updated.demanda = "";
        }
        if (value !== "Crédito Cliente") {
          updated.nota_fiscal = "";
        }
      }

      return updated;
    });
  };

  const handleSave = async () => {
    if (!movimentoId) return;
    setSaving(true);
    try {
      await atualizarMovimento(movimentoId, movimento);
      onSuccess();
      onClose();
    } catch (error) {
      console.error("Erro ao salvar movimento:", error);
      setSnackbar({
        open: true,
        msg: "Erro ao tentar salvar as alterações.",
        severity: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!movimentoId) return;
    if (
      window.confirm(
        `Tem certeza que deseja excluir este lançamento de R$ ${movimento.valor}? Esta ação não pode ser desfeita.`
      )
    ) {
      setDeleting(true);
      try {
        await excluirMovimento(movimentoId);
        onSuccess();
        onClose();
      } catch (error) {
        console.error("Erro ao excluir movimento:", error);
        setSnackbar({
          open: true,
          msg: "Erro ao tentar excluir o registro.",
          severity: "error",
        });
      } finally {
        setDeleting(false);
      }
    }
  };

  const handleOcultarRegistro = async () => {
    if (!movimento.descricao) return;
    setOcultando(true);

    try {
      const { error } = await supabase
        .from("config_ignorar")
        .insert([{ texto: movimento.descricao }]);

      if (error) {
        if (error.code === "23505") {
          setSnackbar({
            open: true,
            msg: "Esta descrição já está na sua lista de regras!",
            severity: "warning",
          });
        } else {
          throw error;
        }
      } else {
        setSnackbar({
          open: true,
          msg: "Registro ocultado com sucesso! Ele sumirá da listagem principal.",
          severity: "success",
        });
        onSuccess();
      }
    } catch (err) {
      console.error("Erro ao salvar regra:", err);
      setSnackbar({
        open: true,
        msg: "Erro ao tentar ocultar o registro.",
        severity: "error",
      });
    } finally {
      setOcultando(false);
    }
  };

  const handleCriarRegra = async () => {
    if (!movimento.descricao) return;

    try {
      await salvarRegra({
        descricao_original: movimento.descricao,
        favorecido: movimento.favorecido,
        classificacao: movimento.classificacao,
        observacao: movimento.observacao,
      });
      setSnackbar({
        open: true,
        msg: "Regra de auto-preenchimento salva com sucesso!",
        severity: "success",
      });
    } catch (error) {
      console.error("Erro ao salvar regra", error);
      setSnackbar({
        open: true,
        msg: "Erro ao salvar a regra.",
        severity: "error",
      });
    }
  };

  const dataExibicao = movimento.data
    ? movimento.data.split("-").reverse().join("/")
    : "";
  const valorExibicao = Number(movimento.valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
  const isDespesa = Number(movimento.valor) < 0;
  const isObraOuEstorno =
    movimento.classificacao === "Obra" ||
    movimento.classificacao === "Estorno Obra";
  const isCreditoCliente = movimento.classificacao === "Crédito Cliente";

  return (
    <>
      <Dialog
        open={open}
        onClose={() => !saving && !deleting && onClose()}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontWeight: 800,
          }}
        >
          Classificar Movimento
          <IconButton
            onClick={onClose}
            disabled={saving || deleting}
            size="small"
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
              <CircularProgress />
            </Box>
          ) : (
            <>
              {/* SEÇÃO 1: DADOS ORIGINAIS DO BANCO (Somente Leitura) */}
              <Paper
                elevation={0}
                sx={{
                  p: 3,
                  borderRadius: 2,
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                  bgcolor: "action.hover",
                  border: "1px solid",
                  borderColor: "divider",
                }}
              >
                <Typography
                  variant="subtitle2"
                  color="text.secondary"
                  sx={{ textTransform: "uppercase", fontWeight: "bold" }}
                >
                  Dados Originais do OFX
                </Typography>

                <Box sx={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                  <Box sx={{ flex: 1, minWidth: "120px" }}>
                    <Typography variant="caption" color="text.secondary">
                      Data
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {dataExibicao}
                    </Typography>
                  </Box>
                  <Box sx={{ flex: 1, minWidth: "120px" }}>
                    <Typography variant="caption" color="text.secondary">
                      Banco
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {movimento.banco}
                    </Typography>
                  </Box>
                  <Box sx={{ flex: 1, minWidth: "120px" }}>
                    <Typography variant="caption" color="text.secondary">
                      Valor
                    </Typography>
                    <Typography
                      variant="h6"
                      sx={{
                        fontWeight: 900,
                        color: isDespesa ? "error.main" : "success.main",
                        lineHeight: 1,
                      }}
                    >
                      {valorExibicao}
                    </Typography>
                  </Box>
                </Box>

                <Divider />

                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: 2,
                  }}
                >
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Descrição Original
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600 }}>
                      {movimento.descricao}
                    </Typography>
                  </Box>

                  <Button
                    variant="outlined"
                    color="secondary"
                    size="small"
                    startIcon={
                      ocultando ? (
                        <CircularProgress size={16} color="inherit" />
                      ) : (
                        <VisibilityOffIcon />
                      )
                    }
                    onClick={handleOcultarRegistro}
                    disabled={ocultando}
                    sx={{ borderRadius: 2 }}
                  >
                    Ocultar Registros Iguais
                  </Button>
                </Box>
              </Paper>

              {/* SEÇÃO 2: CAMPOS EDITÁVEIS */}
              <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 1,
                  }}
                >
                  <Typography
                    variant="h6"
                    sx={{ fontWeight: 700, color: "primary.main" }}
                  >
                    Classificação
                  </Typography>
                  <Tooltip title="Sempre que o banco enviar esta descrição, vamos preencher os campos abaixo automaticamente para você.">
                    <Button
                      variant="text"
                      color="primary"
                      size="small"
                      startIcon={<AutoModeIcon />}
                      onClick={handleCriarRegra}
                    >
                      Automatizar este preenchimento
                    </Button>
                  </Tooltip>
                </Box>

                <Box
                  sx={{
                    display: "flex",
                    gap: 2,
                    flexDirection: { xs: "column", sm: "row" },
                  }}
                >
                  <TextField
                    sx={{ flex: 2 }}
                    label={isDespesa ? "Favorecido" : "Origem / Cliente"}
                    name="favorecido"
                    value={movimento.favorecido || ""}
                    onChange={handleChange}
                    placeholder="Nome da empresa ou pessoa"
                  />

                  <TextField
                    sx={{ flex: 1, minWidth: "200px" }}
                    select
                    label={isDespesa ? "Tipo de Despesa" : "Tipo da Entrada"}
                    name="classificacao"
                    value={movimento.classificacao || ""}
                    onChange={handleChange}
                  >
                    <MenuItem value="">
                      <em>Nenhum</em>
                    </MenuItem>
                    {(isDespesa ? TIPOS_DESPESA : TIPOS_ENTRADA).map((tipo) => (
                      <MenuItem key={tipo} value={tipo}>
                        {tipo}
                      </MenuItem>
                    ))}
                  </TextField>
                </Box>

                {isObraOuEstorno && (
                  <TextField
                    sx={{ width: { xs: "100%", sm: "50%" } }}
                    label="Número da Demanda"
                    name="demanda"
                    value={movimento.demanda || ""}
                    onChange={handleChange}
                    placeholder="Ex: 2026001"
                    helperText="Vincule a uma demanda específica"
                  />
                )}

                {isCreditoCliente && (
                  <TextField
                    sx={{ width: { xs: "100%", sm: "50%" } }}
                    label="Número da Nota Fiscal"
                    name="nota_fiscal"
                    value={movimento.nota_fiscal || ""}
                    onChange={handleChange}
                    placeholder="Ex: 2600000000028"
                    helperText="Informe os 13 dígitos numéricos da NF"
                  />
                )}

                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Observação (Substitui a descrição original na listagem)"
                  name="observacao"
                  value={movimento.observacao || ""}
                  onChange={handleChange}
                  placeholder="Adicione notas, justificativas ou um título mais claro para este movimento..."
                />
              </Box>
            </>
          )}
        </DialogContent>

        <DialogActions
          sx={{
            p: 2,
            display: "flex",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 1,
          }}
        >
          <Button
            variant="outlined"
            color="error"
            startIcon={
              deleting ? (
                <CircularProgress size={18} color="inherit" />
              ) : (
                <DeleteIcon />
              )
            }
            onClick={handleDelete}
            disabled={loading || saving || deleting}
            sx={{ borderRadius: 2, fontWeight: "bold" }}
          >
            {deleting ? "Excluindo..." : "Excluir"}
          </Button>

          <Box sx={{ display: "flex", gap: 1 }}>
            <Button
              onClick={onClose}
              disabled={saving || deleting}
              sx={{ borderRadius: 2 }}
            >
              Cancelar
            </Button>
            <Button
              variant="contained"
              color="primary"
              startIcon={
                saving ? (
                  <CircularProgress size={18} color="inherit" />
                ) : (
                  <SaveIcon />
                )
              }
              onClick={handleSave}
              disabled={loading || saving || deleting}
              sx={{ borderRadius: 2, fontWeight: "bold" }}
            >
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </Box>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          severity={snackbar.severity}
          sx={{ width: "100%", fontWeight: "bold" }}
        >
          {snackbar.msg}
        </Alert>
      </Snackbar>
    </>
  );
}
