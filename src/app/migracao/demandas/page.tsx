"use client";

import React, { useState } from "react";
import { Box, Typography, Button, Paper, Alert } from "@mui/material";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase"; // Lendo do Firebase antigo
import { supabase } from "@/lib/supabase"; // Escrevendo no Supabase novo

export default function MigracaoPage() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [erro, setErro] = useState<string | null>(null);

  const executarMigracao = async () => {
    setLoading(true);
    setErro(null);
    setStatus("1. Lendo dados do Firebase...");

    try {
      const querySnapshot = await getDocs(collection(db, "demandas"));
      const listaDemandas: any[] = [];
      const listaFaturamentos: any[] = [];

      querySnapshot.docs.forEach(doc => {
        const data = doc.data();
        const firebaseId = doc.id; // Mantém o ID original para preservar o relacionamento

        // Prepara a Demanda
        listaDemandas.push({
          id: firebaseId,
          numero: String(data.numero || ""),
          cliente: data.cliente || "",
          gestor: data.gestor || "",
          local: data.local || "",
          uf: data.uf || "",
          cidade: data.cidade || "",
          obs: data.obs || "",
          status: data.status || "Nova",
          valor: Number(data.valor) || 0,
          apoio: Number(data.apoio) || 0,
          gestao: Number(data.gestao) || 0,
          criadoPor: data.criadoPor || null,
          criadoEm: data.criadoEm && data.criadoEm.toDate ? data.criadoEm.toDate().toISOString() : new Date().toISOString()
        });

        // Prepara o Faturamento (Separando a tabela!)
        if (data.faturamento && Array.isArray(data.faturamento)) {
          data.faturamento.forEach((fat: any) => {
            listaFaturamentos.push({
              demanda_numero: String(data.numero || ""), // 👈 AJUSTADO AQUI!
              nota_fiscal: fat.notaFiscal || `NF-MIG-${Date.now()}-${Math.random()}`,
              valor_fat: Number(fat.valorFat) || 0,
              valor_cred: Number(fat.valorCred) || 0,
              data_fat: fat.dataFat && fat.dataFat.toDate ? fat.dataFat.toDate().toISOString().split('T')[0] : null,
              data_cred: fat.dataCred && fat.dataCred.toDate ? fat.dataCred.toDate().toISOString().split('T')[0] : null,
              cancelada: fat.cancelada || false
            });
          });
        }
      });

      setStatus(`2. Enviando ${listaDemandas.length} demandas para o Supabase...`);
      
      const resDemandas = await supabase.from('demandas').insert(listaDemandas);
      if (resDemandas.error) throw new Error(`Erro Demandas: ${resDemandas.error.message}`);

      if (listaFaturamentos.length > 0) {
        setStatus(`3. Enviando ${listaFaturamentos.length} notas fiscais para o Supabase...`);
        const resFaturamento = await supabase.from('faturamentos').insert(listaFaturamentos);
        if (resFaturamento.error) throw new Error(`Erro Faturamento: ${resFaturamento.error.message}`);
      }

      setStatus("✅ Migração Concluída com Sucesso! Vá conferir no painel do Supabase.");
    } catch (error: any) {
      console.error(error);
      setErro(error.message || "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 600, mx: "auto", mt: 10, p: 3 }}>
      <Paper sx={{ p: 4, display: "flex", flexDirection: "column", gap: 3, textAlign: "center" }}>
        <Typography variant="h5" fontWeight="bold">Migração: Firebase ➡️ Supabase</Typography>
        
        <Typography color="text.secondary">
          Este botão vai ler todas as demandas do Firebase, separar os faturamentos e salvar tudo no banco de dados relacional.
        </Typography>

        {erro && <Alert severity="error">{erro}</Alert>}
        {status && <Alert severity={status.includes("✅") ? "success" : "info"}>{status}</Alert>}

        <Button 
          variant="contained" 
          size="large" 
          onClick={executarMigracao} 
          disabled={loading}
        >
          {loading ? "Migrando..." : "Executar Migração Agora"}
        </Button>
      </Paper>
    </Box>
  );
}