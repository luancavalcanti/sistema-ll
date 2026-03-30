"use client";

import React, { useState } from "react";
import { Box, Typography, Button, Paper, Alert } from "@mui/material";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { supabase } from "@/lib/supabase";

export default function MigracaoPage() {
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>("");
  const [erro, setErro] = useState<string | null>(null);

  const executarMigracao = async () => {
    setLoading(true);
    setErro(null);
    setStatus(
      "1. Lendo todos os extratos do Firebase e limpando duplicatas...",
    );

    try {
      const querySnapshot = await getDocs(collection(db, "extratos"));
      const listaMovimentos: any[] = [];

      // 👇 O NOSSO CADERNINHO ANTI-DUPLICIDADE
      const fitidsVistos = new Set<string>();
      let duplicadosIgnorados = 0;

      querySnapshot.docs.forEach((doc) => {
        const data = doc.data();

        // 1. Limpeza rigorosa do FITID (Transforma string vazia em null)
        const fitidRaw = data.fitid || "";
        const fitidLimpo =
          typeof fitidRaw === "string"
            ? fitidRaw.trim()
            : String(fitidRaw).trim();
        const fitidFinal = fitidLimpo !== "" ? fitidLimpo : null;

        // 3. Formatação da Data
        let dataFormatada = null;
        if (data.data && typeof data.data.toDate === "function") {
          dataFormatada = data.data.toDate().toISOString().split("T")[0];
        } else if (typeof data.data === "string") {
          dataFormatada = data.data.substring(0, 10);
        }

        const valorFormatado = Number(data.valor) || 0;

        if (fitidFinal) {
          // Criamos uma "impressão digital" única juntando os três dados
          const chaveUnica = `${fitidFinal}_${dataFormatada}_${valorFormatado}`;

          if (fitidsVistos.has(chaveUnica)) {
            duplicadosIgnorados++;
            return; // 🛑 Ignora porque realmente é uma duplicata idêntica!
          }
          fitidsVistos.add(chaveUnica); // Anota a chave completa no caderninho
        }

        listaMovimentos.push({
          demanda: data.demanda || null, // Usando snake_case da nossa nova tabela
          data: dataFormatada,
          valor: valorFormatado,
          descricao: data.descricao || "",
          observacao: data.observacao || "",
          banco: data.banco || "",
          favorecido: data.favorecido || "",
          classificacao: data.classificacao || data.tipoDespesa || "",
          fitid: fitidFinal,
        });
      });

      if (listaMovimentos.length > 0) {
        const tamanhoDoLote = 300;
        let enviados = 0;

        for (let i = 0; i < listaMovimentos.length; i += tamanhoDoLote) {
          const lote = listaMovimentos.slice(i, i + tamanhoDoLote);

          setStatus(
            `2. Enviando lote... (${enviados} de ${listaMovimentos.length} salvos) - ${duplicadosIgnorados} lixos ignorados.`,
          );

          const resMovimentos = await supabase.from("movimentos").insert(lote);

          if (resMovimentos.error) {
            throw new Error(
              `Erro no lote atual: ${resMovimentos.error.message}`,
            );
          }

          enviados += lote.length;
        }
      }

      setStatus(
        `✅ Migração Concluída! ${listaMovimentos.length} salvos com sucesso. ${duplicadosIgnorados} duplicados foram jogados fora.`,
      );
    } catch (error: any) {
      console.error(error);
      setErro(error.message || "Erro desconhecido");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 600, mx: "auto", mt: 10, p: 3 }}>
      <Paper
        sx={{
          p: 4,
          display: "flex",
          flexDirection: "column",
          gap: 3,
          textAlign: "center",
        }}
      >
        <Typography variant="h5" fontWeight="bold">
          Migração: Firebase ➡️ Supabase
        </Typography>

        <Typography color="text.secondary">
          Este botão vai ler os extratos antigos,{" "}
          <b>filtrar os duplicados da época do Firebase</b>, e salvar um banco
          de dados limpo no Supabase.
        </Typography>

        {erro && <Alert severity="error">{erro}</Alert>}
        {status && (
          <Alert severity={status.includes("✅") ? "success" : "info"}>
            {status}
          </Alert>
        )}

        <Button
          variant="contained"
          size="large"
          onClick={executarMigracao}
          disabled={loading}
        >
          {loading ? "Migrando e Limpando..." : "Executar Migração Limpa"}
        </Button>
      </Paper>
    </Box>
  );
}
