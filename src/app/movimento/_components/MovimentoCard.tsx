import { Paper, Box, Typography, Chip } from "@mui/material";
import { IMovimento } from "@/types/movimento";

interface MovimentoCardProps {
  mov: IMovimento;
  corBorda: string;
  tituloCard: string;
  dataFormatada: string;
  isConsulta: boolean;
  onClick: () => void;
}

export default function MovimentoCard({ mov, corBorda, tituloCard, dataFormatada, isConsulta, onClick }: MovimentoCardProps) {
  return (
    <Paper
      onClick={onClick}
      sx={{
        display: "flex",
        flexDirection: { xs: "column", sm: "row" },
        borderLeft: `6px solid ${corBorda}`,
        borderRadius: 2,
        p: 2,
        gap: { xs: 1, sm: 2 },
        alignItems: { xs: "flex-start", sm: "center" },
        cursor: isConsulta ? "default" : "pointer",
        "&:hover": { bgcolor: isConsulta ? "inherit" : "#f5f5f5" },
        transition: "background-color 0.2s",
      }}
    >
      {/* 1. Data e Banco */}
      <Box sx={{ flex: 0.6, display: "flex", flexDirection: { xs: "row", sm: "column" }, gap: { xs: 2, sm: 0 }, minWidth: "80px" }}>
        <Typography variant="body2" sx={{ fontWeight: "bold", color: "text.secondary" }}>
          {dataFormatada}
        </Typography>
        <Typography variant="caption" sx={{ textTransform: "uppercase", color: "primary.main", fontWeight: 800 }}>
          {mov.banco}
        </Typography>
      </Box>

      {/* 2. Descrição e Favorecido */}
      <Box sx={{ flex: 2.5, display: "flex", flexDirection: "column" }}>
        <Typography variant="subtitle1" sx={{ fontSize: "0.8rem", fontWeight: 600, lineHeight: 1 }}>
          {tituloCard}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, fontSize: "0.8rem" }}>
          {mov.favorecido ? (
            <><strong>Favorecido:</strong> {mov.favorecido}</>
          ) : (
            <span style={{ fontStyle: "italic", opacity: 0.6 }}>Sem favorecido preenchido</span>
          )}
        </Typography>
      </Box>

      {/* 3. Classificação (Tipo de Despesa e Demanda) */}
      <Box sx={{ flex: 0.5, display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
        {mov.classificacao ? (
          <Chip label={mov.classificacao} size="small" sx={{ fontWeight: "bold", height: 24 }} />
        ) : (
          <Chip label="Sem Classificação" size="small" variant="outlined" sx={{ height: 24, color: "text.secondary", borderColor: "#ddd" }} />
        )}
        {mov.demanda && (
          <Chip label={`${mov.demanda}`} size="small" color="primary" variant="outlined" sx={{ height: 24 }} />
        )}
      </Box>

      {/* 4. Valor */}
      <Box sx={{ flex: 0.5, display: "flex", justifyContent: { xs: "flex-start", sm: "flex-end" }, minWidth: "100px" }}>
        <Typography variant="h6" sx={{ fontWeight: 600, fontSize: "1rem", color: mov.valor < 0 ? "error.main" : "success.main" }}>
          {Number(mov.valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
        </Typography>
      </Box>
    </Paper>
  );
}