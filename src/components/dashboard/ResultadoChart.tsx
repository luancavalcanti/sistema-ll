import React from "react";
import { Paper, Box, Typography, alpha, useTheme } from "@mui/material";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
} from "recharts";

interface ResultadoChartProps {
  data: any[];
  total: number;
  formatarMoeda: (val: number) => string;
  CustomTooltip: React.ComponentType<any>;
}

export default function ResultadoChart({
  data,
  total,
  formatarMoeda,
  CustomTooltip,
}: ResultadoChartProps) {
  const theme = useTheme();

  return (
    <Paper
      sx={{
        flex: 1,
        p: 3,
        borderRadius: 2,
        minHeight: 400,
        boxShadow: "0 4px 12px 0 rgba(0,0,0,0.05)",
      }}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          mb: 3,
          flexWrap: "wrap",
          gap: 1,
        }}
      >
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Resultado do Exercício (Últimos 12 Meses)
        </Typography>
        <Box
          sx={{
            bgcolor:
              total >= 0
                ? alpha(theme.palette.info.main, 0.1)
                : alpha(theme.palette.error.main, 0.1),
            px: 1.5,
            py: 0.5,
            borderRadius: 1,
          }}
        >
          <Typography
            variant="caption"
            sx={{
              fontWeight: 700,
              color:
                total >= 0
                  ? theme.palette.info.dark
                  : theme.palette.error.dark,
            }}
          >
            ACUMULADO: {formatarMoeda(total)}
          </Typography>
        </Box>
      </Box>

      <Box sx={{ width: "100%", height: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" axisLine={false} tickLine={false} />
            <YAxis
              axisLine={false}
              tickLine={false}
              tickFormatter={(val) => `${val / 1000}k`}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: alpha(theme.palette.text.primary, 0.05) }}
            />
            <ReferenceLine y={0} stroke="#000" />
            <Bar name="Resultado" dataKey="resultado" radius={[4, 4, 0, 0]}>
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={
                    entry.resultado >= 0
                      ? theme.palette.secondary.main
                      : theme.palette.error.main
                  }
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Box>
    </Paper>
  );
}