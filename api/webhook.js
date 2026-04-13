import { MercadoPagoConfig, Payment } from 'mercadopago';
import { createClient } from '@supabase/supabase-js';

// Setup clients com as Secret Keys
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
// IMPORTANTE: Webhook DEVE usar o SERVICE_ROLE_KEY para conseguir alterar a tabela 'payments' caso as RLS restrinjam update público
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY; 
const supabaseClient = createClient(supabaseUrl, supabaseKey);

// Clientes serão instanciados no handler

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
    const mpToken = process.env.MP_ACCESS_TOKEN ? process.env.MP_ACCESS_TOKEN.trim() : '';
    if (!mpToken) return res.status(500).send('Token missing');
    
    const mpClient = new MercadoPagoConfig({ accessToken: mpToken });
    const paymentClient = new Payment(mpClient);

    // MercadoPago envia topic e id na query param OU no body
    const topic = req.query.topic || req.query.type || req.body?.type;
    const id = req.query.data?.id || req.query.id || req.body?.data?.id;

    if (!id) {
      return res.status(200).send('Ignorado - Sem ID');
    }

    if (topic === 'payment' || topic === 'payment.created' || topic === 'payment.updated') {
      
      // Busca status verdadeiro diretamente da API do MercadoPago (Prevenção de fraude de webhook)
      const paymentData = await paymentClient.get({ id });
      
      if (paymentData && paymentData.status === 'approved') {
         const externalRef = paymentData.external_reference;
         
         if (externalRef) {
            // Atualizar o Supabase!
            const { error } = await supabaseClient
              .from('payments')
              .update({ status: 'completed' })
              .eq('id', externalRef);
              
            if (error) {
              console.error("Supabase Erro na atualização:", error);
            } else {
              console.log(`Pagamento ${externalRef} auto-aprovado com sucesso no DB!`);
            }
         }
      }
    }

    // MP exige retorno 200 rápido para confirmar que recebemos.
    return res.status(200).send('OK');
  } catch (err) {
    console.error("Erro no processamento do Webhook:", err);
    return res.status(500).send('Erro interno do servidor');
  }
}
