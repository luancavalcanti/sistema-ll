import React from "react";
import { Paper, Box, Typography, alpha, useTheme } from "@mui/material";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";

interface FaturamentoChartProps {
  data: any[];
  total: number;
  formatarMoeda: (val: number) => string;
  CustomTooltip: React.ComponentType<any>;
}

export default function FaturamentoChart({
  data,
  total,
  formatarMoeda,
  CustomTooltip,
}: FaturamentoChartProps) {
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
          Faturamento (Últimos 12 Meses)
        </Typography>
        <Box
          sx={{
            bgcolor: alpha(theme.palette.success.main, 0.1),
            px: 1.5,
            py: 0.5,
            borderRadius: 1,
          }}
        >
          <Typography
            variant="caption"
            sx={{ fontWeight: 700, color: theme.palette.success.dark }}
          >
            ACUMULADO: {formatarMoeda(total)}
          </Typography>
        </Box>
      </Box>

      <Box sx={{ width: "100%", height: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" axisLine={false} tickLine={false} />
            <YAxis
              axisLine={false}
              tickLine={false}
              tickFormatter={(val) => `${val / 1000}k`}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              name="Faturamento"
              type="monotone"
              dataKey="faturamento"
              stroke={theme.palette.success.main}
              strokeWidth={3}
              dot={{ r: 4 }}
              activeDot={{ r: 8 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </Box>
    </Paper>
  );
}