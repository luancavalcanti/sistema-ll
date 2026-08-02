const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://oobflfxauenkqxrcnmmz.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9vYmZsZnhhdWVua3F4cmNubW16Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ4ODQxMTMsImV4cCI6MjA5MDQ2MDExM30.ohLxkZMe959pH-bD9wDCp2w7MBWicvff0U9DO06IImM';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function check() {
  const { data: demandas } = await supabase.from('demandas').select('numero, gestor');
  const gestores = [...new Set(demandas.map(d => d.gestor))];
  console.log("All gestores in DEV:", gestores);
}

check();
