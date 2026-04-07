// src/app/api/pagamentos/editar/route.ts
import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(request: Request) {
  try {
    const { dados } = await request.json();

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const htmlEmail = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #f5f5f5; padding: 20px; text-align: center; border-bottom: 4px solid #ed6c02;">
          <h2 style="margin: 0; color: #333;">🔄 Pagamento Atualizado</h2>
        </div>
        <div style="padding: 20px; line-height: 1.6;">
          <p>O seguinte pagamento foi editado no sistema:</p>
          <table style="width: 100%; border-collapse: collapse;">
            <tr><td style="padding: 8px 0; color: #666;">Fornecedor:</td><td><strong>${dados.fornecedor}</strong></td></tr>
            <tr><td style="padding: 8px 0; color: #666;">Valor:</td><td><strong>R$ ${Number(dados.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></td></tr>
            <tr><td style="padding: 8px 0; color: #666;">Vencimento:</td><td><strong>${dados.data_vencimento}</strong></td></tr>
          </table>
          <p style="margin-top: 20px; font-size: 13px; color: #888;">Verifique as alterações no painel administrativo.</p>
        </div>
      </div>
    `;

    await transporter.sendMail({
      from: `"Sistema LL" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER,
      subject: `🔔 Alteração: ${dados.fornecedor}`,
      html: htmlEmail,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Erro ao enviar email de edição:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}