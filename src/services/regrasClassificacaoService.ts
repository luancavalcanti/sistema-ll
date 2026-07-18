import { supabase } from '@/lib/supabase';

export interface IRegraClassificacao {
  id?: string;
  descricao_original: string;
  favorecido?: string;
  classificacao?: string;
  observacao?: string;
}

export const buscarRegras = async (): Promise<IRegraClassificacao[]> => {
  const { data, error } = await supabase.from('regras_classificacao').select('*').order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
};

export const salvarRegra = async (regra: IRegraClassificacao): Promise<void> => {
  // O upsert garante que se já existir uma regra para aquela descrição, ele atualiza em vez de dar erro
  const { error } = await supabase.from('regras_classificacao').upsert([regra], { onConflict: 'descricao_original' });
  if (error) throw new Error(error.message);
};

export const excluirRegra = async (id: string): Promise<void> => {
  const { error } = await supabase.from('regras_classificacao').delete().eq('id', id);
  if (error) throw new Error(error.message);
};

export const aplicarRegraRetroativa = async (regra: IRegraClassificacao): Promise<number> => {
  const { data, error } = await supabase
    .from('movimentos')
    .update({
      favorecido: regra.favorecido,
      classificacao: regra.classificacao,
      observacao: regra.observacao
    })
    .eq('descricao', regra.descricao_original)
    // 👈 A mágica: só atualiza se a observação for nula OU vazia
    .or('observacao.is.null,observacao.eq.""') 
    .select('id'); // Traz os IDs apenas para podermos contar quantos foram alterados

  if (error) throw new Error(error.message);
  return data ? data.length : 0;
};