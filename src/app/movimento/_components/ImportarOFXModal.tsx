"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  CircularProgress,
  Alert,
  List,
  ListItem,
  ListItemText,
} from "@mui/material";
import { UploadFile as UploadIcon } from "@mui/icons-material";
import { useAuth } from "@/contexts/AuthContext";
import { importarLoteOFX } from "@/services/movimentosService";

const BANCOS_MAP: Record<string, string> = {
  "001": "Banco do Brasil",
  "104": "Caixa Econômica",
  "237": "Bradesco",
  "341": "Itaú",
  "033": "Santander",
  "260": "Nubank",
  "077": "Banco Inter",
  "336": "C6 Bank",
  "041": "Banrisul",
  "748": "Sicredi",
  "756": "Sicoob",
};

interface ImportarOFXModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (ano: string, mes: string) => void;
}

// 👇 Função "Blindada" para ler valores financeiros de bancos diferentes
const parseOfxAmount = (amountStr: string | null): number => {
  if (!amountStr) return 0;

  // 1. Remove tudo que não for número, ponto, vírgula ou sinal de menos
  let cleanStr = amountStr.replace(/[^\d.,-]/g, "");

  // 2. Descobre quem é o separador decimal olhando a última posição
  const lastDot = cleanStr.lastIndexOf(".");
  const lastComma = cleanStr.lastIndexOf(",");

  if (lastComma > lastDot) {
    // A vírgula está depois do ponto (Ex: 1.500,50 ou apenas 150,50) -> Vírgula é o decimal
    // Removemos os pontos (separadores de milhar) e trocamos a vírgula por ponto
    cleanStr = cleanStr.replace(/\./g, "").replace(",", ".");
  } else if (lastDot > lastComma) {
    // O ponto está depois da vírgula (Ex: 1,500.50 ou apenas 150.50) -> Ponto é o decimal
    // Apenas removemos as vírgulas (separadores de milhar)
    cleanStr = cleanStr.replace(/,/g, "");
  }

  // 3. Agora o JavaScript entende perfeitamente!
  return parseFloat(cleanStr) || 0;
};

