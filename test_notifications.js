require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'https://ddczuwuirndnxlcsrvts.supabase.co';
const supabaseKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseKey) {
  console.error("Lütfen SUPABASE_SECRET_KEY ortam değişkenini (environment variable) tanımlayın.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data, error } = await supabase.from('notifications').select('*');
  if (error) {
    console.error('Error fetching notifications:', error);
  } else {
    console.log('Total notifications:', data.length);
    console.log(data);
  }
}

main();
