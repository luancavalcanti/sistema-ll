const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://wuudixeadruhknxwmubu.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind1dWRpeGVhZHJ1aGtueHdtdWJ1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQ2NDYyMCwiZXhwIjoyMDkwMDQwNjIwfQ.aZmffB2BgXr54y5EmKGygRSG-s5NCixxDtm9wMPTq_Q';
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function check() {
  const { data: users, error } = await supabase.auth.admin.listUsers();
  
  if (error) {
    console.error("Error fetching users:", error);
    return;
  }
  
  const tiago = users.users.find(u => 
    (u.email && u.email.toLowerCase().includes('tiago')) || 
    JSON.stringify(u.user_metadata).toLowerCase().includes('tiago')
  );
  
  console.log("Tiago user found:", JSON.stringify(tiago, null, 2));

  // Let's also check the `users` table to see what it has
  const { data: publicUser } = await supabase.from('users').select('*').eq('id', tiago?.id);
  console.log("Public User table:", publicUser);
}

check();
