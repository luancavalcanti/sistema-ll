import React, { useEffect, useState } from 'react';
import { 
  Dialog, DialogTitle, DialogContent, DialogActions, Button, 
  Typography, Box, IconButton, CircularProgress, Paper, Divider,
  Snackbar, Alert, Tooltip
} from '@mui/material';
import { Delete as DeleteIcon, AutoFixHigh as AutoFixIcon, PlayCircleOutline as PlayIcon } from '@mui/icons-material';
import { IRegraClassificacao, buscarRegras, excluirRegra, aplicarRegraRetroativa } from '@/services/regrasClassificacaoService';

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function RegrasClassificacaoModal({ open, onClose }: Props) {
  const [regras, setRegras] = useState<IRegraClassificacao[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Estados para o botão de aplicar
  const [aplicandoId, setAplicandoId] = useState<string | null>(null);
  const [snackbar, setSnackbar] = useState({ open: false, msg: "", severity: "success" as "success" | "error" | "warning" });

  useEffect(() => {
    if (open) carregarRegras();
  }, [open]);

  const carregarRegras = async () => {
    setLoading(true);
    try {
      const data = await buscarRegras();
      setRegras(data);
    } catch (error) {
      console.error("Erro ao carregar regras:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Remover esta regra de auto-preenchimento?")) {
      try {
        await excluirRegra(id);
        setRegras(prev => prev.filter(r => r.id !== id));
      } catch (error) {
        setSnackbar({ open: true, msg: "Erro ao remover regra.", severity: "error" });
      }
    }
  };

  const handleAplicarRegra = async (regra: IRegraClassificacao) => {
    if (!regra.id) return;
    setAplicandoId(regra.id);
    
    try {
      const qtdAtualizados = await aplicarRegraRetroativa(regra);
      
      if (qtdAtualizados > 0) {
        setSnackbar({ open: true, msg: `${qtdAtualizados} movimentos foram classificados automaticamente!`, severity: "success" });
      } else {
        setSnackbar({ open: true, msg: "Nenhum movimento pendente encontrado para esta regra.", severity: "warning" });
      }
    } catch (error) {
      console.error("Erro ao aplicar regra", error);
      setSnackbar({ open: true, msg: "Erro ao aplicar regra aos movimentos.", severity: "error" });
    } finally {
      setAplicandoId(null);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 'bold' }}>
        <AutoFixIcon color="primary" /> Regras de Auto-preenchimento
      </DialogTitle>
      
      <DialogContent dividers sx={{ bgcolor: '#f8f9fa', minHeight: '300px' }}>
        {loading ? (
          <CircularProgress sx={{ display: 'block', m: '10% auto' }} />
        ) : regras.length === 0 ? (
          <Typography color="text.secondary" textAlign="center" mt={4}>
            Nenhuma regra cadastrada. Salve regras dentro da tela de edição de um movimento.
          </Typography>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {regras.map((regra) => (
              <Paper key={regra.id} sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
                
                <Box sx={{ flex: 1, minWidth: '250px' }}>
                  <Typography variant="caption" color="text.secondary" fontWeight="bold">TEXTO ORIGINAL DO BANCO (GATILHO)</Typography>
                  <Typography variant="body1" fontWeight="bold" sx={{ mb: 1 }}>{regra.descricao_original}</Typography>
                  <Divider sx={{ my: 1 }} />
                  <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <Typography variant="body2"><strong>Favorecido:</strong> {regra.favorecido || '-'}</Typography>
                    <Typography variant="body2"><strong>Classificação:</strong> {regra.classificacao || '-'}</Typography>
                    <Typography variant="body2"><strong>Obs:</strong> {regra.observacao || '-'}</Typography>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Tooltip title="Aplicar aos movimentos que ainda não possuem observação">
                    <Button 
                      variant="outlined" 
                      color="primary" 
                      size="small"
                      startIcon={aplicandoId === regra.id ? <CircularProgress size={16} color="inherit" /> : <PlayIcon />}
                      disabled={aplicandoId !== null}
                      onClick={() => handleAplicarRegra(regra)}
                      sx={{ borderRadius: 2 }}
                    >
                      Aplicar
                    </Button>
                  </Tooltip>
                  
                  <Tooltip title="Excluir regra">
                    <IconButton 
                      color="error" 
                      onClick={() => handleDelete(regra.id!)}
                      disabled={aplicandoId !== null}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                </Box>

              </Paper>
            ))}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} variant="contained" color="primary" sx={{ borderRadius: 2 }}>
          Concluído
        </Button>
      </DialogActions>

      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={4000} 
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} sx={{ width: '100%', fontWeight: 'bold' }}>
          {snackbar.msg}
        </Alert>
      </Snackbar>
    </Dialog>
  );
}