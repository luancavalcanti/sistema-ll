// src/app/contas-a-pagar/_components/ContaCard.tsx
import React from "react";
import {
  Box,
  Typography,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  Button,
} from "@mui/material";
import {
  Edit as EditIcon,
  PictureAsPdf as PdfIcon,
  CheckCircle as CheckIcon,
  DoneAll as DoneAllIcon,
  Autorenew as AutorenewIcon,
} from "@mui/icons-material";
import { IContaAPagar } from "@/types/conta";
import { obterUrlSeguraArquivo } from "@/services/contasService";

interface Props {
  conta: IContaAPagar;
  abaAtual: number;
  onEdit: (conta: IContaAPagar) => void;
  onBaixa: (conta: IContaAPagar) => void;
}

export function ContaCard({ conta, abaAtual, onEdit, onBaixa }: Props) {
  const formatarMoeda = (valor: any) =>
    Number(valor).toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const abrirAnexo = async (caminho: string) => {
    const url = await obterUrlSeguraArquivo(caminho);
    if (url) window.open(url, "_blank");
    else alert("Erro ao abrir arquivo.");
  };

  const getStatusVencimento = (dataVencimento: string, statusBanco: string) => {
    if (statusBanco === "Pago")
      return { label: "Pago", color: "success" as const };
    if (!dataVencimento)
      return { label: "Sem Data", color: "default" as const };

    const hoje = new Date();
    const hojeStr = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, "0")}-${String(hoje.getDate()).padStart(2, "0")}`;
    const amanha = new Date();
    amanha.setDate(amanha.getDate() + 1);
    const amanhaStr = `${amanha.getFullYear()}-${String(amanha.getMonth() + 1).padStart(2, "0")}-${String(amanha.getDate()).padStart(2, "0")}`;

    if (dataVencimento < hojeStr)
      return { label: "Vencido", color: "error" as const };
    if (dataVencimento === hojeStr)
      return { label: "Vence Hoje", color: "warning" as const };
    if (dataVencimento === amanhaStr)
      return { label: "Vence Amanhã", color: "info" as const };
    return { label: "A Vencer", color: "success" as const };
  };

  const status = getStatusVencimento(
    conta.data_vencimento,
    conta.status || "Pendente",
  );

  return (
    <Paper
      onClick={() => onEdit(conta)}
      sx={{
        p: 3,
        borderRadius: 2,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 2,
        borderLeft: "6px solid",
        borderColor: abaAtual === 1 ? "success.main" : `${status.color}.main`,
        opacity: abaAtual === 1 ? 0.85 : 1,
        cursor: "pointer",
      }}
    >
      <Box>
        <Typography
          variant="h6"
          sx={{
            fontWeight: "bold",
            display: "flex",
            alignItems: "center",
            gap: 1,
            flexWrap: "wrap",
          }}
        >
          {conta.fornecedor}
          {conta.parcela === "Recorrente" ? (
            <Chip
              icon={<AutorenewIcon />}
              label="Recorrente"
              size="small"
              color="secondary"
              variant="outlined"
              sx={{ fontWeight: "bold", ml: 1 }}
            />
          ) : (
            conta.parcela !== "Única" && (
              <Typography component="span" variant="body2" color="primary">
                ({conta.parcela})
              </Typography>
            )
          )}
          <Chip
            label={status.label}
            size="small"
            color={status.color}
            sx={{ fontWeight: "bold", ml: 1 }}
          />
          {conta.demanda_numero && (
            <Chip
              label={`Demanda: ${conta.demanda_numero}`}
              size="small"
              variant="outlined"
            />
          )}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Vencimento: {conta.data_vencimento.split("-").reverse().join("/")} |
          Tipo: {conta.tipo}
        </Typography>
      </Box>

      <Box
        sx={{ display: "flex", alignItems: "center", gap: 3, flexWrap: "wrap", justifyContent: "space-between", width: { xs: "100%", sm: "100%", md: "auto" } }}
      >
        <Typography
          variant="h6"
          sx={{
            fontWeight: "bold",
            color: abaAtual === 1 ? "success.main" : "text.primary",
          }}
        >
          R$ {formatarMoeda(conta.valor)}
        </Typography>

        <Box
          sx={{
            display: "flex",
            gap: 1,
            alignItems: "center",
            flexWrap: "wrap",
          }}
        >
          {conta.arquivo_boleto && (
            <Tooltip title="Ver Boleto">
              <IconButton
                color="primary"
                onClick={(e) => {
                  e.stopPropagation()
                  abrirAnexo(conta.arquivo_boleto as string)
                }}
              >
                <PdfIcon />
              </IconButton>
            </Tooltip>
          )}
          {conta.arquivo_nf && (
            <Tooltip title="Ver Nota Fiscal">
              <IconButton
                color="secondary"
                onClick={(e) => {
                  e.stopPropagation()
                  abrirAnexo(conta.arquivo_nf as string)
                }}
              >
                <PdfIcon />
              </IconButton>
            </Tooltip>
          )}

          {abaAtual === 0 ? (
            <Button
              variant="contained"
              color="success"
              startIcon={<CheckIcon />}
              sx={{ ml: 2, borderRadius: 2 }}
              onClick={(e) => {
                e.stopPropagation()
                onBaixa(conta)
              }}
            >
              Dar Baixa
            </Button>
          ) : (
            <Chip
              icon={<DoneAllIcon />}
              label="Concluído"
              color="success"
              variant="outlined"
              sx={{ ml: 2, fontWeight: "bold", border: "none" }}
            />
          )}
        </Box>
      </Box>
    </Paper>
  );
}
