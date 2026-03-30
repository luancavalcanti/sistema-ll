'use client';
import { createTheme } from "@mui/material";

 // O tema do MUI precisa rodar no cliente

const theme = createTheme({
  palette: {
    primary: {
      main: '#0a7d84ff', // Azul
    },
    secondary: {
      main: '#007243ff', //Verde
    },
    success: {
      main: '#2e7d32',
    },
    warning: {
      main: '#ed6c02',
    },
    error: {
      main: '#d32f2f',
    },
    background: {
      default: '#f5f5f5',
    },
  },
  // Aqui você pode padronizar fontes ou arredondamento de botões
  shape: {
    borderRadius: 8,
  },
});

export default theme;