export default function ImportarOFXModal({
  open,
  onClose,
  onSuccess,
}: ImportarOFXModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [resultado, setResultado] = useState<{
    inseridos: number;
    duplicados: number;
    erros: number;
    ultimoAno: string;
    ultimoMes: string;
  } | null>(null);

  const getTag = (tag: string, text: string) => {
    const regex = new RegExp(`<${tag}>([^<\\r\\n]+)`, "i");
    const match = text.match(regex);
    return match ? match[1].trim() : null;
  };

  const processarArquivos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !user) return;

    setLoading(true);
    setResultado(null);

    let totalInseridos = 0,
      totalDuplicados = 0,
      totalErros = 0;
    let refAno = "",
      refMes = "";

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const text = await file.text();

        const bankIdRaw = getTag("BANKID", text);
        const bankId = bankIdRaw
          ? bankIdRaw.replace(/^0+/, "").padStart(3, "0")
          : "";
        const nomeBanco =
          BANCOS_MAP[bankId] || `Banco Desconhecido (${bankId || "Sem ID"})`;

        const trnRegex = /<STMTTRN>([\s\S]*?)<\/STMTTRN>/gi;
        let match;
        const loteTransacoes: any[] = [];

        while ((match = trnRegex.exec(text)) !== null) {
          const trnBlock = match[1];
          const fitid = getTag("FITID", trnBlock);
          const amount = getTag("TRNAMT", trnBlock);
          const dtPosted = getTag("DTPOSTED", trnBlock);
          const memo =
            getTag("MEMO", trnBlock) ||
            getTag("NAME", trnBlock) ||
            "Sem descrição";

          if (!fitid || !amount || !dtPosted) {
            totalErros++;
            continue;
          }

          const year = dtPosted.substring(0, 4);
          const month = dtPosted.substring(4, 6);
          const day = dtPosted.substring(6, 8);

          refAno = year;
          refMes = month;

          // 👇 Passando o valor sujo para o nosso novo formatador
          const valorFormatado = parseOfxAmount(amount);

          loteTransacoes.push({
            fitid,
            banco: nomeBanco,
            descricao: memo,
            data: `${year}-${month}-${day}`,
            valor: valorFormatado, // Valor perfeitamente limpo com os centavos
            criado_em: new Date().toISOString(),
            criado_por: user.id,
            favorecido: "",
            classificacao: "",
            observacao: "",
            demanda: null,
          });
        }

        if (loteTransacoes.length > 0) {
          const { data, error } = await importarLoteOFX(loteTransacoes);

          if (error) {
            console.error("Erro ao inserir lote:", error);
            totalErros += loteTransacoes.length;
          } else {
            const inseridosNesteLote = data?.length || 0;
            totalInseridos += inseridosNesteLote;
            totalDuplicados += loteTransacoes.length - inseridosNesteLote;
          }
        }
      }
    } catch (error) {
      console.error("Erro geral no OFX:", error);
      totalErros++;
    } finally {
      setResultado({
        inseridos: totalInseridos,
        duplicados: totalDuplicados,
        erros: totalErros,
        ultimoAno: refAno,
        ultimoMes: refMes,
      });
      setLoading(false);
      e.target.value = "";
    }
  };

  const handleClose = () => {
    if (resultado && resultado.inseridos > 0 && onSuccess) {
      onSuccess(resultado.ultimoAno, resultado.ultimoMes);
    }
    setResultado(null);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 800 }}>Importar Extrato (OFX)</DialogTitle>
      <DialogContent>
        {!loading && !resultado && (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              p: 4,
              border: "2px dashed #ccc",
              borderRadius: 2,
              mt: 1,
            }}
          >
            <UploadIcon sx={{ fontSize: 60, color: "text.secondary", mb: 2 }} />
            <Typography variant="body1" align="center" gutterBottom>
              Selecione um ou mais arquivos <b>.ofx</b> gerados pelo seu banco.
            </Typography>
            <Button
              variant="contained"
              component="label"
              size="large"
              sx={{ mt: 2 }}
            >
              Escolher Arquivos OFX
              <input
                type="file"
                hidden
                multiple
                accept=".ofx"
                onChange={processarArquivos}
              />
            </Button>
          </Box>
        )}

        {loading && (
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              p: 5,
              gap: 2,
            }}
          >
            <CircularProgress />
            <Typography variant="body1" color="text.secondary">
              Processando arquivos e salvando no banco...
            </Typography>
          </Box>
        )}

        {resultado && (
          <Box sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 2 }}>
            <Alert
              severity={resultado.inseridos > 0 ? "success" : "info"}
              sx={{ fontWeight: "bold" }}
            >
              {resultado.inseridos > 0
                ? "Importação concluída!"
                : "Nenhum dado novo encontrado."}
            </Alert>
            <List sx={{ bgcolor: "#f8f9fa", borderRadius: 2 }}>
              <ListItem>
                <ListItemText primary="Novos registros importados" />
                <Typography variant="h6" color="success.main" fontWeight="bold">
                  {resultado.inseridos}
                </Typography>
              </ListItem>
              <ListItem>
                <ListItemText primary="Registros já existentes (Ignorados)" />
                <Typography
                  variant="h6"
                  color="text.secondary"
                  fontWeight="bold"
                >
                  {resultado.duplicados}
                </Typography>
              </ListItem>
              {resultado.erros > 0 && (
                <ListItem>
                  <ListItemText primary="Erros de processamento" />
                  <Typography variant="h6" color="error.main" fontWeight="bold">
                    {resultado.erros}
                  </Typography>
                </ListItem>
              )}
            </List>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={handleClose} variant="outlined" disabled={loading}>
          {resultado ? "Fechar" : "Cancelar"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
