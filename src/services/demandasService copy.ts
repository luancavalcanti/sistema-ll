/**
 * ============================================================================
 * 📦 SCHEMA DO BANCO DE DADOS (FIRESTORE)
 * ============================================================================
 * Coleção Principal: "demandas"
 * * Estrutura Esperada de um Documento de Demanda:
 * {
 * numero: string | number,   // Ex: "2026001" (Gerado automaticamente)
 * cliente: string,           // Nome do cliente
 * gestor: string,            // Nome do gestor responsável (Linka com users.nome)
 * local: string,             // Endereço ou agência
 * uf: string,                // Sigla do estado (Ex: "SP")
 * cidade: string,            // Nome da cidade
 * obs: string,               // Observações gerais
 * status: string,            // "Nova", "Proposta", etc. (Vem de STATUS_CONFIG)
 * valor: number,             // Valor total (Convertido de string para decimal)
 * apoio: number,             // Valor de apoio
 * gestao: number,            // Valor de gestão
 * criadoPor: string,         // UID do usuário que criou (Auth)
 * criadoEm: Timestamp,       // Data de criação gerada pelo Firebase
 * * faturamento: [             // Array de Objetos (Sub-tabela de notas fiscais)
 * {
 * notaFiscal: string,
 * dataFat: Timestamp | null,
 * valorFat: number,
 * dataCred: Timestamp | null,
 * valorCred: number,
 * cancelada: boolean
 * }
 * ]
 * }
 * * ============================================================================
 * Coleção Secundária: "extratos"
 * Relacionamento: extratos.demanda == demandas.numero
 * ============================================================================
 */

// src/services/demandasService.ts
import { collection, query, where, orderBy, onSnapshot, getDocs, Timestamp, doc, updateDoc, limit, addDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { IDemanda, IFaturamento } from "@/types/demanda";
import { User } from "firebase/auth";
import { IMovimento } from "@/types/movimento";

// Definimos o formato das respostas que o serviço vai devolver para a tela
type OnDataCallback = (demandas: IDemanda[]) => void;
type OnErrorCallback = (error: Error | unknown) => void;

export const escutarDemandas = async (
  user: User, 
  isAdmin: boolean, 
  onData: OnDataCallback, 
  onError: OnErrorCallback
) => {
  let nomeExatoDoGestor = "";

  // 1. Lógica para encontrar o nome correto do Gestor (Se não for Admin)
  if (!isAdmin && user) {
    try {
      const userQuery = query(collection(db, "users"), where("email", "==", user.email));
      const querySnapshot = await getDocs(userQuery);
      
      if (!querySnapshot.empty) {
        nomeExatoDoGestor = querySnapshot.docs[0].data().nome || "";
      } else {
        nomeExatoDoGestor = user.displayName || user.email || "";
      }
    } catch (error) {
      console.error("Erro no serviço ao buscar usuário:", error);
      nomeExatoDoGestor = user.displayName || user.email || "";
    }
  }

  // 2. Monta a Query (Admin vê tudo, User vê as próprias)
  const baseRef = collection(db, "demandas");
  const q = isAdmin
    ? query(baseRef, orderBy("numero", "desc"))
    : query(baseRef, where("gestor", "==", nomeExatoDoGestor), orderBy("numero", "desc"));

  // 3. Inicia o "espião" (Listener) do banco de dados
  const unsubscribe = onSnapshot(
    q,
    (snapshot) => {
      const listaTratada = snapshot.docs.map((doc) => {
        const d = doc.data();
        return {
          id: doc.id,
          ...d, // Puxa os outros campos dinamicamente
          numero: d.numero || 0,
          cliente: d.cliente || "N/A",
          local: d.local || "N/A",
          cidade: d.cidade || "N/A",
          uf: d.uf || "",
          status: d.status || "Nova",
          valor: Number(d.valor) || 0,
          gestao: Number(d.gestao) || 0,
          apoio: Number(d.apoio) || 0,
          faturamento: Array.isArray(d.faturamento)
            ? d.faturamento.map((f: Record<string, unknown>) => ({
                ...f,
                dataFat: f.dataFat instanceof Timestamp ? f.dataFat.toDate() : null,
                dataCred: f.dataCred instanceof Timestamp ? f.dataCred.toDate() : null,
              }))
            : [],
        } as IDemanda;
      });

      // Devolve os dados prontinhos para a tela!
      onData(listaTratada);
    },
    (error) => {
      onError(error);
    }
  );

  // Retorna a função de desligar o espião para que a tela possa limpá-lo ao fechar
  return unsubscribe;
};

// Função para buscar UMA única demanda pelo ID
export const obterDemandaPorId = async (id: string) => {
  const docRef = doc(db, "demandas", id);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      ...data,
      faturamento: data.faturamento && Array.isArray(data.faturamento)
        ? data.faturamento.map((fat: Record<string, unknown>, index: number) => ({
            ...fat,
            idGrid: `fat-${index}-${Date.now()}` // Cria o ID pro Grid na hora de ler
          }))
        : []
    };
  }
  return null; // Retorna null se não achar
};

