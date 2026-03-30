"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  Typography, Box, TextField, List, ListItem, ListItemText,
  IconButton, CircularProgress, Divider
} from "@mui/material";
import {
  Delete as DeleteIcon,
  AddCircle as AddIcon
} from "@mui/icons-material";

// 👇 Removido o Firebase e importado o Supabase
import { supabase } from "@/lib/supabase";

interface RegrasOcultacaoModalProps {
  open: boolean;
  onClose: () => void;
}

interface IRegra {
  id: string | number; // No Supabase pode ser UUID (string) ou BIGINT (number)
  texto: string;
}

export default function RegrasOcultacaoModal({ open, onClose }: RegrasOcultacaoModalProps) {
  const [regras, setRegras] = useState<IRegra[]>([]);
  const [novaRegra, setNovaRegra] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // 1. Busca as regras ao abrir o modal
  useEffect(() => {
    if (!open) return; // Só busca se o modal estiver aberto

    const fetchRegras = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("config_ignorar")
        .select("*")
        .order("texto", { ascending: true });

      if (error) {
        console.error("Erro ao buscar regras:", error);
      } else if (data) {
        setRegras(data);
      }
      setLoading(false);
    };

    fetchRegras();
  }, [open]);

  // 2. Adicionar nova regra
  const handleAddRegra = async () => {
    const textoTrim = novaRegra.trim();
    if (!textoTrim) return;

    // Verifica se já existe localmente
    const jaExiste = regras.some(r => r.texto.toLowerCase() === textoTrim.toLowerCase());
    if (jaExiste) {
      alert("Essa descrição já está na lista de ocultação!");
      return;
    }

    setSaving(true);
    try {
      // Faz o insert e pede para retornar o dado criado (.select().single())
      const { data, error } = await supabase
        .from("config_ignorar")
        .insert([{ texto: textoTrim }])
        .select()
        .single();

      if (error) {
        if (error.code === '23505') { // Erro de duplicidade do PostgreSQL
          alert("Essa descrição já está na lista de ocultação!");
        } else {
          console.error("Erro ao adicionar regra:", error);
        }
      } else if (data) {
        // Atualiza a lista local na ordem alfabética sem recarregar o banco
        setRegras(prev => [...prev, data].sort((a, b) => a.texto.localeCompare(b.texto)));
        setNovaRegra(""); // Limpa o input
      }
    } catch (error) {
      console.error("Erro inesperado:", error);
    } finally {
      setSaving(false);
    }
  };

  // 3. Remover regra
  const handleDeleteRegra = async (id: string | number) => {
    try {
      const { error } = await supabase
        .from("config_ignorar")
        .delete()
        .eq("id", id);

      if (error) {
        console.error("Erro ao remover regra:", error);
      } else {
        // Remove da lista na tela imediatamente
        setRegras(prev => prev.filter(r => r.id !== id));
      }
    } catch (error) {
      console.error("Erro inesperado ao excluir:", error);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 800 }}>Regras de Ocultação</DialogTitle>
      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
        
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Insira a <b>Descrição Original exata</b> gerada pelo banco. Qualquer extrato que tiver essa descrição será totalmente ignorado no sistema (não aparecerá na lista nem nos cálculos).
        </Typography>

        <Box sx={{ display: "flex", gap: 1, alignItems: "center", mt: 2 }}>
          <TextField
            fullWidth
            size="small"
            label="Descrição Exata"
            value={novaRegra}
            onChange={(e) => setNovaRegra(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddRegra()}
            disabled={saving}
          />
          <Button 
            variant="contained" 
            color="primary" 
            onClick={handleAddRegra} 
            disabled={!novaRegra.trim() || saving}
            sx={{ minWidth: "80px" }}
            startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <AddIcon />}
          >
            Add
          </Button>
        </Box>

        <Divider sx={{ my: 1 }} />

        {loading ? (
          <CircularProgress sx={{ display: "block", mx: "auto", my: 2 }} />
        ) : regras.length === 0 ? (
          <Typography color="text.secondary" textAlign="center" sx={{ my: 2 }}>
            Nenhuma regra cadastrada.
          </Typography>
        ) : (
          <List sx={{ bgcolor: "#f8f9fa", borderRadius: 2, maxHeight: "300px", overflow: "auto" }}>
            {regras.map((regra) => (
              <ListItem 
                key={regra.id}
                secondaryAction={
                  <IconButton edge="end" color="error" onClick={() => handleDeleteRegra(regra.id)}>
                    <DeleteIcon />
                  </IconButton>
                }
                sx={{ borderBottom: "1px solid #eee" }}
              >
                <ListItemText primary={regra.texto} sx={{ wordBreak: "break-word" }} />
              </ListItem>
            ))}
          </List>
        )}

      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} variant="outlined">Fechar</Button>
      </DialogActions>
    </Dialog>
  );
}