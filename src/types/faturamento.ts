export interface IFaturamento {
  id?: string;             // O UUID gerado pelo Supabase (opcional na criação, obrigatório na edição)
  demandaId?: string;      // A chave estrangeira que liga este faturamento a uma demanda
  nota_fiscal: string;
  data_fat: string;
  valor_fat: number | string; // Mantido string para facilitar sua máscara de digitação
  data_cred?: string;         // Opcional, pois a nota pode não estar paga ainda
  valor_cred?: number | string; // Opcional
  codigo_verificacao?: string; // O código que você pediu para incluir
  cancelada?: boolean;
}