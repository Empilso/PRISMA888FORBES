
const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://gsmmanjpsdbfwmnmtgpg.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''; // Tentando pegar do env se disponível ou rodar manual

async function inspect() {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data, error } = await supabase.from('municipal_expenses').select('*').limit(1);
    if (error) {
        console.error(error);
        return;
    }
    console.log(JSON.stringify(Object.keys(data[0]), null, 2));
}

inspect();
