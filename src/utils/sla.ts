import { DemandaStatus } from "@/types/demanda";

export const SLA_DIAS: Record<string, number | null> = {
  "Nova": 10,
  "Proposta": 15,
  "Aprovada": 15,
  "Autorizada a Faturar": 2, 
  "Faturada": 25,
  "Concluída": 5, 
  "Cancelada": null,
  "Declinada": null,
  "Em Execução": 15, 
  "Finalizada": null,
};

/**
 * Calcula se a demanda está com o SLA estourado.
 * Retorna um objeto com os dias em atraso (se houver).
 */
export const calcularSLA = (status: string, dataAtualizacao: string | null | undefined) => {
  const limiteDias = SLA_DIAS[status];
  
  if (limiteDias === null || limiteDias === undefined || !dataAtualizacao) {
    return { atrasada: false, diasOcioso: 0, limiteDias: 0 };
  }

  let safeDate = dataAtualizacao;
  
  // Se vier no formato cru do banco (ex: 2026-07-02 03:40:01.934091+00)
  if (safeDate.includes(' ')) {
    safeDate = safeDate.replace(' ', 'T');
  }
  
  // Limita os microssegundos para milissegundos que o JS entende
  safeDate = safeDate.replace(/(\.\d{3})\d+/, '$1');
  
  // Troca o +00 por Z
  safeDate = safeDate.replace(/\+00$/, 'Z');
  
  const atualizadoEm = new Date(safeDate);
  
  // Fallback caso a data continue inválida
  if (isNaN(atualizadoEm.getTime())) {
    return { atrasada: false, diasOcioso: 0, limiteDias: 0 };
  }

  const hoje = new Date();
  
  // Zera as horas para comparar apenas os dias
  atualizadoEm.setHours(0, 0, 0, 0);
  hoje.setHours(0, 0, 0, 0);
  
  const diffTempo = hoje.getTime() - atualizadoEm.getTime();
  const diasOcioso = Math.floor(diffTempo / (1000 * 3600 * 24));

  const atrasada = diasOcioso > limiteDias;

  return {
    atrasada,
    diasOcioso,
    limiteDias
  };
};
