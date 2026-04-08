import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
  try {
    const dados = await request.json();

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"Sistema Financeiro" <${process.env.EMAIL_USER}>`,
      to: 'luan.cavalcanti@llengenharia.com.br',
      subject: `✅ Registro de Pagamento: ${dados.fornecedor}`,
      html: `
        <div style="font-family: sans-serif; border: 1px solid #eee; padding: 20px; border-radius: 8px;">
          <h2 style="color: #1976d2;">Pagamento Registrado com Sucesso</h2>
          <p>Um novo registro foi inserido no sistema de contas a pagar:</p>
          <hr style="border: 1px solid #f4f4f4; margin: 15px 0;" />
          <p><strong>Fornecedor:</strong> ${dados.fornecedor}</p>
          <p><strong>Valor:</strong> R$ ${Number(dados.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
          <p><strong>Vencimento:</strong> ${dados.data_vencimento.split('-').reverse().join('/')}</p>
          <p><strong>Parcela:</strong> ${dados.parcela}</p>
          <hr style="border: 1px solid #f4f4f4; margin: 15px 0;" />
          <p style="font-size: 12px; color: #888;">Este é um envio automático do Sistema Financero LL.</p>
        </div>
      `,
    });

    return NextResponse.json({ success: true });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error("Erro ao enviar e-mail:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}