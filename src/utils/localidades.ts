import dadosEstadosCidades from "./estados-cidades.json";

export interface IUF {
  sigla: string;
  nome: string;
}

export interface ICidade {
  nome: string;
}

interface IEstadoJSON {
  sigla: string;
  nome: string;
  cidades: string[];
}

const estados: IEstadoJSON[] = (dadosEstadosCidades as { estados: IEstadoJSON[] }).estados;

export const UFS_BRASIL: IUF[] = estados
  .map((e) => ({ sigla: e.sigla, nome: e.nome }))
  .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

const mapaCidadesPorUF: Record<string, ICidade[]> = Object.fromEntries(
  estados.map((e) => [
    e.sigla.toUpperCase(),
    e.cidades.map((nome) => ({ nome })),
  ])
);

export function obterCidadesPorUF(uf?: string | null): ICidade[] {
  const sigla = uf?.trim().toUpperCase();
  if (!sigla) return [];
  return mapaCidadesPorUF[sigla] || [];
}

export async function buscarCidadesPorUF(uf: string): Promise<ICidade[]> {
  return obterCidadesPorUF(uf);
}
