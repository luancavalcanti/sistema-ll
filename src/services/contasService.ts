// src/services/contasService.ts

import { supabase } from "@/lib/supabase";
import { IContaAPagar } from "@/types/conta";

// --- FUNÇÃO AUXILIAR: MÁGICA DA NOMENCLATURA ---
// Ex: 2026-01-09-BRD-BLT-285,59(CREA PE - ART - 2025097)
const gerarNomeArquivo = (
  conta: IContaAPagar,
  tipoArquivo: "Boleto" | "NF",
  extensao: string,
) => {
  const [ano, mes, dia] = conta.data_vencimento.split("-");
  const valorFormatado = Number(conta.valor).toFixed(2).replace(".", ",");

  let descricao = conta.fornecedor;
  if (conta.demanda_numero) {
    descricao += ` - ${conta.demanda_numero}`;
  }

  // Se for parcelado, adicionamos o indicador da parcela (ex: P1, P2) no nome
  const sufixoParcela = 
  (conta.parcela && conta.parcela !== "Única") ? `_P${conta.parcela.split("/")[0]}` : "";

  return `${ano}-${mes}-${dia}-${conta.tipo}-${valorFormatado}(${descricao})${sufixoParcela}_${tipoArquivo}.${extensao}`;
};

// --- FUNÇÃO AUXILIAR: UPLOAD PARA O STORAGE ---
const uploadArquivo = async (
  file: File,
  conta: IContaAPagar,
  tipoArquivo: "Boleto" | "NF",
) => {
  if (!file) return null;

  const extensao = file.name.split(".").pop() || "pdf";
  const nomeArquivo = gerarNomeArquivo(conta, tipoArquivo, extensao);

  // Organizando em pastas por ano/mês no Supabase para não virar bagunça
  const [ano, mes] = conta.data_vencimento.split("-");
  const caminhoBucket = `${ano}/${mes}/${nomeArquivo}`;

  const { data, error } = await supabase.storage
    .from("documentos_financeiros")
    .upload(caminhoBucket, file, { upsert: true }); // upsert substitui se já existir

  if (error) {
    console.error(`Erro ao subir o arquivo ${tipoArquivo}:`, error);
    throw new Error(`Falha no upload do ${tipoArquivo}`);
  }

  return caminhoBucket; // Retorna o caminho para salvarmos na tabela
};

// ==========================================
// FUNÇÕES PRINCIPAIS DO CRUD
// ==========================================

// 1. CRIAR CONTA COM ANEXOS
export const criarContaAPagar = async (
  contaData: IContaAPagar,
  userId: string,
  arquivoBoleto?: File,
  arquivoNF?: File,
) => {
  let caminhoBoleto = null;
  let caminhoNF = null;

  // Se o usuário anexou arquivos, faz o upload e renomeia antes de salvar no banco
  if (arquivoBoleto) {
    caminhoBoleto = await uploadArquivo(arquivoBoleto, contaData, "Boleto");
  }
  if (arquivoNF) {
    caminhoNF = await uploadArquivo(arquivoNF, contaData, "NF");
  }

  // Agora salva os dados de texto + os caminhos dos arquivos na tabela
  const { data, error } = await supabase
    .from("contas_a_pagar")
    .insert({
      fornecedor: contaData.fornecedor,
      demanda_numero: contaData.demanda_numero,
      valor: Number(contaData.valor),
      data_vencimento: contaData.data_vencimento,
      tipo: contaData.tipo,
      parcela: contaData.parcela || "Única",
      status: "Pendente",
      arquivo_boleto: caminhoBoleto,
      arquivo_nf: caminhoNF,
      observacao: contaData.observacao,
      criado_por: userId,
    })
    .select();

  if (error) throw new Error(error.message);

  return data[0];
};

// 2. BUSCAR TODAS AS CONTAS
export const buscarContasAPagar = async (): Promise<IContaAPagar[]> => {
  const { data, error } = await supabase
    .from("contas_a_pagar")
    .select("*")
    .order("data_vencimento", { ascending: true }); // Traz as mais antigas/vencendo primeiro

  if (error) throw new Error(error.message);
  return data as IContaAPagar[];
};

