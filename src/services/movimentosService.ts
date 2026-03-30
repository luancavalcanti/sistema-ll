// src/services/movimentosService.ts
import { supabase } from "@/lib/supabase";
import { IMovimento } from "@/types/movimento";

// ============================================================================
// BUSCAR TODOS OS MOVIMENTOS (SUPABASE) - Usado na tela principal
// ============================================================================
export const buscarTodosMovimentos = async () => {
  let todosOsMovimentos: any[] = [];
  let buscando = true;
  let inicio = 0;
  const limite = 1000; // Tamanho do lote que o Supabase aceita

  // O loop continua rodando até não vir mais nada do banco
  while (buscando) {
    const { data, error } = await supabase
      .from('movimentos')
      .select('*')
      .order('data', { ascending: false }) // Mantém a ordenação
      .range(inicio, inicio + limite - 1); // Pega o lote atual (ex: 0 a 999)

    if (error) {
      console.error("Erro ao buscar movimentos no lote:", error);
      break; // Se der erro, para o loop
    }

    if (data && data.length > 0) {
      // Junta o que já tínhamos com o novo lote
      todosOsMovimentos = [...todosOsMovimentos, ...data];
      inicio += limite; // Prepara para o próximo lote (ex: 1000 a 1999)

      // Se vieram menos de 1000 itens, significa que chegamos no final da tabela!
      if (data.length < limite) {
        buscando = false;
      }
    } else {
      // Se não vier nada, acabou.
      buscando = false;
    }
  }

  return todosOsMovimentos;
};

// ============================================================================
// BUSCAR MOVIMENTOS DE UMA DEMANDA (SUPABASE)
// ============================================================================
export const buscarMovimentosDaDemanda = async (
  numeroDaDemanda: string | number
): Promise<IMovimento[]> => {
  
  const { data, error } = await supabase
    .from('movimentos')
    .select('*')
    .eq('demanda', String(numeroDaDemanda))
    .order('data', { ascending: false }); 

  if (error) {
    console.error("Erro ao buscar movimentos:", error);
    return [];
  }

  // Se você tiver alguma tradução de camelCase/snake_case para fazer, faria aqui.
  // Pelo seu script de migração, os nomes já pareciam bem alinhados.
  return data as IMovimento[];
};

// ============================================================================
// BUSCAR REGRAS DE OCULTAÇÃO (SUPABASE)
// ============================================================================
export const buscarRegrasOcultacao = async (): Promise<string[]> => {
  const { data, error } = await supabase
    .from('config_ignorar')
    .select('texto');

  if (error) {
    console.error("Erro ao buscar regras:", error);
    return [];
  }
  return data.map(d => d.texto.toLowerCase());
};

// ============================================================================
// BUSCAR UM ÚNICO MOVIMENTO PELO ID (SUPABASE)
// ============================================================================
export const obterMovimentoPorId = async (id: string): Promise<IMovimento | null> => {
  const { data, error } = await supabase
    .from('movimentos')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error("Erro ao buscar movimento:", error);
    return null;
  }
  return data as IMovimento;
};

// ============================================================================
// ATUALIZAR MOVIMENTO (SUPABASE)
// ============================================================================
export const atualizarMovimento = async (id: string, dados: Partial<IMovimento>) => {
  const { error } = await supabase
    .from('movimentos')
    .update({
      favorecido: dados.favorecido || '',
      classificacao: dados.classificacao || '',
      observacao: dados.observacao || '',
      demanda: dados.demanda || '', // Usamos o padrão do nosso SQL
    })
    .eq('id', id);

  if (error) throw new Error(error.message);
};

// ============================================================================
// IMPORTAR MULTIPLOS OFX (SUPABASE)
// ============================================================================
export const importarLoteOFX = async (lote: any[]) => {
  if (!lote || lote.length === 0) return { data: null, error: null };

  const { data, error } = await supabase
    .from('movimentos')
    // 👇 Mudamos o onConflict para olhar as 3 colunas juntas!
    .upsert(lote, { onConflict: 'fitid,data,valor', ignoreDuplicates: true }) 
    .select();

  return { data, error };
};