const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://wuudixeadruhknxwmubu.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1dWRpeGVhZHJ1aGtueHdtdWJ1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NjQ2MjAsImV4cCI6MjA5MDA0MDYyMH0.ZnQulHnneudvYzX0PAktoVR_3IPYuS-wfsh9LTdMxF8';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log("=== FATURAMENTOS ===");
  const { data: faturamentos, error: fError } = await supabase
    .from('faturamentos')
    .select('*')
    .eq('valor_cred', 17383.75);
  console.log(JSON.stringify(faturamentos, null, 2), fError);

  console.log("\n=== TEST SYNC ===");
  if (faturamentos && faturamentos.length > 0) {
    const fat = faturamentos[0];
    const demandaNumero = fat.demandaId;
    
    const { data: demanda, error: dError } = await supabase
      .from('demandas')
      .select('cliente')
      .eq('numero', String(demandaNumero))
      .single();
    
    console.log("Demanda found:", demanda, dError);

    if (demanda) {
        const { data: movimentosMatch, error: mMatchError } = await supabase
          .from('movimentos')
          .select('*')
          .eq('data', fat.data_cred)
          .eq('valor', fat.valor_cred);
        
        console.log("Movimentos match:", movimentosMatch, mMatchError);
          
        const movToUpdate = movimentosMatch?.find(m => !m.classificacao || m.classificacao === '');
        console.log("Mov to update:", movToUpdate);
        
        if (movToUpdate) {
            console.log("WILL UPDATE ID:", movToUpdate.id);
            const res = await supabase
              .from('movimentos')
              .update({
                favorecido: demanda.cliente,
                classificacao: 'Crédito Cliente',
                nota_fiscal: fat.nota_fiscal,
                observacao: `Demanda ${demandaNumero}`,
                demanda: String(demandaNumero)
              })
              .eq('id', movToUpdate.id);
            console.log("UPDATE RES:", res);
        }
    }
  }
}

check();
