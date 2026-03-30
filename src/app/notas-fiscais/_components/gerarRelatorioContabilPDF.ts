import { configEmpresa } from "@/config/empresa";
import { INotaFiscalFlat } from "@/app/notas-fiscais/_components/NotaFiscalCard";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Função auxiliar para carregar imagem no formato que o jsPDF entende
const carregarImagem = (url: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = url;
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
  });
};

const formatarMoeda = (valor: number) =>
  valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const formatarData = (data?: string) =>
  data ? data.split("-").reverse().join("/") : "---";

export async function gerarRelatorioContabilPDF(
  mes: string,
  ano: string,
  faturadas: INotaFiscalFlat[],
  creditadas: INotaFiscalFlat[],
  comDesconto: INotaFiscalFlat[],
) {
  // 1. Inicia o documento (Retrato, Pontos, A4)
  const doc = new jsPDF("p", "pt", "a4");
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  // 2. Carrega as imagens da configuração da empresa
  let imgLogo: HTMLImageElement | null = null;

  try {
    // Tenta carregar as imagens da pasta /public
    imgLogo = await carregarImagem(configEmpresa.logoUrl);
  } catch (error) {
    console.warn("Imagens de cabeçalho não encontradas. Gerando sem timbrado.");
  }

  // 3. Configura a função que desenha o fundo em TODAS as páginas
  // O autoTable chama isso automaticamente se a tabela quebrar para a página 2
  const desenharFundoELogo = () => {
    // 2. Desenha a Logo calculando a proporção real da imagem
    // 2. Desenha a Logo calculando a proporção real da imagem e CENTRALIZANDO
    if (imgLogo) {
      let finalWidth = configEmpresa.pdf.logoWidth;
      let finalHeight = configEmpresa.pdf.logoHeight;

      // Descobre a proporção original da imagem
      const proporcaoOriginal = imgLogo.width / imgLogo.height;

      if (finalWidth && !finalHeight) {
        finalHeight = finalWidth / proporcaoOriginal;
      } else if (finalHeight && !finalWidth) {
        finalWidth = finalHeight * proporcaoOriginal;
      } else if (!finalWidth && !finalHeight) {
        finalWidth = 100;
        finalHeight = 100 / proporcaoOriginal;
      }

      // ✨ A MÁGICA DA CENTRALIZAÇÃO AQUI ✨
      // Calcula o centro exato do eixo X dinamicamente
      const centroX = (pageWidth - finalWidth) / 2;

      doc.addImage(
        imgLogo,
        "PNG",
        centroX, // <-- Agora usamos o cálculo do centro em vez do configEmpresa.pdf.logoX
        configEmpresa.pdf.logoY, // Mantemos o Y do config para controlar a distância do topo
        finalWidth,
        finalHeight!,
      );
    }
  };

  // --- COMEÇA A DESENHAR O CONTEÚDO ---
  desenharFundoELogo();
  // Título do Relatório
  let yAtual = configEmpresa.pdf.margemTopo; // Começa a escrever abaixo do cabeçalho
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(`Relatório de Faturamento Contábil - ${mes}/${ano}`, 40, yAtual);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  yAtual += 15;
  doc.text(
    `Empresa: ${configEmpresa.nome} | CNPJ: ${configEmpresa.cnpj}`,
    40,
    yAtual,
  );
  yAtual += 25;

  // TABELA 1: FATURADAS
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("1. Notas Fiscais Emitidas (Faturamento)", 40, yAtual);
  yAtual += 10;

  const totalFaturado = faturadas.reduce((acc, n) => acc + n.valorFat, 0);

  autoTable(doc, {
    startY: yAtual,
    head: [["NF", "Data Emissão", "Demanda", "Valor Faturado"]],
    body: [
      ...faturadas.map((n) => [
        n.notaFiscal,
        formatarData(n.dataFat),
        n.demandaNumero,
        formatarMoeda(n.valorFat),
      ]),
      // Linha de Total
      [
        {
          content: "TOTAL FATURADO:",
          colSpan: 3,
          styles: { halign: "right", fontStyle: "bold" },
        },
        {
          content: formatarMoeda(totalFaturado),
          styles: { fontStyle: "bold", textColor: [41, 128, 185] },
        },
      ],
    ],
    theme: "striped",
    headStyles: { fillColor: [41, 128, 185] }, // Azul
    margin: {
      top: configEmpresa.pdf.margemTopo,
      bottom: configEmpresa.pdf.margemBaixo,
    },
    willDrawPage: desenharFundoELogo,
  });

  yAtual = (doc as any).lastAutoTable.finalY + 30; // Pega o Y onde a tabela anterior terminou

  // TABELA 2: CREDITADAS
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("2. Notas Fiscais Recebidas (Crédito em Conta)", 40, yAtual);
  yAtual += 10;

  const totalOriginalCred = creditadas.reduce((acc, n) => acc + n.valorFat, 0);
  const totalCreditado = creditadas.reduce(
    (acc, n) => acc + (n.valorCred || 0),
    0,
  );

  autoTable(doc, {
    startY: yAtual,
    head: [["NF", "Data Crédito", "Valor Original (NF)", "Valor Creditado"]],
    body: [
      ...creditadas.map((n) => [
        n.notaFiscal,
        formatarData(n.dataCred),
        formatarMoeda(n.valorFat),
        formatarMoeda(n.valorCred || 0),
      ]),
      [
        {
          content: "TOTAIS:",
          colSpan: 2,
          styles: { halign: "right", fontStyle: "bold" },
        },
        {
          content: formatarMoeda(totalOriginalCred),
          styles: { fontStyle: "bold" },
        },
        {
          content: formatarMoeda(totalCreditado),
          styles: { fontStyle: "bold", textColor: [39, 174, 96] },
        },
      ],
    ],
    theme: "striped",
    headStyles: { fillColor: [39, 174, 96] }, // Verde
    margin: {
      top: configEmpresa.pdf.margemTopo,
      bottom: configEmpresa.pdf.margemBaixo,
    },
    didDrawPage: desenharFundoELogo,
  });

  yAtual = (doc as any).lastAutoTable.finalY + 30;

  // TABELA 3: DESCONTOS / RETENÇÕES
  // Só desenha se houver descontos
  if (comDesconto.length > 0) {
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("3. Retenções / Diferenças de Crédito", 40, yAtual);
    yAtual += 10;

    const totalRetencoes = comDesconto.reduce(
      (acc, n) => acc + (n.valorFat - (n.valorCred || 0)),
      0,
    );

    autoTable(doc, {
      startY: yAtual,
      head: [["NF", "Valor NF", "Creditado", "Diferença (Retenção)"]],
      body: [
        ...comDesconto.map((n) => [
          n.notaFiscal,
          formatarMoeda(n.valorFat),
          formatarMoeda(n.valorCred || 0),
          `- ${formatarMoeda(n.valorFat - (n.valorCred || 0))}`,
        ]),
        [
          {
            content: "TOTAL DE RETENÇÕES:",
            colSpan: 3,
            styles: { halign: "right", fontStyle: "bold" },
          },
          {
            content: `- ${formatarMoeda(totalRetencoes)}`,
            styles: { fontStyle: "bold", textColor: [192, 57, 43] },
          },
        ],
      ],
      theme: "striped",
      headStyles: { fillColor: [230, 126, 34] }, // Laranja
      margin: {
        top: configEmpresa.pdf.margemTopo,
        bottom: configEmpresa.pdf.margemBaixo,
      },
      didDrawPage: desenharFundoELogo,
    });
  }

  // 4. CARIMBA O RODAPÉ EM TODAS AS PÁGINAS
  // Descobre quantas páginas o relatório gerou no total
  const totalPages = (doc as any).internal.getNumberOfPages();
  
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i); // Vai para a página "i"
    
    // Configura a fonte do rodapé (pequena e cinza)
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(120, 120, 120); 
    
    const textoEsquerda = `${configEmpresa.nome}  |  CNPJ: ${configEmpresa.cnpj}  |  ${configEmpresa.endereco}`;
    const textoDireita = `Página ${i} de ${totalPages}`;
    
    // Posição Y: Pega a altura total da folha e sobe 30 pontinhos
    const yRodape = pageHeight - 30; 
    
    // Desenha o texto da Esquerda (começando na margem 40)
    doc.text(textoEsquerda, 40, yRodape);
    
    // Desenha o texto da Direita (calcula a largura da frase para encostar na margem direita)
    const larguraTextoDireita = doc.getTextWidth(textoDireita);
    doc.text(textoDireita, pageWidth - 40 - larguraTextoDireita, yRodape);
  }

  // // 5. Salva o Documento (Atualize o nome para ficar mais bonito)
  const nomeEmpresaArquivo = configEmpresa.nome.replace(/\s+/g, ""); // Tira os espaços do nome
  doc.save(`Relatorio_Contabil_${nomeEmpresaArquivo}_${mes}_${ano}.pdf`);

  // 5. Salva o Documento (Baixa no navegador do usuário)
  // doc.save(`Relatorio_Contabil_${mes}_${ano}.pdf`);
}
