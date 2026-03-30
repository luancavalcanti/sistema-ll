export interface IFaturamento {
  id?: string;             
  demandaId?: string;      
  nota_fiscal: string;
  data_fat: string;
  valor_fat: number;
  data_cred?: string;         
  valor_cred?: number;
  codigo_verificacao?: string;
  cancelada?: boolean;
}