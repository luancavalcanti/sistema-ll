import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase'; // Verifique se o caminho do seu cliente supabase está correto

export async function GET() {
  try {
    // 1. Pegar a data de hoje (YYYY-MM-DD)
    const hoje = new Date().toISOString().split('T')[0];

    // 2. Buscar no Supabase pagamentos que vencem hoje
    // Ajuste 'contas_a_pagar' e 'data_vencimento' para os nomes reais da sua tabela/coluna
    const { data, error } = await supabase
      .from('contas_a_pagar') 
      .select('*')
      .eq('data_vencimento', hoje)
      .eq('status', 'pendente'); // Apenas os que não foram pagos

    if (error) throw error;

    console.log(`Cron executado. Encontrados ${data?.length || 0} pagamentos para hoje.`);

    return NextResponse.json({ 
      success: true, 
      count: data?.length || 0,
      items: data 
    });

  } catch (err: any) {
    console.error("Erro no Cron:", err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}