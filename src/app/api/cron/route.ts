import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import nodemailer from 'nodemailer';

export async function GET() {
  try {
    const hoje: string = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/New_York',
    }).format(new Date());

    console.log(`Buscando pagamentos para: ${hoje}`);

    const { data: pagamentos, error } = await supabase
      .from('contas_a_pagar')
      .select('*')
      .eq('data_vencimento', hoje)
      .eq('status', 'Pendente');

    if (error) throw error;

    if (!pagamentos || pagamentos.length === 0) {
      return NextResponse.json({ message: "Nenhum pagamento pendente para hoje." });
    }

    // Configurando o Nodemailer (usando as variáveis que você já tem)
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com", // Ou o seu provedor
      port: 465,
      secure: true,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const listaPagamentos = pagamentos.map(p => 
      `- ${p.descricao}: R$ ${Number(p.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
    ).join('\n');

    await transporter.sendMail({
      from: `"Sistema LL" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER, // Enviando para você mesmo
      subject: `🔔 Alerta de Vencimento - ${hoje}`,
      text: `Olá! Os seguintes pagamentos vencem hoje:\n\n${listaPagamentos}\n\nVerifique o sistema para mais detalhes.`,
    });

    console.log(`E-mail enviado via Nodemailer para ${pagamentos.length} pagamentos.`);

    return NextResponse.json({ success: true, sent: true });

  } catch (err: any) {
    console.error("Erro no Cron/Nodemailer:", err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}