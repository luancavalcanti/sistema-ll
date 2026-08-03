import { supabase } from "@/lib/supabase";
import { IDemanda } from "@/types/demanda";
import { User } from "@supabase/supabase-js";
import { IFaturamento } from "@/types/faturamento";
import { sincronizarFaturamentoDaDemanda } from "@/services/faturamentosService";

export const buscarDemandas = async (
  nomeExatoDoGestor: string, 
  isAdmin: boolean
): Promise<IDemanda[]> => {

  // 1. SELECT: Incluído apenas os campos necessários de faturamento para permitir validação de parcialidade
  let query = supabase
    .from('demandas')
    .select('*, faturamento:faturamentos(valor_fat, cancelada)')
    .order('numero', { ascending: false });

  if (!isAdmin) {
    query = query.eq('gestor', nomeExatoDoGestor);
  }

  const { data, error } = await query;

  if (error) {
    console.error("Erro ao buscar demandas no Supabase:", error);
    throw new Error(error.message);
  }

  return data as IDemanda[];
};

// 2. BUSCA POR NÚMERO (Em vez de ID) e SELECT LIMPO
export const buscarDemandaPorNumero = async (numero: string): Promise<IDemanda | null> => {
  const { data, error } = await supabase
    .from('demandas')
    .select('*') // Removido faturamento:faturamentos(*) daqui
    .eq('numero', numero) // 👈 Buscando pela coluna 'numero'
    .single();

  if (error) {
    console.error(`Erro ao buscar a demanda número ${numero}:`, error);
    return null;
  }

  return data as IDemanda;
};

// 3. ATUALIZAR (Agora atualizando também o número se houver alteração)
export const atualizarDemanda = async (
  numeroAtual: string, // 👈 Renomeei para ficar mais claro que este é o número da URL
  demandaData: Partial<IDemanda>, 
  faturamentos: IFaturamento[]
) => {
  // Descobre qual é o número final (o novo que veio da tela, ou mantém o atual)
  const numeroFinal = demandaData.numero ? String(demandaData.numero) : numeroAtual;

  // Busca a demanda atual no banco para comparar o status
  const { data: demandaAntiga, error: errorBusca } = await supabase
    .from('demandas')
    .select('status')
    .eq('numero', numeroAtual)
    .single();

  if (errorBusca) {
    console.error("Erro ao buscar demanda para atualizar:", errorBusca);
    throw new Error(errorBusca.message);
  }

  const statusMudou = demandaData.status && demandaData.status !== demandaAntiga.status;

  // Monta os dados de atualização
  const payloadAtualizacao: any = {
    numero: numeroFinal, 
    cliente: demandaData.cliente, 
    gestor: demandaData.gestor, 
    local: demandaData.local,
    uf: demandaData.uf, 
    cidade: demandaData.cidade, 
    obs: demandaData.obs, 
    status: demandaData.status,
    valor: Number(demandaData.valor), 
    apoio: Number(demandaData.apoio) || 0, 
    gestao: Number(demandaData.gestao) || 0,
  };

  // Só atualiza a data de 'atualizado_em' se o status realmente mudou
  if (statusMudou) {
    payloadAtualizacao.atualizado_em = new Date().toISOString();
  }

  // 1. Atualiza a Demanda
  const { error: errorDemanda } = await supabase
    .from('demandas')
    .update(payloadAtualizacao)
    .eq('numero', numeroAtual); // 👈 Busca pelo antigo para conseguir alterar

  if (errorDemanda) {
    console.error("Erro no update da demanda:", errorDemanda);
    throw new Error(errorDemanda.message);
  }

  // 2. Chama o serviço focado em faturamento passando o NÚMERO NOVO
  if (numeroFinal) {
    await sincronizarFaturamentoDaDemanda(numeroFinal, faturamentos);
  }
};

// 4. MANTIDO COMO ESTÁ (A lógica do próximo número já está perfeita)
export const obterProximoNumeroDemanda = async () => {
  const anoAtual = new Date().getFullYear();
  
  const { data, error } = await supabase
    .from('demandas')
    .select('numero')
    .order('numero', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    return `${anoAtual}001`; 
  }

  const ultimoNumeroStr = String(data.numero);
  const anoUltima = parseInt(ultimoNumeroStr.substring(0, 4));
  const sequenciaUltima = parseInt(ultimoNumeroStr.substring(4));

  if (anoUltima === anoAtual) {
    const proximaSequencia = sequenciaUltima + 1;
    return `${anoAtual}${String(proximaSequencia).padStart(3, '0')}`;
  } else {
    return `${anoAtual}001`;
  }
};

// 5. MANTIDO COMO ESTÁ
export const criarDemanda = async (demandaData: Partial<IDemanda>, userId: string) => {
  const { error } = await supabase.from('demandas').insert({
    numero: demandaData.numero,
    cliente: demandaData.cliente,
    gestor: demandaData.gestor,
    local: demandaData.local,
    uf: demandaData.uf,
    cidade: demandaData.cidade,
    obs: demandaData.obs,
    valor: Number(demandaData.valor) || 0, 
    status: "Nova",                    
    apoio: 0,                          
    gestao: 0,                                             
    criadoPor: userId,
    criadoEm: new Date().toISOString(),
    atualizado_em: new Date().toISOString(),
  });

  if (error) {
    console.error("Erro ao criar demanda:", error);
    throw new Error(error.message);
  }
};