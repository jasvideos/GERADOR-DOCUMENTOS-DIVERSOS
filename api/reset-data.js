import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { password } = req.body;
    
    // Validação de Senha (Mesma lógica do login.js)
    const ADMIN_PASSWORD = (process.env.ADMIN_PASSWORD || process.env.VITE_ADMIN_PASSWORD || 'admin123').trim();

    if (password !== ADMIN_PASSWORD) {
      return res.status(401).json({ success: false, error: 'Senha incorreta' });
    }

    // Inicializa Supabase com SERVICE ROLE KEY (Permissão total)
    const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return res.status(500).json({ error: 'Configuração do Supabase incompleta no servidor' });
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Tabelas para limpar
    const tables = ['page_views', 'document_views', 'document_generations', 'payments'];

    console.log('Iniciando limpeza de dados...');

    // Executa as deleções
    // Nota: Como estamos usando service_role, o RLS é ignorado.
    // Usamos um filtro que sempre é verdadeiro para deletar tudo.
    const results = await Promise.all(
      tables.map(table => 
        supabase.from(table).delete().neq('created_at', '1970-01-01T00:00:00Z')
      )
    );

    // Verifica erros
    const errors = results.filter(r => r.error).map(r => r.error);
    if (errors.length > 0) {
      console.error('Erros ao deletar dados:', errors);
      return res.status(500).json({ success: false, error: 'Erro ao limpar algumas tabelas', details: errors });
    }

    return res.status(200).json({ 
      success: true, 
      message: 'Dados limpos com sucesso',
      tablesAffected: tables 
    });

  } catch (error) {
    console.error("Erro no Reset Data API:", error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}
