import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { Resend } from 'resend'; // Assumindo que você usa Resend, ou ajuste para o seu serviço

const resend = new Resend(process.env.RESEND_API_KEY);

export async function GET() {
  try {
    const hoje = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/New_York',
    }).format(new Date());

    console.log(`Buscando pagamentos para: ${hoje}`);

    const { data: pagamentos, error } = await supabase
      .from('contas_a_pagar')
      .select('*')
      .eq('data_vencimento', hoje)
      .eq('status', 'pendente'); // Só avisa o que ainda não foi pago

    if (error) throw error;

    if (!pagamentos || pagamentos.length === 0) {
      return NextResponse.json({ message: "Nenhum pagamento pendente para hoje." });
    }

    // Montando o texto do e-mail com os pagamentos encontrados
    const listaPagamentos = pagamentos.map(p => 
      `- ${p.descricao}: R$ ${Number(p.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
    ).join('\n');

    // Enviando o e-mail
    await resend.emails.send({
      from: 'Sistema <onboarding@resend.dev>', // Ou seu domínio verificado
      to: 'seu-email@dominio.com', // COLOQUE SEU EMAIL AQUI
      subject: `🔔 Alerta de Vencimento - ${hoje}`,
      text: `Olá! Os seguintes pagamentos vencem hoje:\n\n${listaPagamentos}\n\nVerifique o sistema para mais detalhes.`,
    });

    console.log(`E-mail enviado para ${pagamentos.length} pagamentos.`);

    return NextResponse.json({ 
      success: true, 
      sent: true,
      count: pagamentos.length 
    });

  } catch (err: any) {
    console.error("Erro no Cron/Email:", err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}