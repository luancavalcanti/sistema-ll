import { configEmpresa } from "@/config/empresa";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { INotaFiscalUI } from "../page";

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
  faturadas: INotaFiscalUI[],
  creditadas: INotaFiscalUI[],
  comDesconto: INotaFiscalUI[],
) {
  // 1. Inicia o documento (Retrato, Pontos, A4)
  const doc = new jsPDF("p", "pt", "a4");
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // 2. Carrega as imagens da configuração da empresa
  let imgLogo: HTMLImageElement | null = null;

  try {
    imgLogo = await carregarImagem(configEmpresa.logoUrl);
  } catch (error) {
    console.warn("Imagens de cabeçalho não encontradas. Gerando sem timbrado.");
  }

  // 3. Função para desenhar fundo e logo centralizada
  const desenharFundoELogo = () => {
    if (imgLogo) {
      let finalWidth = configEmpresa.pdf.logoWidth;
      let finalHeight = configEmpresa.pdf.logoHeight;

      const proporcaoOriginal = imgLogo.width / imgLogo.height;

      if (finalWidth && !finalHeight) {
        finalHeight = finalWidth / proporcaoOriginal;
      } else if (finalHeight && !finalWidth) {
        finalWidth = finalHeight * proporcaoOriginal;
      } else if (!finalWidth && !finalHeight) {
        finalWidth = 100;
        finalHeight = 100 / proporcaoOriginal;
      }

      const centroX = (pageWidth - finalWidth) / 2;

      doc.addImage(
        imgLogo,
        "PNG",
        centroX,
        configEmpresa.pdf.logoY,
        finalWidth,
        finalHeight!,
      );
    }
  };

  // --- CONTEÚDO ---
  desenharFundoELogo();

  let yAtual = configEmpresa.pdf.margemTopo;
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

  const totalFaturado = faturadas.reduce((acc, n) => acc + n.valor_fat, 0);

  autoTable(doc, {
    startY: yAtual,
    head: [["NF", "Data Emissão", "Demanda", "Valor Faturado"]],
    body: [
      ...faturadas.map((n) => [
        n.nota_fiscal,
        formatarData(n.data_fat),
        n.demandaId || "---",
        formatarMoeda(n.valor_fat),
      ]),
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
    headStyles: { fillColor: [41, 128, 185] },
    margin: {
      top: configEmpresa.pdf.margemTopo,
      bottom: configEmpresa.pdf.margemBaixo,
    },
    didDrawPage: desenharFundoELogo,
  });

  yAtual = (doc as any).lastAutoTable.finalY + 30;

  // TABELA 2: CREDITADAS
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("2. Notas Fiscais Recebidas (Crédito em Conta)", 40, yAtual);
  yAtual += 10;

  const totalOriginalCred = creditadas.reduce((acc, n) => acc + n.valor_fat, 0);
  const totalCreditado = creditadas.reduce(
    (acc, n) => acc + (n.valor_cred || 0),
    0,
  );

  autoTable(doc, {
    startY: yAtual,
    head: [["NF", "Data Crédito", "Valor Original (NF)", "Valor Creditado"]],
    body: [
      ...creditadas.map((n) => [
        n.nota_fiscal,
        formatarData(n.data_cred),
        formatarMoeda(n.valor_fat),
        formatarMoeda(n.valor_cred || 0),
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
    headStyles: { fillColor: [39, 174, 96] },
    margin: {
      top: configEmpresa.pdf.margemTopo,
      bottom: configEmpresa.pdf.margemBaixo,
    },
    didDrawPage: desenharFundoELogo,
  });

  // TABELA 3: DESCONTOS / RETENÇÕES
  if (comDesconto.length > 0) {
    yAtual = (doc as any).lastAutoTable.finalY + 30;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("3. Retenções / Diferenças de Crédito", 40, yAtual);
    yAtual += 10;

    const totalRetencoes = comDesconto.reduce(
      (acc, n) => acc + (n.valor_fat - (n.valor_cred || 0)),
      0,
    );

    autoTable(doc, {
      startY: yAtual,
      head: [["NF", "Valor NF", "Creditado", "Diferença (Retenção)"]],
      body: [
        ...comDesconto.map((n) => [
          n.nota_fiscal,
          formatarMoeda(n.valor_fat),
          formatarMoeda(n.valor_cred || 0),
          `- ${formatarMoeda(n.valor_fat - (n.valor_cred || 0))}`,
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
      headStyles: { fillColor: [230, 126, 34] },
      margin: {
        top: configEmpresa.pdf.margemTopo,
        bottom: configEmpresa.pdf.margemBaixo,
      },
      didDrawPage: desenharFundoELogo,
    });
  }

  // 4. RODAPÉ
  const totalPages = (doc.internal as any).getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(120, 120, 120);

    const textoEsquerda = `${configEmpresa.nome} | CNPJ: ${configEmpresa.cnpj}`;
    const textoDireita = `Página ${i} de ${totalPages}`;
    const yRodape = pageHeight - 30;

    doc.text(textoEsquerda, 40, yRodape);
    const larguraTextoDireita = doc.getTextWidth(textoDireita);
    doc.text(textoDireita, pageWidth - 40 - larguraTextoDireita, yRodape);
  }

  const nomeEmpresaArquivo = configEmpresa.nome.replace(/\s+/g, "");
  doc.save(`Relatorio_Contabil_${nomeEmpresaArquivo}_${mes}_${ano}.pdf`);
}
