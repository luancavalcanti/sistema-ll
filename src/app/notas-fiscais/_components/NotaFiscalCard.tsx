"use client";

import { Paper, Box, Typography, Chip, IconButton, Tooltip } from "@mui/material";
import {
  Receipt as ReceiptIcon,
  CheckCircle as PaidIcon,
  PendingActions as PendingIcon,
  ReportProblem as MissingIcon,
  Block as CanceledIcon,
} from "@mui/icons-material";

// 👇 Importamos a interface direto da página pai
import { INotaFiscalUI } from "../page";

export interface NotaFiscalCardProps {
  nota: INotaFiscalUI;
  onClick: () => void;
}

export default function NotaFiscalCard({ nota, onClick }: NotaFiscalCardProps) {

  // --- LÓGICA DO LINK DA NOTA FISCAL (Copiada do Faturamento) ---
  const abrirNotaFiscal = (e: React.MouseEvent, nota_fiscal?: string, codigo_verificacao?: string) => {
    e.stopPropagation(); // Impede que o clique no botão abra a tela da demanda!
    
    if (!nota_fiscal || !codigo_verificacao) return;

    const notaLimpa = String(nota_fiscal).trim();
    const codigoLimpo = String(codigo_verificacao).trim();

    if (codigoLimpo.length > 20 || notaLimpa.length > 9) {
      window.open(`https://www.nfse.gov.br/ConsultaPublica/?tpc=1&chave=${codigoLimpo}`, "_blank");
    } else {
      const notaPadded = notaLimpa.padStart(9, '0');
      window.open(`https://www.tinus.com.br/csp/OLINDA/portal/nfsepdf.csp?WPARAM=0448509-${notaPadded}-${codigoLimpo}`, "_blank");
    }
  };
  // 1. SE FOR UMA NOTA FALTANTE
  if (nota.isFaltante) {
    return (
      <Paper
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          borderLeft: `6px solid #d32f2f`,
          borderRadius: 2,
          p: 2,
          gap: 2,
          alignItems: { xs: "flex-start", sm: "center" },
          bgcolor: "#fff4f4",
        }}
      >
        <Box
          sx={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            minWidth: "150px",
          }}
        >
          <Box sx={{ display: { xs: "none", sm: "flex" } }}>
            <MissingIcon color="error" />
          </Box>
          <Box>
            <Typography variant="body2" color="error" fontWeight="bold">
              NF
            </Typography>
            <Typography
              variant="subtitle1"
              fontWeight="600"
              color="error"
              lineHeight={1}
            >
              {nota.nota_fiscal}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ flex: 2, display: "flex", flexDirection: "column" }}>
          <Typography variant="subtitle1" fontWeight="600" color="error">
            Nota Não Registrada no Sistema
          </Typography>
          <Typography variant="body2" color="error">
            Detectada quebra na sequência
          </Typography>
        </Box>
        <Box sx={{ flex: 1, display: "flex", justifyContent: "flex-end" }}>
          <Chip
            icon={<MissingIcon />}
            label="Alerta de nota faltando"
            size="small"
            color="error"
            sx={{ fontWeight: "bold" }}
          />
        </Box>
      </Paper>
    );
  }

  // 2. SE FOR UMA NOTA CANCELADA
  if (nota.cancelada) {
    const dataFatFormatada = nota.data_fat
      ? String(nota.data_fat).split("-").reverse().join("/")
      : "Data Indisponível";

    return (
      <Paper
        onClick={onClick}
        sx={{
          display: "flex",
          flexDirection: { xs: "column", sm: "row" },
          borderLeft: `6px solid #9e9e9e`,
          borderRadius: 2,
          p: 2,
          gap: 2,
          alignItems: { xs: "flex-start", sm: "center" },
          bgcolor: "#f5f5f5",
          opacity: 0.8,
          cursor: "pointer",
          "&:hover": { opacity: 1 },
        }}
      >
        <Box
          sx={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            minWidth: "150px",
          }}
        >
          <Box sx={{ display: { sm: "none", md: "flex" } }}>
            {/* 👇 Botão clicável no lugar do ícone estático */}
             <Tooltip title={(!nota.nota_fiscal || !nota.codigo_verificacao) ? "Código/Chave ausente" : "Visualizar Nota Fiscal Cancelada"}>
              <span>
                <IconButton 
                  color="inherit" 
                  onClick={(e) => abrirNotaFiscal(e, nota.nota_fiscal, nota.codigo_verificacao)} 
                  disabled={!nota.nota_fiscal || !nota.codigo_verificacao}
                  sx={{ color: "text.disabled", p: 0.5 }}
                >
                  <CanceledIcon />
                </IconButton>
              </span>
            </Tooltip>
          </Box>
          <Box>
            <Typography variant="body2" color="text.disabled" fontWeight="bold">
              NF
            </Typography>
            <Typography
              variant="subtitle1"
              fontWeight="600"
              color="text.disabled"
              lineHeight={1}
            >
              {nota.nota_fiscal}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ flex: 2, display: "flex", flexDirection: "column" }}>
          <Typography
            variant="subtitle1"
            fontWeight="700"
            color="text.secondary"
          >
            Demanda {nota.demandaId || "---"}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {nota.codigo_verificacao
              ? `Cód: ${nota.codigo_verificacao}`
              : `Emitida em: ${dataFatFormatada}`}
          </Typography>
        </Box>
        
        <Box
          sx={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: { xs: "flex-start", sm: "flex-end" },
            minWidth: "150px",
            gap: 1
          }}
        >
          <Chip
            icon={<CanceledIcon />}
            label="Nota Cancelada"
            size="small"
            sx={{ fontWeight: "bold", bgcolor: "#e0e0e0", color: "#757575" }}
          />
          <Typography variant="h6" fontWeight="600" color="text.disabled">
            {Number(0).toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}
          </Typography>
        </Box>
      </Paper>
    );
  }

  // 3. SE FOR UMA NOTA NORMAL
  const valorCred = Number(nota.valor_cred || 0);
  const valorFat = Number(nota.valor_fat || 0);
  const isPaga = valorCred > 0;
  
  const corBorda = isPaga ? "#4caf50" : "#ff9800";
  const dataFatFormatada = nota.data_fat ? String(nota.data_fat).split("-").reverse().join("/") : "S/D";

  return (
    <Paper
      onClick={onClick}
      sx={{
        display: "flex",
        justifyContent: "space-between",
        flexDirection: { xs: "column", sm: "row" },
        borderLeft: `6px solid ${corBorda}`,
        borderRadius: 2,
        p: 2,
        gap: 2,
        alignItems: { xs: "flex-start", sm: "center" },
        cursor: "pointer",
        "&:hover": { bgcolor: "#f5f5f5" },
        transition: "background-color 0.2s",
      }}
    >
      <Box
        sx={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          minWidth: "150px",
        }}
      >
        <Box sx={{ display: { sm: "none", md: "flex" } }}>
           {/* 👇 Botão clicável no lugar do ícone estático */}
           <Tooltip title={(!nota.nota_fiscal || !nota.codigo_verificacao) ? "Código/Chave ausente" : "Visualizar Nota Fiscal"}>
            <span>
              <IconButton 
                color="primary" 
                onClick={(e) => abrirNotaFiscal(e, nota.nota_fiscal, nota.codigo_verificacao)} 
                disabled={!nota.nota_fiscal || !nota.codigo_verificacao}
                sx={{ p: 0.5 }}
              >
                <ReceiptIcon />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
        <Box>
          <Typography variant="body2" color="text.secondary" fontWeight="bold">
            NF
          </Typography>
          <Typography variant="subtitle1" fontWeight="600" lineHeight={1}>
            {nota.nota_fiscal}
          </Typography>
        </Box>
      </Box>
      
      <Box sx={{ flex: 2, display: "flex", flexDirection: "column" }}>
        <Typography variant="subtitle1" fontWeight="700">
          Demanda {nota.demandaId || "---"}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Emitida em: {dataFatFormatada}
        </Typography>
        {/* Mostra o código de verificação embaixo da data na listagem */}
        {nota.codigo_verificacao && (
          <Typography variant="caption" sx={{ color: "text.disabled", display: "block" }}>
            Cód: {nota.codigo_verificacao}
          </Typography>
        )}
      </Box>
      
      <Box
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: { xs: "flex-start", sm: "flex-end" },
          minWidth: "120px",
          gap: 1,
        }}
      >
        {isPaga ? (
          <Chip
            icon={<PaidIcon />}
            label={`${String(nota.data_cred || "").split("-").reverse().join("/")}`}
            size="small"
            color="success"
            variant="outlined"
            sx={{ fontWeight: "bold" }}
          />
        ) : (
          <Chip
            icon={<PendingIcon />}
            label="Aguardando Pagamento"
            size="small"
            color="warning"
            sx={{ fontWeight: "bold" }}
          />
        )}
        <Typography variant="h6" fontWeight="800" color="primary.main">
          {valorFat.toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
          })}
        </Typography>
      </Box>
    </Paper>
  );
}