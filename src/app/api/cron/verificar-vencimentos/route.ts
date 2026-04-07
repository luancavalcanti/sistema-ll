import { NextResponse } from "next/server";
import nodemailer from "nodemailer";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json(
      { error: "Acesso não autorizado" },
      { status: 401 },
    );
  }
  try {
    // 1. Lógica de Datas
    const hoje = new Date();
    const diaSemana = hoje.getDay();
    const format = (d: Date) => d.toISOString().split("T")[0];
    let datasParaBusca: string[] = [];

    if (diaSemana >= 1 && diaSemana <= 4) {
      const amanha = new Date();
      amanha.setDate(hoje.getDate() + 1);
      datasParaBusca = [format(amanha)];
    } else if (diaSemana === 5) {
      const sab = new Date();
      sab.setDate(hoje.getDate() + 1);
      const dom = new Date();
      dom.setDate(hoje.getDate() + 2);
      const seg = new Date();
      seg.setDate(hoje.getDate() + 3);
      datasParaBusca = [format(sab), format(dom), format(seg)];
    }

    if (datasParaBusca.length === 0) {
      return NextResponse.json({
        message: "Fim de semana: Sem pagamentos hoje.",
      });
    }

    // 2. Busca no Banco
    const { data: contas, error } = await supabaseAdmin
      .from("contas_a_pagar")
      .select("*")
      .eq("status", "Pendente")
      .in("data_vencimento", datasParaBusca);

    if (error) throw error;

    // Se não tiver boleto, encerra aqui e nem manda e-mail
    if (!contas || contas.length === 0) {
      return NextResponse.json({
        message: "Nenhum boleto pendente para amanhã.",
        enviados: 0,
      });
    }

    // 3. Configura o envio
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });

    // 4. Monta as linhas da tabela em HTML
    const linhasHtml = contas
      .map(
        (c) => `
      <tr style="border-bottom: 1px solid #eee;">
        <td style="padding: 10px;">${c.fornecedor}</td>
        <td style="padding: 10px; color: #d32f2f; font-weight: bold;">R$ ${Number(c.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</td>
        <td style="padding: 10px;">${c.data_vencimento.split("-").reverse().join("/")}</td>
        <td style="padding: 10px;">${c.parcela}</td>
      </tr>
    `,
      )
      .join("");

    // 5. Dispara o E-mail
    await transporter.sendMail({
      from: `"Sistela Financeiro LL" <${process.env.EMAIL_USER}>`,
      to: "luan.cavalcanti@llengenharia.com.br",
      subject: `📅 Alerta: ${contas.length} Pagamento(s) para o próximo dia útil`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 650px; border: 1px solid #e0e0e0; border-radius: 8px; padding: 20px;">
          <h2 style="color: #1976d2; margin-top: 0;">Relatório de Vencimentos</h2>
          <p style="color: #555;">Os seguintes pagamentos estão pendentes e agendados para o próximo dia útil:</p>
          
          <table style="width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 14px;">
            <thead style="background: #f5f5f5;">
              <tr>
                <th style="text-align: left; padding: 12px; border-radius: 4px 0 0 4px;">Fornecedor</th>
                <th style="text-align: left; padding: 12px;">Valor</th>
                <th style="text-align: left; padding: 12px;">Vencimento</th>
                <th style="text-align: left; padding: 12px; border-radius: 0 4px 4px 0;">Parcela</th>
              </tr>
            </thead>
            <tbody>
              ${linhasHtml}
            </tbody>
          </table>
          
          <div style="margin-top: 30px; padding-top: 15px; border-top: 1px solid #eee; font-size: 12px; color: #999; text-align: center;">
            Este é um resumo automático gerado pelo Sistema ACE.<br>
            Acesse o painel para realizar a baixa manual após o pagamento.
          </div>
        </div>
      `,
    });

    return NextResponse.json({ success: true, enviados: contas.length });
  } catch (error: any) {
    console.error("Erro ao enviar relatório:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
