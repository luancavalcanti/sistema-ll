"use client";

import React, { useState } from "react";
import { Button, CircularProgress } from "@mui/material";
import { PictureAsPdf as PdfIcon } from "@mui/icons-material";
import { gerarRelatorioContabilPDF } from "./gerarRelatorioContabilPDF";
import { INotaFiscalFlat } from "./NotaFiscalCard";

interface BotaoBaixarPDFProps {
  mes: string;
  ano: string;
  faturadas: INotaFiscalFlat[];
  creditadas: INotaFiscalFlat[];
  comDesconto: INotaFiscalFlat[];
}

export default function BotaoBaixarPDF({ mes, ano, faturadas, creditadas, comDesconto }: BotaoBaixarPDFProps) {
  const [gerandoPdf, setGerandoPdf] = useState(false);

  const handleGerarPDF = async () => {
    setGerandoPdf(true);
    try {
      await gerarRelatorioContabilPDF(mes, ano, faturadas, creditadas, comDesconto);
    } catch (error) {
      console.error("Erro ao gerar PDF:", error);
      alert("Ocorreu um erro ao gerar o documento.");
    } finally {
      setGerandoPdf(false);
    }
  };

  return (
    <Button 
      onClick={handleGerarPDF} 
      variant="contained" 
      color="primary" 
      disabled={gerandoPdf}
      startIcon={gerandoPdf ? <CircularProgress size={20} color="inherit" /> : <PdfIcon />}
      sx={{ minWidth: 140 }}
    >
      {gerandoPdf ? "Gerando..." : "Baixar PDF"}
    </Button>
  );
}