import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
  try {
    const { conta } = await request.json();

    // Log para depuração no seu terminal do VS Code
    console.log("Servidor tentando enviar e-mail para:", conta.fornecedor);

    // 1. Configuração do Transportador (Gmail)
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // 2. Montagem do E-mail (HTML Puro para evitar erros de renderização)
    const mailOptions = {
      from: `"Sistema LL" <${process.env.EMAIL_USER}>`,
      to: 'luan.cavalcanti@llengenharia.com.br',
      subject: `Solicitação de Pagamento: ${conta.fornecedor}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; padding: 20px; border: 1px solid #eee;">
          <h2 style="color: #1976d2;">Novo Pagamento Registrado</h2>
          <p>Olá, um novo registro foi inserido e aguarda pagamento:</p>
          <hr />
          <p><strong>Fornecedor:</strong> ${conta.fornecedor}</p>
          <p><strong>Valor:</strong> R$ ${Number(conta.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          <p><strong>Vencimento:</strong> ${conta.data_vencimento.split('-').reverse().join('/')}</p>
          <p><strong>Parcela:</strong> ${conta.parcela}</p>
          <hr />
          <p style="font-size: 12px; color: #888;">Enviado via Sistema LL - Contas a Pagar.</p>
        </div>
      `,
    };

    // 3. Envio de fato
    const info = await transporter.sendMail(mailOptions);
    
    console.log("E-mail enviado com sucesso:", info.messageId);
    return NextResponse.json({ success: true, messageId: info.messageId });

  } catch (error: any) {
    // Se der erro, ele vai imprimir exatamente o que aconteceu no seu TERMINAL
    console.error("ERRO DETALHADO NO NODEMAILER:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}