import React from "react";
import { 
  Paper, Typography, Box, Button, TextField, IconButton, Alert, Tooltip 
} from "@mui/material";
import { 
  Add as AddIcon, 
  Block as BlockIcon, 
  Delete as DeleteIcon,
  Receipt as ReceiptIcon 
} from "@mui/icons-material";

// 👇 Importando o type oficial 
import { IFaturamento } from "@/types/faturamento"; 

interface FaturamentoProps {
  faturamentos: IFaturamento[];
  addFaturamento: () => void;
  updateFaturamento: (id: string, field: string, value: string | number | boolean) => void;
  cancelarFaturamento: (id: string) => void;
  removerFaturamento: (id: string) => void;
  valorTotalDemanda: number;
  valorTotalFaturado: number;
  diferencaFaturamento: number;
  is100Porcento: boolean;
}

export default function Faturamento({
  faturamentos, addFaturamento, updateFaturamento, cancelarFaturamento, removerFaturamento,
  valorTotalDemanda, valorTotalFaturado, diferencaFaturamento, is100Porcento
}: FaturamentoProps) {

  // --- MÁSCARA INTELIGENTE PARA O GRID ---
  const handleCurrencyChange = (id: string, field: string, value: string) => {
    const apenasDigitos = value.replace(/\D/g, "");
    
    if (!apenasDigitos) {
      updateFaturamento(id, field, "");
      return;
    }

    const valorDecimal = (Number(apenasDigitos) / 100).toFixed(2);
    updateFaturamento(id, field, valorDecimal);
  };

  const formatarParaExibicao = (valor?: string | boolean | number) => {
    if (valor === undefined || valor === null || valor === "") return "";
    return Number(valor).toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // --- LÓGICA DO LINK DA NOTA FISCAL ---
  const abrirNotaFiscal = (nota_fiscal?: string, codigo_verificacao?: string) => {
    if (!nota_fiscal || !codigo_verificacao) return;

    const notaLimpa = String(nota_fiscal).trim();
    const codigoLimpo = String(codigo_verificacao).trim();

    // Se o código for muito longo (Chave de 50 dígitos) ou a nota for gigante, é o Padrão Novo (Nacional)
    if (codigoLimpo.length > 20 || notaLimpa.length > 9) {
      window.open(`https://www.nfse.gov.br/ConsultaPublica/?tpc=1&chave=${codigoLimpo}`, "_blank");
    } else {
      // Padrão Antigo (Prefeitura)
      const notaPadded = notaLimpa.padStart(9, '0'); // Preenche com zeros até ter 9 dígitos (ex: 000001289)
      window.open(`https://www.tinus.com.br/csp/OLINDA/portal/nfsepdf.csp?WPARAM=0448509-${notaPadded}-${codigoLimpo}`, "_blank");
    }
  };

  return (
    <Paper sx={{ p: 4, borderRadius: 3, display: "flex", flexDirection: "column", gap: 3 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Typography variant="h6" sx={{ fontWeight: 700, color: "primary.main" }}>
          Faturamento
        </Typography>
        <Button variant="outlined" startIcon={<AddIcon />} onClick={addFaturamento} size="small">
          Adicionar Nota Fiscal
        </Button>
      </Box>

      {valorTotalDemanda > 0 && (
        is100Porcento ? (
          <Alert severity="success" sx={{ fontWeight: "bold" }}>
            Demanda 100% Faturada! (R$ {valorTotalFaturado.toLocaleString("pt-BR", { minimumFractionDigits: 2 })})
          </Alert>
        ) : (
          <Alert severity="warning" sx={{ fontWeight: "bold" }}>
            Falta faturar: R$ {diferencaFaturamento.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} de um total de R$ {valorTotalDemanda.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </Alert>
        )
      )}

      {faturamentos.length === 0 ? (
        <Typography color="text.secondary" textAlign="center" sx={{ py: 2 }}>
          Nenhuma nota fiscal registrada.
        </Typography>
      ) : (
        faturamentos.map((fat, index) => (
          <Box key={fat.id} sx={{ p: 2, border: "1px solid #eee", borderRadius: 2, bgcolor: fat.cancelada ? "#fff5f5" : "transparent", display: "flex", flexDirection: "column", gap: 2 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <Typography variant="subtitle2" sx={{ fontWeight: "bold", color: fat.cancelada ? "error.main" : "text.primary" }}>
                {fat.cancelada ? `Nota Fiscal ${index + 1} (CANCELADA)` : `Nota Fiscal ${index + 1}`}
              </Typography>
              
              {/* BOTÕES DE AÇÃO */}
              <Box>
                <Tooltip title={(!fat.nota_fiscal || !fat.codigo_verificacao) ? "Preencha a nota e o código para visualizar" : "Visualizar Nota Fiscal"}>
                  <span> {/* Span necessário para o Tooltip funcionar em botões desabilitados */}
                    <IconButton 
                      color="primary" 
                      onClick={() => abrirNotaFiscal(fat.nota_fiscal, fat.codigo_verificacao)} 
                      disabled={!fat.nota_fiscal || !fat.codigo_verificacao}
                    >
                      <ReceiptIcon fontSize="small" />
                    </IconButton>
                  </span>
                </Tooltip>

                {!fat.cancelada && (
                  <IconButton color="warning" onClick={() => cancelarFaturamento(fat.id as string)} title="Cancelar Nota">
                    <BlockIcon fontSize="small" />
                  </IconButton>
                )}
                <IconButton color="error" onClick={() => removerFaturamento(fat.id as string)} title="Excluir Nota">
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            </Box>

            {/* PRIMEIRA LINHA: Dados da Nota */}
            <Box sx={{ display: "flex", gap: 2, flexDirection: { xs: "column", md: "row" }, flexWrap: "wrap" }}>
              <TextField 
                sx={{ flex: 1, minWidth: "120px" }} 
                label="Nota Fiscal" 
                size="small" 
                value={fat.nota_fiscal} 
                onChange={(e) => updateFaturamento(fat.id as string, "nota_fiscal", e.target.value)} 
                disabled={fat.cancelada} 
              />
              <TextField 
                sx={{ flex: 2, minWidth: "200px" }} 
                label="Cód. Verificação / Chave" 
                size="small" 
                value={fat.codigo_verificacao || ""} 
                onChange={(e) => updateFaturamento(fat.id as string, "codigo_verificacao", e.target.value)} 
                disabled={fat.cancelada} 
              />
            </Box>

            {/* SEGUNDA LINHA: Faturamento e Recebimento */}
            <Box sx={{ display: "flex", gap: 2, flexDirection: { xs: "column", md: "row" }, flexWrap: "wrap" }}>
              <TextField 
                sx={{ flex: 1, minWidth: "130px" }} 
                label="Data Fat" 
                type="date" 
                size="small" 
                InputLabelProps={{ shrink: true }} 
                value={fat.data_fat} 
                onChange={(e) => updateFaturamento(fat.id as string, "data_fat", e.target.value)} 
                disabled={fat.cancelada} 
              />
              <TextField 
                sx={{ flex: 1, minWidth: "130px" }} 
                label="Valor Fat (R$)" 
                size="small" 
                value={formatarParaExibicao(fat.valor_fat)} 
                onChange={(e) => handleCurrencyChange(fat.id as string, "valor_fat", e.target.value)} 
                disabled={fat.cancelada} 
              />
              <TextField 
                sx={{ flex: 1, minWidth: "130px" }} 
                label="Data Cred" 
                type="date" 
                size="small" 
                InputLabelProps={{ shrink: true }} 
                value={fat.data_cred || ""} 
                onChange={(e) => updateFaturamento(fat.id as string, "data_cred", e.target.value)} 
                disabled={fat.cancelada} 
              />
              <TextField 
                sx={{ flex: 1, minWidth: "130px" }} 
                label="Valor Cred (R$)" 
                size="small" 
                value={formatarParaExibicao(fat.valor_cred)} 
                onChange={(e) => handleCurrencyChange(fat.id as string, "valor_cred", e.target.value)} 
                disabled={fat.cancelada} 
              />
            </Box>
          </Box>
        ))
      )}
    </Paper>
  );
}