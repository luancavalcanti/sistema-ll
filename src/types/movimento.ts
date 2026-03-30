export type Classificacao = 'Fixa' | 'Obra' | 'Tributo' | 'Empréstimo' | 'Outra' | '';

export interface IMovimento {
  id: string;
  banco: string;
  descricao: string;
  data: string; // YYYY-MM-DD para facilitar os filtros
  valor: number;
  fitid: string
  // Campos preenchidos pelo usuário
  favorecido?: string;
  classificacao?: Classificacao;
  observacao?: string;
  demanda?: string; // Só usado se tipoDespesa === 'Obra'
}

