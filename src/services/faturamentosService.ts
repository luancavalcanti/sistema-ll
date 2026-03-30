import { supabase } from "@/lib/supabase";
import { IFaturamento } from "@/types/faturamento";

export const buscarTodasNotasFiscais = async () => {
  // Busca limpa, sem JOIN, pois o 'demandaId' já é o número da demanda!
  const { data, error } = await supabase
    .from('faturamentos')
    .select('*')
    .order('nota_fiscal', { ascending: false });

  if (error) {
    console.error("Erro ao buscar notas fiscais:", error);
    return [];
  }

  return data;
};

export const sincronizarFaturamentoDaDemanda = async (
  demandaNumero: string | number, 
  faturamentos: IFaturamento[]
) => {
  // 1. Apaga as velhas usando o nome correto da coluna (demandaId)
  await supabase.from('faturamentos').delete().eq('demandaId', String(demandaNumero));

  // 2. Insere as novas
  if (faturamentos.length > 0) {
    const faturamentoParaInserir = faturamentos.map(fat => ({
      demandaId: String(demandaNumero),
      nota_fiscal: fat.nota_fiscal,
      valor_fat: Number(fat.valor_fat) || 0,
      valor_cred: Number(fat.valor_cred) || 0,
      data_fat: fat.data_fat || null,
      data_cred: fat.data_cred || null,
      codigo_verificacao: fat.codigo_verificacao || null,
      cancelada: fat.cancelada || false
    }));

    const { error: errorFat } = await supabase.from('faturamentos').insert(faturamentoParaInserir);
    if (errorFat) throw new Error(errorFat.message);
  }
};

export const buscarFaturamentosPorDemanda = async (numeroDemanda: string): Promise<IFaturamento[]> => {
  try {
    const { data, error } = await supabase
      .from('faturamentos')
      .select('*')
      .eq('demandaId', numeroDemanda) 
      .order('data_fat', { ascending: true }); // Ordena da nota mais antiga para a mais nova

    if (error) {
      console.error(`Erro ao buscar faturamentos da demanda ${numeroDemanda}:`, error);
      return [];
    }

    return data as IFaturamento[];
  } catch (error) {
    console.error("Erro inesperado ao buscar faturamentos:", error);
    return [];
  }
};