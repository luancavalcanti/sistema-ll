import { Paper, Box, Typography, Chip, IconButton, Tooltip } from "@mui/material";
import { WarningAmber as WarningIcon, CheckCircleOutline as CheckIcon, Delete as DeleteIcon } from "@mui/icons-material";
import { IMovimento } from "@/types/movimento";

interface MovimentoCardProps {
  mov: IMovimento;
  corBorda: string;
  tituloCard: string;
  dataFormatada: string;
  isConsulta: boolean;
  onClick: () => void;
  isDuplicada?: boolean;
  onIgnore?: () => void;
  onDelete?: () => void;
}

export default function MovimentoCard({ 
  mov, corBorda, tituloCard, dataFormatada, isConsulta, onClick, isDuplicada, onIgnore, onDelete
}: MovimentoCardProps) {
  
  const handleActionClick = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    action();
  };

  return (
    <Paper
      onClick={onClick}
      sx={{
        bgcolor: isDuplicada ? "#fff5f5" : (corBorda === "#ffc107" ? "#ffc1071a" : ""),
        display: "flex",
        flexDirection: { xs: "column", sm: "row" },
        borderLeft: `6px solid ${isDuplicada ? "#d32f2f" : corBorda}`,
        borderRadius: 2,
        p: 2,
        gap: { xs: 1, sm: 2 },
        alignItems: { xs: "flex-start", sm: "center" },
        cursor: isConsulta ? "default" : "pointer",
        "&:hover": { bgcolor: isConsulta ? "inherit" : (isDuplicada ? "#ffebee" : "#f5f5f5") },
        transition: "background-color 0.2s",
      }}
    >
      {/* 1. Data e Banco */}
      <Box sx={{ flex: 0.6, display: "flex", flexDirection: { xs: "row", sm: "column" }, gap: { xs: 2, sm: 0 }, minWidth: "80px" }}>
        <Typography variant="body2" sx={{ fontWeight: "bold", color: "text.secondary" }}>{dataFormatada}</Typography>
        <Typography variant="caption" sx={{ textTransform: "uppercase", color: "primary.main", fontWeight: 800 }}>{mov.banco}</Typography>
      </Box>

      {/* 2. Descrição e Favorecido */}
      <Box sx={{ flex: 2.5, display: "flex", flexDirection: "column" }}>
        <Typography variant="subtitle1" sx={{ fontSize: "0.8rem", fontWeight: 600, lineHeight: 1 }}>{tituloCard}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontSize: "0.8rem" }}>
          {mov.favorecido ? <><strong>Favorecido:</strong> {mov.favorecido}</> : <span style={{ fontStyle: "italic", opacity: 0.6 }}>Sem favorecido</span>}
        </Typography>
      </Box>

      {/* 3. Classificação e Chips */}
      <Box sx={{ flex: 0.8, display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
        {mov.classificacao ? (
          <Chip label={mov.classificacao} size="small" sx={{ fontWeight: "bold", height: 24 }} />
        ) : (
          <Chip label="Sem Classificação" size="small" variant="outlined" sx={{ height: 24, color: "text.secondary", borderColor: "#ddd" }} />
        )}
        {mov.demanda && <Chip label={`${mov.demanda}`} size="small" color="primary" variant="outlined" sx={{ height: 24 }} />}
        
        {isDuplicada && (
          <Chip icon={<WarningIcon fontSize="small" />} label="Duplicado?" color="error" size="small" variant="outlined" sx={{ height: 24, fontWeight: "bold", bgcolor: "#fff" }} />
        )}
      </Box>

      {/* 4. Valor e Botões (Corrigido para não quebrar linha) */}
      <Box sx={{ 
        flex: 1, 
        display: "flex", 
        alignItems: "center", 
        justifyContent: { xs: "space-between", sm: "flex-end" }, // No celular afasta os itens, no PC joga pro fim
        minWidth: "fit-content", // Garante que a caixa tenha o tamanho exato do conteúdo
        gap: 2,
        mt: { xs: 1, sm: 0 },
        width: { xs: "100%", sm: "auto" }
      }}>
        <Typography 
          variant="h6" 
          sx={{ 
            fontWeight: 600, 
            fontSize: "1rem", 
            color: mov.valor < 0 ? "error.main" : "success.main",
            whiteSpace: "nowrap" // 👈 Impede o valor de quebrar em duas linhas
          }}
        >
          {Number(mov.valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
        </Typography>

        {/* Botões Exclusivos para a área de Duplicatas */}
        {!isConsulta && isDuplicada && (
          <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}> {/* flexShrink: 0 impede os botões de serem esmagados */}
            {onIgnore && (
              <Tooltip title="Marcar como autêntico (Manter no sistema)">
                <IconButton onClick={(e) => handleActionClick(e, onIgnore)} color="success" size="small" sx={{ border: '1px solid', borderColor: 'success.main', bgcolor: '#fff' }}>
                  <CheckIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            {onDelete && (
              <Tooltip title="Excluir duplicata do sistema">
                <IconButton onClick={(e) => handleActionClick(e, onDelete)} color="error" size="small" sx={{ border: '1px solid', borderColor: 'error.main', bgcolor: '#fff' }}>
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        )}
      </Box>
    </Paper>
  );
}