import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import nodemailer from 'nodemailer';

export async function GET() {
  try {
    // 1. Configuração de Datas (Fuso Flórida)
    const dataBase = new Date();
    const formatador = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' });
    
    const hoje = formatador.format(dataBase);
    
    const amanhaData = new Date(dataBase);
    amanhaData.setDate(dataBase.getDate() + 1);
    const amanha = formatador.format(amanhaData);

    console.log(`Rodando Cron - Hoje: ${hoje}, Amanhã: ${amanha}`);

    // 2. Consultas ao Supabase
    // Vencidos (Menor que hoje e status Pendente)
    const { data: vencidos } = await supabase
      .from('contas_a_pagar')
      .select('*')
      .lt('data_vencimento', hoje)
      .ilike('status', 'pendente');

    // Vencem Hoje
    const { data: hojePagtos } = await supabase
      .from('contas_a_pagar')
      .select('*')
      .eq('data_vencimento', hoje)
      .ilike('status', 'pendente');

    // Vencem Amanhã
    const { data: amanhaPagtos } = await supabase
      .from('contas_a_pagar')
      .select('*')
      .eq('data_vencimento', amanha)
      .ilike('status', 'pendente');

    // Se não houver nada em nenhuma categoria, encerra
    if (!vencidos?.length && !hojePagtos?.length && !amanhaPagtos?.length) {
      return NextResponse.json({ message: "Nada para notificar hoje." });
    }

    // 3. Função auxiliar para criar as linhas da tabela
    const gerarLinhas = (lista: any[], corValor: string, obs: string = "") => {
      if (!lista || lista.length === 0) return '<tr><td colspan="3" style="padding:10px; color:#999; text-align:center;">Nenhum item</td></tr>';
      
      return lista.map(p => `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #eee;">
            <strong>${p.fornecedor}</strong>${obs ? `<br><small style="color:#d32f2f;">${obs}</small>` : ''}
          </td>
          <td style="padding: 10px; border-bottom: 1px solid #eee;">${p.data_vencimento}</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold; color: ${corValor};">
            R$ ${Number(p.valor).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </td>
        </tr>
      `).join('');
    };

    // 4. Montagem do HTML
    const htmlEmail = `
      <div style="font-family: sans-serif; max-width: 650px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
        <div style="background-color: #1a237e; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 18px;">Relatório Diário de Pagamentos</h1>
        </div>
        
        <div style="padding: 20px;">
          
          <h3 style="color: #d32f2f; border-bottom: 2px solid #d32f2f; padding-bottom: 5px;">⚠️ JÁ VENCIDOS</h3>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            ${gerarLinhas(vencidos || [], '#d32f2f', '⚠️ Verificar se já foi pago e dar baixa')}
          </table>

          <h3 style="color: #ef6c00; border-bottom: 2px solid #ef6c00; padding-bottom: 5px;">📅 VENCEM HOJE</h3>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            ${gerarLinhas(hojePagtos || [], '#ef6c00')}
          </table>

          <h3 style="color: #1b5e20; border-bottom: 2px solid #1b5e20; padding-bottom: 5px;">🔵 VENCEM AMANHÃ</h3>
          <table style="width: 100%; border-collapse: collapse;">
            ${gerarLinhas(amanhaPagtos || [], '#1b5e20')}
          </table>

        </div>
        
        <div style="background-color: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; color: #777;">
          Sistema de Gestão Financeira LL - Atualizado em ${new Date().toLocaleString('pt-BR')}
        </div>
      </div>
    `;

    // 5. Envio
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });

    await transporter.sendMail({
      from: `"Gestão LL" <${process.env.EMAIL_USER}>`,
      to: "financeiro@llengenharia.com.br",
      subject: `📊 Resumo de Pagamentos: ${hoje}`,
      html: htmlEmail,
    });

    return NextResponse.json({ success: true });

  } catch (err: any) {
    console.error("Erro no Cron:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}