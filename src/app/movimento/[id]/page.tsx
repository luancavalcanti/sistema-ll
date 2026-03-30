"use client";

import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, TextField, Button, CircularProgress, Paper, MenuItem, Divider, Snackbar, Alert 
} from '@mui/material';
import { 
  Save as SaveIcon, 
  ArrowBack as ArrowBackIcon,
  VisibilityOff as VisibilityOffIcon 
} from '@mui/icons-material';
import { useRouter, useParams } from 'next/navigation';
import { IMovimento, Classificacao } from '@/types/movimento';

// Importando os serviços e o Supabase
import { obterMovimentoPorId, atualizarMovimento } from '@/services/movimentosService';
import { supabase } from '@/lib/supabase';

const TIPOS_DESPESA: Classificacao[] = ['Fixa', 'Obra', 'Tributo', 'Empréstimo', 'Outra'];

export default function EditarMovimentoPage() {
  const router = useRouter();
  const params = useParams();
  const movimentoId = params.id as string;

  const [movimento, setMovimento] = useState<Partial<IMovimento>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Estados para o botão de ocultar registro
  const [ocultando, setOcultando] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, msg: "", severity: "success" as "success" | "error" | "warning" });

  // 1. Busca os dados usando o serviço
  useEffect(() => {
    const fetchMovimento = async () => {
      if (!movimentoId) return;
      try {
        const dados = await obterMovimentoPorId(movimentoId);
        if (dados) {
          setMovimento(dados);
        } else {
          console.error("Movimento não encontrado!");
        }
      } catch (error) {
        console.error("Erro ao carregar o movimento:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMovimento();
  }, [movimentoId]);

  // 2. Handlers de mudança
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    setMovimento(prev => {
      const updated = { ...prev, [name]: value };
      
      // Regra de negócio: Se mudar a classificação e NÃO for 'Obra', limpa o número da demanda
      if (name === 'classificacao' && value !== 'Obra') {
        updated.demanda = '';
      }
      
      return updated;
    });
  };

  // 3. Salvar as alterações via serviço
  const handleSave = async () => {
    setSaving(true);
    try {
      await atualizarMovimento(movimentoId, movimento);
      router.push('/movimento');
    } catch (error) {
      console.error("Erro ao salvar movimento:", error);
    } finally {
      setSaving(false);
    }
  };

  // 4. Salvar Descrição nas Regras de Ocultação
  const handleOcultarRegistro = async () => {
    if (!movimento.descricao) return;
    setOcultando(true);
    
    try {
      const { error } = await supabase
        .from('config_ignorar')
        .insert([{ texto: movimento.descricao }]);

      if (error) {
        // Código 23505 é o erro padrão do PostgreSQL para "Duplicidade de Chave Única"
        if (error.code === '23505') {
          setSnackbar({ open: true, msg: "Esta descrição já está na sua lista de regras!", severity: "warning" });
        } else {
          throw error;
        }
      } else {
        setSnackbar({ open: true, msg: "Registro ocultado com sucesso! Ele sumirá da listagem principal.", severity: "success" });
      }
    } catch (err) {
      console.error("Erro ao salvar regra:", err);
      setSnackbar({ open: true, msg: "Erro ao tentar ocultar o registro.", severity: "error" });
    } finally {
      setOcultando(false);
    }
  };

  if (loading) {
    return <CircularProgress sx={{ display: 'block', m: '10% auto' }} />;
  }

  // Formatação para exibição
  const isObra = movimento.classificacao === 'Obra';
  const dataExibicao = movimento.data ? movimento.data.split('-').reverse().join('/') : '';
  const valorExibicao = Number(movimento.valor || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const isDespesa = Number(movimento.valor) < 0;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, maxWidth: 800, mx: 'auto', pb: 5 }}>
      
      {/* CABEÇALHO */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Button variant="outlined" onClick={() => router.push('/movimento')} sx={{ minWidth: 'auto', p: 1, borderRadius: 2 }}>
            <ArrowBackIcon />
          </Button>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>
            Classificar Movimento
          </Typography>
        </Box>
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
          onClick={handleSave}
          disabled={saving}
          sx={{ borderRadius: 2, fontWeight: 'bold' }}
        >
          {saving ? 'Salvando...' : 'Salvar'}
        </Button>
      </Box>

      {/* SEÇÃO 1: DADOS ORIGINAIS DO BANCO (Somente Leitura) */}
      <Paper sx={{ p: 4, borderRadius: 3, display: 'flex', flexDirection: 'column', gap: 2, bgcolor: '#f8f9fa', border: '1px solid #e0e0e0' }}>
        <Typography variant="subtitle2" color="text.secondary" sx={{ textTransform: 'uppercase', fontWeight: 'bold' }}>
          Dados Originais do OFX
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
          <Box sx={{ flex: 1, minWidth: '150px' }}>
            <Typography variant="caption" color="text.secondary">Data</Typography>
            <Typography variant="body1" sx={{ fontWeight: 600 }}>{dataExibicao}</Typography>
          </Box>
          <Box sx={{ flex: 1, minWidth: '150px' }}>
            <Typography variant="caption" color="text.secondary">Banco</Typography>
            <Typography variant="body1" sx={{ fontWeight: 600 }}>{movimento.banco}</Typography>
          </Box>
          <Box sx={{ flex: 1, minWidth: '150px' }}>
            <Typography variant="caption" color="text.secondary">Valor</Typography>
            <Typography variant="h6" sx={{ fontWeight: 900, color: isDespesa ? 'error.main' : 'success.main', lineHeight: 1 }}>
              {valorExibicao}
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ my: 1 }} />
        
        {/* 👇 Nova estrutura da Descrição com o botão ao lado */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant="caption" color="text.secondary">Descrição Original</Typography>
            <Typography variant="body1" sx={{ fontWeight: 600 }}>{movimento.descricao}</Typography>
          </Box>
          
          <Button
            variant="outlined"
            color="secondary"
            size="small"
            startIcon={ocultando ? <CircularProgress size={16} color="inherit" /> : <VisibilityOffIcon />}
            onClick={handleOcultarRegistro}
            disabled={ocultando}
            sx={{ borderRadius: 2 }}
          >
            Ocultar Registros Iguais
          </Button>
        </Box>
      </Paper>

      {/* SEÇÃO 2: CAMPOS EDITÁVEIS */}
      <Paper sx={{ p: 4, borderRadius: 3, display: 'flex', flexDirection: 'column', gap: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, color: 'primary.main' }}>
          Classificação
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
          <TextField
            sx={{ flex: 2 }}
            label="Favorecido"
            name="favorecido"
            value={movimento.favorecido || ''}
            onChange={handleChange}
            placeholder="Nome da empresa ou pessoa"
          />
          
          <TextField
            sx={{ flex: 1, minWidth: '200px' }}
            select
            label="Tipo de Despesa"
            name="classificacao"
            value={movimento.classificacao || ''}
            onChange={handleChange}
          >
            <MenuItem value=""><em>Nenhum</em></MenuItem>
            {TIPOS_DESPESA.map((tipo) => (
              <MenuItem key={tipo} value={tipo}>{tipo}</MenuItem>
            ))}
          </TextField>
        </Box>

        {/* Mostra o campo de Demanda APENAS se o tipo for Obra */}
        {isObra && (
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              sx={{ width: { xs: '100%', sm: '50%' } }}
              label="Número da Demanda"
              name="demanda" 
              value={movimento.demanda || ''}
              onChange={handleChange}
              placeholder="Ex: 2026001"
              helperText="Vincule esta despesa a uma demanda específica"
            />
          </Box>
        )}

        <TextField
          fullWidth
          multiline
          rows={3}
          label="Observação (Substitui a descrição original na listagem)"
          name="observacao"
          value={movimento.observacao || ''}
          onChange={handleChange}
          placeholder="Adicione notas, justificativas ou um título mais claro para este movimento..."
        />
      </Paper>

      {/* AVISO NA TELA */}
      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={4000} 
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setSnackbar(prev => ({ ...prev, open: false }))} severity={snackbar.severity} sx={{ width: '100%', fontWeight: 'bold' }}>
          {snackbar.msg}
        </Alert>
      </Snackbar>

    </Box>
  );
}