// 3. DAR BAIXA NO PAGAMENTO (Mudar para Pago)
export const darBaixaConta = async (
  conta: IContaAPagar,
  movimentoId?: string,
) => {
  // 1. Dá baixa na conta atual
  const { error } = await supabase
    .from("contas_a_pagar")
    .update({
      status: "Pago",
      movimento_id: movimentoId,
    })
    .eq("id", conta.id);

  if (error) throw new Error(error.message);

  // 2. VERIFICA SE A COLUNA PARCELA É "Recorrente"
  if (conta.parcela === "Recorrente") {
    const [ano, mes, dia] = conta.data_vencimento.split("-").map(Number);
    const proximaData = new Date(ano, mes, dia);

    if (proximaData.getMonth() !== mes % 12) proximaData.setDate(0);

    const y = proximaData.getFullYear();
    const m = String(proximaData.getMonth() + 1).padStart(2, "0");
    const d = String(proximaData.getDate()).padStart(2, "0");
    const novaDataVencimento = `${y}-${m}-${d}`;

    // 3. Cria a nova conta "clone"
    const { error: erroRecorrente } = await supabase
      .from("contas_a_pagar")
      .insert({
        fornecedor: conta.fornecedor,
        demanda_numero: conta.demanda_numero,
        valor: Number(conta.valor),
        data_vencimento: novaDataVencimento,
        tipo: conta.tipo, // (Lembrando que tiramos o banco)
        parcela: "Recorrente", // Mantém a flag na coluna parcela
        status: "Pendente",
        observacao: conta.observacao,
        criado_por: conta.criado_por,
      });

    if (erroRecorrente) {
      console.error("Erro ao gerar a próxima recorrência:", erroRecorrente);
    }
  }
};

// 4. GERAR LINK SEGURO PARA VISUALIZAR O PDF
// Como o bucket é privado, precisamos gerar uma URL que expira em alguns minutos
export const obterUrlSeguraArquivo = async (caminhoArquivo: string) => {
  if (!caminhoArquivo) return null;

  // Gera uma URL que vale por 60 segundos (segurança máxima)
  const { data, error } = await supabase.storage
    .from("documentos_financeiros")
    .createSignedUrl(caminhoArquivo, 60);

  if (error) {
    console.error("Erro ao gerar link do arquivo:", error);
    return null;
  }

  return data.signedUrl;
};

// 5. ATUALIZAR CONTA A PAGAR E ANEXOS
export const atualizarContaAPagar = async (
  conta: IContaAPagar,
  novoArquivoBoleto?: File,
  novoArquivoNF?: File,
) => {
  let caminhoBoleto = conta.arquivo_boleto;
  let caminhoNF = conta.arquivo_nf;

  // Se veio arquivo novo, faz o upload e pega o novo caminho
  if (novoArquivoBoleto) {
    caminhoBoleto = await uploadArquivo(novoArquivoBoleto, conta, "Boleto");
  }
  if (novoArquivoNF) {
    caminhoNF = await uploadArquivo(novoArquivoNF, conta, "NF");
  }

  // Atualiza no banco
  const { error } = await supabase
    .from("contas_a_pagar")
    .update({
      fornecedor: conta.fornecedor,
      demanda_numero: conta.demanda_numero,
      valor: Number(conta.valor),
      data_vencimento: conta.data_vencimento,
      tipo: conta.tipo,
      arquivo_boleto: caminhoBoleto,
      arquivo_nf: caminhoNF,
    })
    .eq("id", conta.id);

  if (error) {
    console.error("Erro ao atualizar conta:", error);
    throw new Error(error.message);
  }
};


export async function excluirContaAPagar(id: string | number) {
  const { error } = await supabase
    .from('contas_a_pagar')
    .delete()
    .eq('id', id);

  if (error) {
    console.error("Erro ao excluir conta:", error.message);
    throw new Error("Não foi possível excluir a conta.");
  }

  return true;
}
