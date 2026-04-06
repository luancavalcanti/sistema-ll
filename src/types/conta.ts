// src/types/conta.ts

export interface IContaAPagar {
  id?: string;
  fornecedor: string;
  demanda_numero?: string;
  valor: number;
  data_vencimento: string; // Formato YYYY-MM-DD
  tipo: string;
  parcela?: string;
  status?: string;
  arquivo_boleto?: string | null;
  arquivo_nf?: string | null;
  movimento_id?: string | null;
  observacao?: string;
  criado_por?: string;
  criado_em?: string;
}