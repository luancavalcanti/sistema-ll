import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import nodemailer from 'nodemailer';

export async function GET() {
  try {
    const hoje: string = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/New_York',
    }).format(new Date());

    const { data: pagamentos, error } = await supabase
      .from('contas_a_pagar')
      .select('*')
      .eq('data_vencimento', hoje)
      .ilike('status', 'pendente');

    if (error) throw error;

    if (!pagamentos || pagamentos.length === 0) {
      return NextResponse.json({ message: "Nenhum pagamento pendente para hoje." });
    }

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Criando as linhas da tabela dinamicamente
    const linhasTabela = pagamentos.map(p => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #eee;">${p.fornecedor || 'Não informado'}</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; font-weight: bold; color: #d32f2f;">
          R$ ${Number(p.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #eee;">
          <span style="background: #fff3e0; color: #ef6c00; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">
            PENDENTE
          </span>
        </td>
      </tr>
    `).join('');

    // Template do E-mail em HTML
    const htmlEmail = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #1a237e; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 20px;">Alerta de Vencimento</h1>
          <p style="margin: 5px 0 0; opacity: 0.8;">Sistema de Gestão Financeira - LL</p>
        </div>
        <div style="padding: 20px;">
          <p>Olá, <strong>Luan</strong>,</p>
          <p>Identificamos os seguintes pagamentos com vencimento para <strong>hoje (${hoje})</strong>:</p>
          
          <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
            <thead>
              <tr style="background-color: #f5f5f5; text-align: left;">
                <th style="padding: 12px; border-bottom: 2px solid #1a237e;">Fornecedor</th>
                <th style="padding: 12px; border-bottom: 2px solid #1a237e;">Valor</th>
                <th style="padding: 12px; border-bottom: 2px solid #1a237e;">Status</th>
              </tr>
            </thead>
            <tbody>
              ${linhasTabela}
            </tbody>
          </table>

          <div style="margin-top: 30px; padding: 15px; background-color: #f9f9f9; border-radius: 5px; text-align: center;">
            <p style="margin: 0; color: #666; font-size: 14px;">
              Acesse o sistema para realizar os pagamentos e atualizar os comprovantes.
            </p>
          </div>
        </div>
        <div style="background-color: #f5f5f5; color: #999; padding: 15px; text-align: center; font-size: 12px;">
          Este é um e-mail automático enviado pelo Sistema LL.
        </div>
      </div>
    `;

    await transporter.sendMail({
      from: `"Sistema LL" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER,
      subject: `🔔 Alerta: Pagamento hoje (${hoje})`,
      html: htmlEmail, // Trocamos 'text' por 'html'
    });

    return NextResponse.json({ success: true, count: pagamentos.length });

  } catch (err: any) {
    console.error("Erro no Cron:", err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}