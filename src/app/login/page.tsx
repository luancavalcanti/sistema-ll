"use client";

import React, { useState } from "react";
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Alert,
} from "@mui/material";
import { useRouter } from "next/navigation";

// 👇 Importamos o cliente do Supabase no lugar do Firebase
import { supabase } from "@/lib/supabase";
import Image from "next/image";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [erroMsg, setErroMsg] = useState("");

  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErroMsg(""); // Limpa mensagens de erro anteriores

    try {
      // 👇 Função de login do Supabase
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      // O Supabase não joga o erro para o catch automaticamente, precisamos checar:
      if (error) {
        throw error;
      }

      router.push("/"); // Redireciona após o login
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Erro desconhecido";
      console.error("Erro ao logar:", errorMessage);
      setErroMsg("Falha no login. Verifique suas credenciais.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="xs">
      <Box
        sx={{
          mt: 8,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        <Paper elevation={3} sx={{ p: 4, width: "100%" }}>
          <div
            style={{
              width: "200px",
              aspectRatio: "1 / 1",
              position: "relative",
              display: "block",
              margin: "0 auto 20px",
            }}
          >
            <Image
              src="/logo-completa.png"
              alt="LL Engenharia"
              fill // 👈 Diz para a imagem ocupar 100% do tamanho da Div pai
              unoptimized={false}
              style={{
                objectFit: "contain", // 👈 Garante que a imagem caiba toda dentro da Div sem cortar
              }}
            />
          </div>

          {/* 👇 Alerta visual do Material UI caso a senha esteja errada */}
          {erroMsg && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {erroMsg}
            </Alert>
          )}

          <Box component="form" onSubmit={handleLogin} sx={{ mt: 1 }}>
            <TextField
              margin="normal"
              required
              fullWidth
              label="E-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              disabled={loading} // Trava a digitação enquanto carrega
            />
            <TextField
              margin="normal"
              required
              fullWidth
              label="Senha"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading} // Trava o botão para evitar cliques duplos
            >
              {loading ? "Entrando..." : "Entrar"}
            </Button>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
}