// Função para escutar os Movimentos/Extratos de uma demanda específica
export const escutarMovimentosDaDemanda = (
  numeroDaDemanda: string | number,
  onData: (movimentos: IMovimento[]) => void
) => {
  const q = query(
    collection(db, "extratos"), 
    where("demanda", "==", String(numeroDaDemanda))
  );
  
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const docs = snapshot.docs.map((doc) => {
      const data = doc.data();
      let dataFormatada = data.data;
      
      // Converte Timestamp do Firebase para String de data YYYY-MM-DD
      if (data.data && typeof data.data.toDate === "function") {
        const jsDate = data.data.toDate();
        dataFormatada = `${jsDate.getFullYear()}-${String(jsDate.getMonth() + 1).padStart(2, "0")}-${String(jsDate.getDate()).padStart(2, "0")}`;
      }
      return { id: doc.id, ...data, data: dataFormatada } as IMovimento;
    });

    // Ordena do mais recente para o mais antigo
    docs.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
    
    onData(docs);
  });

  return unsubscribe;
};

// Função para Atualizar a Demanda e salvar o faturamento
export const atualizarDemanda = async (
  id: string, 
  demandaData: Partial<IDemanda>, 
  faturamentos: IFaturamento[]
) => {
  const docRef = doc(db, "demandas", id);
  // Remove o 'idGrid' antes de mandar pro banco pra não sujar a base
  const faturamentoParaSalvar = faturamentos.map(({ idGrid, ...rest }) => rest);

  await updateDoc(docRef, {
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
    faturamento: faturamentoParaSalvar,
  });
};

// Função para descobrir o número da próxima demanda (ex: 2026005)
export const obterProximoNumeroDemanda = async () => {
  const anoAtual = new Date().getFullYear();
  const q = query(collection(db, "demandas"), orderBy("numero", "desc"), limit(1));
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    return `${anoAtual}001`;
  } else {
    const ultimoNumeroStr = snapshot.docs[0].data().numero.toString();
    const anoUltima = parseInt(ultimoNumeroStr.substring(0, 4));
    const sequenciaUltima = parseInt(ultimoNumeroStr.substring(4));

    if (anoUltima === anoAtual) {
      const proximaSequencia = sequenciaUltima + 1;
      return `${anoAtual}${String(proximaSequencia).padStart(3, '0')}`;
    } else {
      return `${anoAtual}001`;
    }
  }
};

// Função para criar uma nova demanda no banco
export const criarDemanda = async (demandaData: Partial<IDemanda>, userId: string) => {
  await addDoc(collection(db, "demandas"), {
    ...demandaData,
    valor: Number(demandaData.valor) || 0, 
    status: "Nova",                    
    apoio: 0,                          
    gestao: 0,                         
    faturamento: [],                   
    criadoPor: userId,
    criadoEm: new Date(),
  });
};