// src/app/contas-a-pagar/_components/ModalEditarConta.tsx
import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  TextField,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Divider,
  Chip,
  Typography,
  Button,
  CircularProgress,
} from "@mui/material";
import {
  CheckCircle as CheckIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material";
import { IContaAPagar } from "@/types/conta";
// Importe a função de excluir aqui
import {
  atualizarContaAPagar,
  excluirContaAPagar,
} from "@/services/contasService";

const TIPOS = [
  { sigla: "BLT", nome: "Boleto" },
  { sigla: "PIX", nome: "Pix" },
  { sigla: "CRD", nome: "Cartão de Crédito" },
  { sigla: "TEF", nome: "Transf. Mesmo Banco" },
  { sigla: "TED", nome: "Transf. Outro Banco" },
];

export function ModalEditarConta({
  open,
  onClose,
  conta,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  conta: IContaAPagar | null;
  onSuccess: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [contaEditando, setContaEditando] = useState<IContaAPagar | null>(null);
  const [novoArqBoleto, setNovoArqBoleto] = useState<File | null>(null);
  const [novoArqNF, setNovoArqNF] = useState<File | null>(null);

  useEffect(() => {
    if (conta) setContaEditando({ ...conta, valor: Number(conta.valor) });
    setNovoArqBoleto(null);
    setNovoArqNF(null);
  }, [conta]);

  if (!contaEditando) return null;

  const formatarMoeda = (val: any) =>
    val
      ? Number(val).toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      : "";
  const converterDecimal = (val: string) => {
    const dig = val.replace(/\D/g, "");
    return dig ? (Number(dig) / 100).toFixed(2) : "";
  };

  // Função para enviar e-mail de atualização
  const enviarEmailAtualizacao = async (dados: IContaAPagar) => {
    try {
      await fetch("/api/pagamentos/editar", {
        // Rota nova aqui
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dados }), // Enviamos o objeto dados
      });
    } catch (e) {
      console.error("Erro ao disparar API de email", e);
    }
  };

  const handleSave = async () => {
    if (
      !contaEditando.fornecedor ||
      !contaEditando.valor ||
      !contaEditando.data_vencimento
    )
      return alert("Preencha os campos obrigatórios.");
    try {
      setSaving(true);
      await atualizarContaAPagar(
        contaEditando,
        novoArqBoleto || undefined,
        novoArqNF || undefined,
      );

      // Dispara o e-mail logo após salvar
      await enviarEmailAtualizacao(contaEditando);

      onSuccess();
      onClose();
    } catch (error) {
      alert("Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Tem certeza que deseja remover este pagamento?"))
      return;
    try {
      setDeleting(true);
      await excluirContaAPagar(contaEditando.id!);
      onSuccess();
      onClose();
    } catch (error) {
      alert("Erro ao excluir.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={() => !saving && !deleting && onClose()}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle sx={{ fontWeight: "bold" }}>
        Editar Conta{" "}
        {contaEditando.parcela !== "Única" ? `(${contaEditando.parcela})` : ""}
      </DialogTitle>
      <DialogContent
        dividers
        sx={{ display: "flex", flexDirection: "column", gap: 3 }}
      >
        <Box
          sx={{
            display: "flex",
            gap: 2,
            flexWrap: { xs: "wrap", sm: "nowrap" },
          }}
        >
          <TextField
            label="Fornecedor / Descrição"
            fullWidth
            value={contaEditando.fornecedor}
            onChange={(e) =>
              setContaEditando({ ...contaEditando, fornecedor: e.target.value })
            }
            required
          />

          <TextField
            label="Demanda (Nº)"
            fullWidth
            value={contaEditando.demanda_numero || ""}
            onChange={(e) =>
              setContaEditando({
                ...contaEditando,
                demanda_numero: e.target.value,
              })
            }
          />
        </Box>
        {/* <TextField select label="Tipo" fullWidth value={contaEditando.tipo} onChange={(e) => setContaEditando({...contaEditando, tipo: e.target.value})}>
          {TIPOS.map(t => <MenuItem key={t.sigla} value={t.sigla}>{t.sigla} - {t.nome}</MenuItem>)}
        </TextField> */}
        <FormControlLabel
          control={
            <Checkbox
              checked={contaEditando.parcela === "Recorrente"}
              onChange={(e) =>
                setContaEditando({
                  ...contaEditando,
                  parcela: e.target.checked ? "Recorrente" : "Única",
                })
              }
              color="secondary"
            />
          }
          label="Este é um pagamento Recorrente"
        />
        <Box
          sx={{
            display: "flex",
            gap: 2,
            flexWrap: { xs: "wrap", sm: "nowrap" },
          }}
        >
          <TextField
            label="Valor (R$)"
            fullWidth
            required
            value={formatarMoeda(contaEditando.valor)}
            onChange={(e) =>
              setContaEditando({
                ...contaEditando,
                valor: Number(converterDecimal(e.target.value)),
              })
            }
          />
          <TextField
            type="date"
            label="Vencimento"
            fullWidth
            required
            InputLabelProps={{ shrink: true }}
            value={contaEditando.data_vencimento}
            onChange={(e) =>
              setContaEditando({
                ...contaEditando,
                data_vencimento: e.target.value,
              })
            }
          />
        </Box>
        <Divider sx={{ my: 1 }}>
          <Chip label="Gerenciar Anexos" />
        </Divider>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            p: 1.5,
            border: "1px dashed #ccc",
            borderRadius: 1,
            bgcolor: contaEditando.arquivo_boleto ? "#f0f8ff" : "transparent",
          }}
        >
          <Typography variant="body2">
            {contaEditando.arquivo_boleto
              ? "✅ Boleto Existente"
              : "❌ Sem Boleto"}
          </Typography>
          <Button
            variant={contaEditando.arquivo_boleto ? "outlined" : "contained"}
            component="label"
            size="small"
          >
            {novoArqBoleto
              ? novoArqBoleto.name
              : contaEditando.arquivo_boleto
                ? "Substituir"
                : "Enviar"}
            <input
              type="file"
              hidden
              accept="application/pdf"
              onChange={(e) => setNovoArqBoleto(e.target.files?.[0] || null)}
            />
          </Button>
        </Box>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            p: 1.5,
            border: "1px dashed #ccc",
            borderRadius: 1,
            bgcolor: contaEditando.arquivo_nf ? "#fff0f5" : "transparent",
          }}
        >
          <Typography variant="body2">
            {contaEditando.arquivo_nf
              ? "✅ Nota Fiscal Existente"
              : "❌ Sem Nota Fiscal"}
          </Typography>
          <Button
            color="secondary"
            variant={contaEditando.arquivo_nf ? "outlined" : "contained"}
            component="label"
            size="small"
          >
            {novoArqNF
              ? novoArqNF.name
              : contaEditando.arquivo_nf
                ? "Substituir"
                : "Enviar"}
            <input
              type="file"
              hidden
              accept="application/pdf"
              onChange={(e) => setNovoArqNF(e.target.files?.[0] || null)}
            />
          </Button>
        </Box>
      </DialogContent>
      <DialogActions
        sx={{
          display: "flex",
          p: 3,
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 2,
        }}
      >
        {/* BOTÃO REMOVER (LADO ESQUERDO) */}
        <Button
          onClick={handleDelete}
          color="error"
          variant="contained"
          disabled={saving || deleting}
          startIcon={
            deleting ? (
              <CircularProgress size={20} color="error" />
            ) : (
              <DeleteIcon />
            )
          }
        >
          {deleting ? "Removendo..." : "Remover"}
        </Button>
        <Button variant="contained" onClick={onClose} color="inherit" disabled={saving || deleting}>
          Cancelar
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          color="primary"
          disabled={saving || deleting}
          startIcon={
            saving ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              <CheckIcon />
            )
          }
        >
          {saving ? "Salvando..." : "Salvar"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
