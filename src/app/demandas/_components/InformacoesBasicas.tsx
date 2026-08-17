import React from "react";
import { Paper, Typography, Box, TextField, MenuItem, Divider } from "@mui/material";
import { IDemanda, STATUS_CONFIG } from "@/types/demanda";

interface InformacoesBasicasProps {
  demanda: Partial<IDemanda>;
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  ufs: { sigla: string; nome: string }[];
  cidades: { nome: string }[];
  role?: string | null;
}

export default function InformacoesBasicas({ demanda, handleChange, ufs, cidades, role }: InformacoesBasicasProps) {
  
  // --- MÁSCARA INTELIGENTE DE MOEDA ---
  const handleCurrencyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // 1. Remove tudo que não for número (pontos, vírgulas, letras etc)
    const apenasDigitos = value.replace(/\D/g, "");
    
    // 2. Se o usuário apagar tudo, limpa o estado no componente pai
    if (!apenasDigitos) {
      handleChange({ target: { name, value: "" } } as any);
      return;
    }

    // 3. Converte para decimal. Exemplo: se tem "1234", vira 12.34
    const valorDecimal = (Number(apenasDigitos) / 100).toFixed(2);
    
    // 4. Manda pro pai o valor "limpo" (com ponto). 
    // Assim o Firebase e os cálculos continuam funcionando em paz.
    handleChange({ target: { name, value: valorDecimal } } as any);
  };

  // Pega o número cru do banco (ex: 1200.5) e formata para a tela (1.200,50)
  const formatarParaExibicao = (valor: any) => {
    if (valor === undefined || valor === null || valor === "") return "";
    return Number(valor).toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <Paper sx={{ p: 4, borderRadius: 3, display: "flex", flexDirection: "column", gap: 3 }}>
      <Typography variant="h6" sx={{ fontWeight: 700, color: "primary.main" }}>
        1. Informações Básicas
      </Typography>

      <Box sx={{ display: "flex", gap: 2, flexDirection: { xs: "column", md: "row" } }}>
        <TextField sx={{ flex: 1 }} label="Cliente" name="cliente" value={demanda.cliente || ""} onChange={handleChange} />
        <TextField select sx={{ flex: 1 }} label="Gestor" name="gestor" value={demanda.gestor || ""} onChange={handleChange}>
            {["Edvaldo Cavalcanti", "Tiago Santana"].map((gestor, idx) => 
                <MenuItem key ={idx} value={gestor}>{gestor}</MenuItem>
            )}
        </TextField>
        <TextField 
          sx={{ flex: 0.5 }} 
          select 
          label="Status" 
          name="status" 
          value={demanda.status || "Nova"} 
          onChange={handleChange}
          SelectProps={{
            renderValue: (selected) => {
              const val = selected as string;
              return (
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, overflow: "hidden" }}>
                  <Box sx={{ width: 4, height: 16, borderRadius: 2, flexShrink: 0, bgcolor: STATUS_CONFIG[val] || "#ccc" }} />
                  <Box sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {val === "Autorizada a Faturar" ? "Aut. a Faturar" : val}
                  </Box>
                </Box>
              );
            }
          }}
        >
          {[
            "Nova", "Proposta", "Aprovada", "Concluída", "Autorizada a Faturar", 
            "Faturada", "Creditada", "Cancelada", "Declinada"
          ].map((st) => {
            const elementos = [];
            if (st === "Cancelada") {
              elementos.push(<Divider key="div-status" />);
            }
            elementos.push(
              <MenuItem key={st} value={st} sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <Box sx={{ width: 4, height: 16, borderRadius: 2, flexShrink: 0, bgcolor: STATUS_CONFIG[st] || "#ccc" }} />
                <Box sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {st === "Autorizada a Faturar" ? "Aut. a Faturar" : st}
                </Box>
              </MenuItem>
            );
            return elementos;
          })}
        </TextField>
      </Box>

      <Box sx={{ display: "flex", gap: 2, flexDirection: { xs: "column", md: "row" } }}>
        <TextField sx={{ flex: 1 }} select label="UF" name="uf" value={demanda.uf || ""} onChange={handleChange}>
          {ufs.map((u) => (
            <MenuItem key={u.sigla} value={u.sigla}>{u.sigla} - {u.nome}</MenuItem>
          ))}
        </TextField>
        <TextField sx={{ flex: 1 }} select label="Cidade" name="cidade" value={demanda.cidade || ""} onChange={handleChange} disabled={!demanda.uf}>
          {cidades.map((c) => (
            <MenuItem key={c.nome} value={c.nome}>{c.nome}</MenuItem>
          ))}
        </TextField>
      </Box>

      <Box sx={{ display: "flex", gap: 2, flexDirection: { xs: "column", md: "row" } }}>
        <TextField sx={{ flex: 2 }} label="Local (Agência/Endereço)" name="local" value={demanda.local || ""} onChange={handleChange} />
        <TextField sx={{ flex: 1 }} label="Tópico (Resumo)" name="topico" value={demanda.topico || ""} onChange={handleChange} inputProps={{ maxLength: 15 }} helperText="Máx. 15 caracteres" />
      </Box>

      <Box sx={{ display: "flex", gap: 2, flexDirection: { xs: "column", md: "row" } }}>
        <TextField 
          sx={{ flex: 1 }} 
          label="Valor Total da Demanda (R$)" 
          name="valor" 
          value={formatarParaExibicao(demanda.valor)} 
          onChange={handleCurrencyChange} 
        />
        {role !== "user" && (
          <>
            <TextField 
              sx={{ flex: 1 }} 
              label="Valor Apoio (R$)" 
              name="apoio" 
              value={formatarParaExibicao(demanda.apoio)} 
              onChange={handleCurrencyChange} 
            />
            <TextField 
              sx={{ flex: 1 }} 
              label="Valor Gestão (R$)" 
              name="gestao" 
              value={formatarParaExibicao(demanda.gestao)} 
              onChange={handleCurrencyChange} 
            />
          </>
        )}
      </Box>

      <TextField fullWidth multiline rows={3} label="Escopo" name="obs" value={demanda.obs || ""} onChange={handleChange} />

      <TextField fullWidth multiline rows={3} label="Notas Adicionais" name="notas" value={demanda.notas || ""} onChange={handleChange} />
    </Paper>
  );
}