import React from "react";
import { Box, Card, CardContent, Typography, alpha } from "@mui/material";

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: string;
}

export default function StatCard({ title, value, icon, color }: StatCardProps) {
  return (
    <Card
      sx={{
        flex: "1 1 280px",
        borderRadius: 2,
        boxShadow: "0 4px 12px 0 rgba(0,0,0,0.05)",
      }}
    >
      <CardContent sx={{ display: "flex", alignItems: "center", gap: 2 }}>
        <Box
          sx={{
            display: "flex",
            p: 1.5,
            borderRadius: 2,
            bgcolor: alpha(color, 0.1),
            color: color,
          }}
        >
          {icon}
        </Box>
        <Box>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ fontWeight: 600, textTransform: "uppercase" }}
          >
            {title}
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>
            {value}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
}