import { IFaturamento } from "./faturamento";

export type DemandaStatus = 'Aberta' | 'Em Execução' | 'Finalizada' | 'Cancelada';



export interface IDemanda {
  id: string;
  numero: number;
  cliente: string; 
  local: string;
  cidade: string;
  uf: string;
  status: DemandaStatus;
  valor: number;
  gestor: string;
  gestao: number;
  apoio: number;
  obs?: string;
  faturamento?: IFaturamento[];
}

export const STATUS_CONFIG: Record<string, string> = {
  "Nova": "#6f42c1",
  "Proposta": "#0d6efd",
  "Aprovada": "#28a745",
  "Concluída": "#17a2b8",
  "Faturada": "#ffc107",
  "Creditada": "#20c997",
  "Cancelada": "#dc3545",
  "Declinada": "#b02a37"
};

// export const STATUS_CONFIG = [
//   { status: "Nova", cor: "#6f42c1" },
//   { status: "Proposta", cor: "#0d6efd" },
//   { status: "Aprovada", cor: "#28a745" },
//   { status: "Concluída", cor: "#17a2b8" },
//   { status: "Faturada", cor: "#ffc107" },
//   { status: "Creditada", cor: "#20c997" },
//   { status: "Cancelada", cor: "#dc3545" },
//   { status: "Declinada", cor: "#b02a37" }
// ];