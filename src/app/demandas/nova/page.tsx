"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Paper,
  MenuItem,
} from "@mui/material";
import {
  Save as SaveIcon,
  ArrowBack as ArrowBackIcon,
} from "@mui/icons-material";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import Title from "@/components/Title";

// Importando o nosso serviço e o supabase para a validação de duplicidade
import {
  obterProximoNumeroDemanda,
  criarDemanda,
} from "@/services/demandasService";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";
// Tipos para a API do IBGE
interface IBGEUF {
  sigla: string;
  nome: string;
}
interface IBGECidade {
  nome: string;
}

export default function NovaDemandaPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [demanda, setDemanda] = useState({
    numero: "",
    cliente: "",
    gestor: "",
    local: "",
    uf: "",
    cidade: "",
    obs: "",
    valor: "",
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [ufs, setUfs] = useState<IBGEUF[]>([]);
  const [cidades, setCidades] = useState<IBGECidade[]>([]);

  // 1. Busca o próximo número da demanda (VIA SERVIÇO)
  useEffect(() => {
    const fetchProximoNumero = async () => {
      try {
        const proximoNumero = await obterProximoNumeroDemanda();
        setDemanda((prev) => ({ ...prev, numero: String(proximoNumero) }));
      } catch (error) {
        console.error("Erro ao gerar número da demanda:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProximoNumero();
  }, []);

  // 2. Busca UFs
  useEffect(() => {
    fetch(
      "https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome",
    )
      .then((res) => res.json())
      .then((data) => setUfs(data))
      .catch((err) => console.error("Erro ao buscar UFs:", err));
  }, []);

  // 3. Busca Cidades
  useEffect(() => {
    if (!demanda.uf) {
      setCidades([]);
      return;
    }
    fetch(
      `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${demanda.uf}/municipios`,
    )
      .then((res) => res.json())
      .then((data) => setCidades(data))
      .catch((err) => console.error("Erro ao buscar cidades:", err));
  }, [demanda.uf]);

  // Handler genérico para textos
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === "uf") {
      setDemanda((prev) => ({ ...prev, uf: value, cidade: "" }));
    } else {
      setDemanda((prev) => ({ ...prev, [name]: value }));
    }
  };

  // Handler com máscara de moeda
  const handleCurrencyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const apenasDigitos = value.replace(/\D/g, "");

    if (!apenasDigitos) {
      setDemanda((prev) => ({ ...prev, [name]: "" }));
      return;
    }
    const valorDecimal = (Number(apenasDigitos) / 100).toFixed(2);
    setDemanda((prev) => ({ ...prev, [name]: valorDecimal }));
  };

  const formatarParaExibicao = (valor: any) => {
    if (valor === undefined || valor === null || valor === "") return "";
    return Number(valor).toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  // 4. Salvar Demanda
  const handleSave = async () => {
    if (!user) return;

    // Validação básica do número
    if (!demanda.numero || demanda.numero.trim() === "") {
      alert("O número da demanda não pode estar vazio.");
      return;
    }

    setSaving(true);

    try {
      const numeroSugerido = Number(demanda.numero);

      // Verificação de segurança: Checa se o número digitado já existe no banco
      const { data: demandaExistente, error: erroBusca } = await supabase
        .from("demandas")
        .select("id")
        .eq("numero", numeroSugerido)
        .maybeSingle();

      if (erroBusca) throw erroBusca;

      if (demandaExistente) {
        alert(
          `O número de demanda ${numeroSugerido} já está em uso! Por favor, escolha outro.`,
        );
        setSaving(false);
        return;
      }

      // Formatação e envio
      const demandaFormatada = {
        ...demanda,
        numero: numeroSugerido,
        valor:
          typeof demanda.valor === "string"
            ? parseFloat(demanda.valor.replace(",", "."))
            : demanda.valor || 0,
      };

      await criarDemanda(demandaFormatada, user.id);

      router.push("/demandas");
    } catch (error) {
      console.error("Erro ao criar demanda:", error);
      alert("Ocorreu um erro ao salvar a demanda.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          mt: 10,
          gap: 2,
        }}
      >
        <CircularProgress />
        <Typography color="text.secondary">Preparando formulário...</Typography>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        gap: 3,
        maxWidth: 800,
        mx: "auto",
      }}
    >
      {/* CABEÇALHO */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
          <Button
            variant="outlined"
            onClick={() => router.push("/demandas")}
            sx={{ minWidth: "auto", p: 1, borderRadius: 2 }}
          >
            <ArrowBackIcon />
          </Button>
          <Title
            title="Nova Demanda"
            subtitle="Preencha os campos abaixo para inserir a demanda no sistema"
          />
        </Box>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={saving || !demanda.cliente}
          sx={{ borderRadius: 2, fontWeight: "bold" }}
          startIcon={<SaveIcon />}
        >
          {saving ? "Criando..." : "Criar Demanda"}
        </Button>
      </Box>

      {/* FORMULÁRIO */}
      <Paper
        sx={{
          p: 4,
          borderRadius: 3,
          display: "flex",
          flexDirection: "column",
          gap: 3,
        }}
      >
        <Box
          sx={{
            display: "flex",
            gap: 2,
            flexDirection: { xs: "column", md: "row" },
          }}
        >
          <TextField
            label="Número"
            name="numero"
            value={demanda.numero}
            onChange={(e) => {
              // Substitui tudo que não for dígito (\D) por vazio e corta no 7º caractere
              const apenasNumeros = e.target.value
                .replace(/\D/g, "")
                .slice(0, 7);
              setDemanda((prev) => ({ ...prev, numero: apenasNumeros }));
            }}
            sx={{ width: { xs: "100%", md: "30%" } }}
            inputProps={{ maxLength: 7 }}
            required
          />
          <TextField
            fullWidth
            label="Cliente"
            name="cliente"
            value={demanda.cliente}
            onChange={handleChange}
            required
          />
          <TextField
            select
            fullWidth
            label="Gestor"
            name="gestor"
            value={demanda.gestor}
            onChange={handleChange}
          >
            <MenuItem value="">
              <em>Nenhum</em>
            </MenuItem>
            <MenuItem value="Edvaldo">Edvaldo Cavalcanti</MenuItem>
            <MenuItem value="Tiago">Tiago Santana</MenuItem>
          </TextField>
        </Box>

        <Box
          sx={{
            display: "flex",
            gap: 2,
            flexDirection: { xs: "column", md: "row" },
          }}
        >
          <TextField
            select
            label="UF"
            name="uf"
            value={demanda.uf}
            onChange={handleChange}
            sx={{ width: { xs: "100%", md: "30%" } }}
          >
            {ufs.map((uf) => (
              <MenuItem key={uf.sigla} value={uf.sigla}>
                {uf.sigla} - {uf.nome}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            fullWidth
            label="Cidade"
            name="cidade"
            value={demanda.cidade}
            onChange={handleChange}
            disabled={!demanda.uf}
          >
            {cidades.map((cidade) => (
              <MenuItem key={cidade.nome} value={cidade.nome}>
                {cidade.nome}
              </MenuItem>
            ))}
          </TextField>
        </Box>

        <TextField
          fullWidth
          label="Local (Endereço/Agência)"
          name="local"
          value={demanda.local}
          onChange={handleChange}
        />

        <TextField
          fullWidth
          label="Descrição / Observações"
          name="obs"
          value={demanda.obs}
          onChange={handleChange}
          multiline
          rows={3}
        />

        <Box sx={{ width: { xs: "100%", md: "30%" } }}>
          <TextField
            fullWidth
            label="Valor Estimado (R$)"
            name="valor"
            value={formatarParaExibicao(demanda.valor)}
            onChange={handleCurrencyChange}
            helperText="Opcional neste momento"
          />
        </Box>
      </Paper>
    </Box>
  );
}
