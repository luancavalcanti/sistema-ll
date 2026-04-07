import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase'; // Verifique se o caminho do seu cliente supabase está correto

export async function GET() {
  try {
    // 1. Pegar a data de hoje formatada exatamente como o banco espera (YYYY-MM-DD)
    // Usando 'en-CA' (Canadá) porque o formato padrão deles é YYYY-MM-DD, igual ao SQL.
    const hoje = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/New_York', // Mesmo fuso da Flórida
    }).format(new Date());

    console.log(`Buscando pagamentos para a data: ${hoje}`);

    // 2. Buscar no Supabase
    const { data, error } = await supabase
      .from('contas_a_pagar') 
      .select('*')
      .eq('data_vencimento', hoje); // Removi o filtro de status temporariamente para teste

    if (error) throw error;

    console.log(`Cron executado. Encontrados ${data?.length || 0} pagamentos.`);

    return NextResponse.json({ 
      success: true, 
      data_consultada: hoje,
      count: data?.length || 0,
      items: data 
    });

  } catch (err: any) {
    console.error("Erro no Cron:", err.message);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}