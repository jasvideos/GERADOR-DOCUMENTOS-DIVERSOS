import { createClient } from '@supabase/supabase-js';

// Configurações do Supabase (Vite usa import.meta.env)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Verifica se está configurado e se não é o valor padrão de exemplo
export const isSupabaseConfigured = () => {
  if (!supabaseUrl || !supabaseAnonKey) return false;
  if (supabaseUrl.includes('seu-projeto.supabase.co')) return false;
  if (supabaseAnonKey.includes('sua-chave-anon-aqui')) return false;
  return true;
};
