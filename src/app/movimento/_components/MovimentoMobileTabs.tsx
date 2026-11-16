"use client";

import React from "react";
import { Box, Tabs, Tab } from "@mui/material";
import {
  ReceiptLong as ExtratosIcon,
  BarChart as BarChartIcon,
} from "@mui/icons-material";
import { useRouter, usePathname } from "next/navigation";

export default function MovimentoMobileTabs() {
  const router = useRouter();
  const pathname = usePathname();

  const currentTab = pathname === "/movimento/graficos" ? 1 : 0;

  const handleChange = (_: React.SyntheticEvent, newValue: number) => {
    if (newValue === 0) {
      router.push("/movimento");
    } else {
      router.push("/movimento/graficos");
    }
  };

  return (
    <Box
      sx={{
        display: { xs: "block", md: "none" },
        borderBottom: 1,
        borderColor: "divider",
        mb: 2,
      }}
    >
      <Tabs
        value={currentTab}
        onChange={handleChange}
        variant="fullWidth"
        indicatorColor="primary"
        textColor="primary"
      >
        <Tab
          icon={<ExtratosIcon fontSize="small" />}
          iconPosition="start"
          label="Extratos"
          sx={{ fontWeight: 600, minHeight: 48 }}
        />
        <Tab
          icon={<BarChartIcon fontSize="small" />}
          iconPosition="start"
          label="Gráficos"
          sx={{ fontWeight: 600, minHeight: 48 }}
        />
      </Tabs>
    </Box>
  );
}
