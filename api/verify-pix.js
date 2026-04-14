import { MercadoPagoConfig, Payment } from 'mercadopago';
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    const { paymentId, mpPaymentId } = req.body;
    if (!paymentId || !mpPaymentId) return res.status(400).json({ error: 'Faltam IDs' });

    const mpToken = process.env.MP_ACCESS_TOKEN ? process.env.MP_ACCESS_TOKEN.trim() : '';
    if (!mpToken) return res.status(500).json({ error: 'Token missing' });

    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ? process.env.SUPABASE_SERVICE_ROLE_KEY.trim() : process.env.VITE_SUPABASE_ANON_KEY;
    const supabaseClient = createClient(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL, supabaseKey);

    const mpClient = new MercadoPagoConfig({ accessToken: mpToken });
    const paymentClient = new Payment(mpClient);

    const paymentData = await paymentClient.get({ id: mpPaymentId });
    
    if (paymentData && paymentData.status === 'approved') {
       // Salva no banco também pra garantir, mesmo se webhook falhou
       await supabaseClient
          .from('payments')
          .update({ status: 'completed' })
          .eq('id', paymentId);
          
       return res.status(200).json({ status: 'completed' });
    }

    return res.status(200).json({ status: paymentData?.status || 'pending' });

  } catch (error) {
    console.error("Erro no verify-pix:", error);
    return res.status(500).json({ error: 'Falha na verificação.' });
  }
}
