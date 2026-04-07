// src/app/contas-a-pagar/_components/ModalCriarConta.tsx
import React, { useState } from "react";
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
  Paper,
  Typography,
  Button,
  CircularProgress,
} from "@mui/material";
import {
  CloudUpload as UploadIcon,
  AttachMoney as MoneyIcon,
} from "@mui/icons-material";
import { IContaAPagar } from "@/types/conta";
import { criarContaAPagar } from "@/services/contasService";

const TIPOS = [
  { sigla: "BLT", nome: "Boleto" },
  { sigla: "PIX", nome: "Pix" },
  { sigla: "CRD", nome: "Cartão de Crédito" },
  { sigla: "TEF", nome: "Transf. Mesmo Banco" },
  { sigla: "TED", nome: "Transf. Outro Banco" },
];

export function ModalCriarConta({
  open,
  onClose,
  onSuccess,
  userId,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userId: string;
}) {
  const [saving, setSaving] = useState(false);
  const [numParcelas, setNumParcelas] = useState(1);
  const [dadosGerais, setDadosGerais] = useState({
    fornecedor: "",
    demanda_numero: "",
    tipo: "BLT",
    recorrente: false,
  });
  const [parcelas, setParcelas] = useState([
    {
      valor: "",
      vencimento: "",
      arquivoBoleto: null as File | null,
      arquivoNF: null as File | null,
    },
  ]);

  const formatarMoeda = (valor: unknown) =>
    valor
      ? Number(valor).toLocaleString("pt-BR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })
      : "";
  const converterDecimal = (val: string) => {
    const dig = val.replace(/\D/g, "");
    return dig ? (Number(dig) / 100).toFixed(2) : "";
  };

  const calcularProximo = (data: string, add: number) => {
    if (!data) return "";
    const [a, m, d] = data.split("-").map(Number);
    const dt = new Date(a, m - 1 + add, d);
    const mesEsp = (m - 1 + add) % 12;
    if (dt.getMonth() !== (mesEsp < 0 ? mesEsp + 12 : mesEsp)) dt.setDate(0);
    return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
  };

  const handleNumParcelasChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const n = parseInt(e.target.value) || 1;
    setNumParcelas(n);
    setParcelas(
      Array.from({ length: n }, (_, i) => ({
        valor: parcelas[i]?.valor || "",
        vencimento:
          parcelas[i]?.vencimento ||
          (parcelas[0]?.vencimento
            ? calcularProximo(parcelas[0].vencimento, i)
            : ""),
        arquivoBoleto: parcelas[i]?.arquivoBoleto || null,
        arquivoNF: i === 0 ? parcelas[0]?.arquivoNF || null : null,
      })),
    );
  };

  const updateParcela = (index: number, field: string, value: string | File | null) => {
    const lista = [...parcelas];
    lista[index] = { ...lista[index], [field]: value };
    if (
      index === 0 &&
      field === "vencimento" &&
      value &&
      !dadosGerais.recorrente
    ) {
      for (let i = 1; i < lista.length; i++)
        lista[i].vencimento = calcularProximo(value as string, i);
    }
    setParcelas(lista);
  };

  const handleSave = async () => {
    if (!dadosGerais.fornecedor) return alert("Preencha o Fornecedor!");
    if (parcelas.some((p) => !p.valor || !p.vencimento))
      return alert("Preencha Valor e Vencimento de todas as parcelas.");

    try {
      setSaving(true);
      for (let i = 0; i < parcelas.length; i++) {
        const p = parcelas[i];
        const contaFinal: IContaAPagar = {
          ...dadosGerais,
          valor: parseFloat(p.valor),
          data_vencimento: p.vencimento,
          parcela: dadosGerais.recorrente
            ? "Recorrente"
            : numParcelas > 1
              ? `${i + 1}/${numParcelas}`
              : "Única",
          status: "Pendente",
        };

        // 1. Salva no banco e faz o upload dos PDFs
        await criarContaAPagar(
          contaFinal,
          userId,
          p.arquivoBoleto || undefined,
          p.arquivoNF || undefined,
        );

        // 2. Dispara o e-mail avisando que o registro foi criado
        try {
          await fetch("/api/pagamentos/novo", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(contaFinal),
          });
        } catch (emailErr) {
          console.error("Falha ao enviar o e-mail de notificação:", emailErr);
          // Não damos throw aqui para não interromper o salvamento das próximas parcelas
        }
      }

      // Limpa o formulário e fecha
      setDadosGerais({
        fornecedor: "",
        demanda_numero: "",
        tipo: "BLT",
        recorrente: false,
      });
      setNumParcelas(1);
      setParcelas([
        { valor: "", vencimento: "", arquivoBoleto: null, arquivoNF: null },
      ]);
      onSuccess();
      onClose();
    } catch (error) {
      alert("Erro ao salvar: "+error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={() => !saving && onClose()}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle sx={{ fontWeight: "bold" }}>Registrar Pagamento</DialogTitle>
      <DialogContent
        dividers
        sx={{ display: "flex", flexDirection: "column", gap: 3 }}
      >
        <Box
          sx={{
            display: "flex",
            gap: 2,
            flexDirection: { xs: "column", md: "row" },
          }}
        >
          <TextField
            label="Fornecedor / Descrição"
            fullWidth
            value={dadosGerais.fornecedor}
            onChange={(e) =>
              setDadosGerais({ ...dadosGerais, fornecedor: e.target.value })
            }
            required
          />
          <TextField
            label="Vínculo Demanda (Nº)"
            placeholder="Ex: 2025097"
            value={dadosGerais.demanda_numero}
            onChange={(e) =>
              setDadosGerais({ ...dadosGerais, demanda_numero: e.target.value })
            }
            sx={{ width: { md: "40%" } }}
          />
        </Box>
        <Box
          sx={{
            display: "flex",
            gap: 2,
            alignItems: "center",
            flexDirection: { xs: "column", md: "row" },
          }}
        >
          <TextField
            select
            label="Tipo de Pagamento"
            fullWidth
            value={dadosGerais.tipo}
            onChange={(e) =>
              setDadosGerais({ ...dadosGerais, tipo: e.target.value })
            }
          >
            {TIPOS.map((t) => (
              <MenuItem key={t.sigla} value={t.sigla}>
                {t.sigla} - {t.nome}
              </MenuItem>
            ))}
          </TextField>
          <FormControlLabel
            control={
              <Checkbox
                checked={dadosGerais.recorrente}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setDadosGerais({ ...dadosGerais, recorrente: checked });
                  if (checked) {
                    setNumParcelas(1);
                    setParcelas([parcelas[0]]);
                  }
                }}
                color="secondary"
              />
            }
            label={
              <Typography sx={{ fontWeight: "bold", color: "secondary.main" }}>
                Recorrente
              </Typography>
            }
            sx={{ width: "100%" }}
          />
          {!dadosGerais.recorrente && (
            <TextField
              label="Nº Parcelas"
              type="number"
              sx={{ width: { md: "30%" } }}
              value={numParcelas}
              onChange={handleNumParcelasChange}
              inputProps={{ min: 1 }}
            />
          )}
        </Box>
        <Divider sx={{ my: 1 }}>
          <Chip label={numParcelas > 1 ? "Detalhamento" : "Valores e Anexos"} />
        </Divider>

        {parcelas.map((p, index) => (
          <Paper
            key={index}
            variant="outlined"
            sx={{
              p: 2,
              bgcolor: "#fcfcfc",
              borderLeft: "4px solid",
              borderColor: "primary.main",
            }}
          >
            {numParcelas > 1 && !dadosGerais.recorrente && (
              <Typography
                variant="subtitle2"
                sx={{ mb: 2, color: "primary.main", fontWeight: "bold" }}
              >
                Parcela {index + 1}
              </Typography>
            )}
            <Box
              sx={{
                display: "flex",
                gap: 2,
                mb: 2,
                flexDirection: { xs: "column", sm: "row" },
              }}
            >
              <TextField
                label="Valor Base (R$)"
                fullWidth
                required
                value={formatarMoeda(p.valor)}
                onChange={(e) =>
                  updateParcela(
                    index,
                    "valor",
                    converterDecimal(e.target.value),
                  )
                }
              />
              <TextField
                type="date"
                label="Data de Vencimento"
                fullWidth
                required
                InputLabelProps={{ shrink: true }}
                value={p.vencimento}
                onChange={(e) =>
                  updateParcela(index, "vencimento", e.target.value)
                }
              />
            </Box>
            <Box
              sx={{
                display: "flex",
                gap: 2,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <Button
                variant="outlined"
                component="label"
                startIcon={<UploadIcon />}
                size="small"
              >
                {p.arquivoBoleto ? p.arquivoBoleto.name : "Anexar Boleto"}
                <input
                  type="file"
                  hidden
                  accept="application/pdf"
                  onChange={(e) =>
                    updateParcela(
                      index,
                      "arquivoBoleto",
                      e.target.files?.[0] || null,
                    )
                  }
                />
              </Button>
              {index === 0 && (
                <Button
                  variant="outlined"
                  color="secondary"
                  component="label"
                  startIcon={<UploadIcon />}
                  size="small"
                >
                  {p.arquivoNF ? p.arquivoNF.name : "Anexar NF"}
                  <input
                    type="file"
                    hidden
                    accept="application/pdf"
                    onChange={(e) =>
                      updateParcela(
                        index,
                        "arquivoNF",
                        e.target.files?.[0] || null,
                      )
                    }
                  />
                </Button>
              )}
            </Box>
          </Paper>
        ))}
      </DialogContent>
      <DialogActions sx={{ p: 3 }}>
        <Button onClick={onClose} color="inherit" disabled={saving}>
          Cancelar
        </Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={saving}
          startIcon={saving ? <CircularProgress size={20} /> : <MoneyIcon />}
        >
          {saving ? "Salvando..." : `Salvar`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
