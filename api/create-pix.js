import { MercadoPagoConfig, Payment } from 'mercadopago';
import { createClient } from '@supabase/supabase-js';

// Setup clients with credentials
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabaseClient = createClient(supabaseUrl, supabaseKey);

// Clients serão inicializados dentro do handler para garantir leitura correta na Vercel

export default async function handler(req, res) {
  // Configuração simples de CORS para Vercel Functions
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
    const { document_id, document_title, amount } = req.body;
    
    if (!document_id || !amount) {
       return res.status(400).json({ error: 'Parâmetros obrigatórios ausentes.' });
    }

    const mpToken = process.env.MP_ACCESS_TOKEN ? process.env.MP_ACCESS_TOKEN.trim() : '';
    if (!mpToken) {
       return res.status(500).json({ error: 'MercadoPago Access Token não está configurado na Vercel.', details: 'Verifique aba Environment Variables' });
    }

    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ? process.env.SUPABASE_SERVICE_ROLE_KEY.trim() : process.env.VITE_SUPABASE_ANON_KEY;

    // Inicialização atrasada para garantir leitura no momento que roda na Vercel
    const supabaseClient = createClient(process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL, supabaseKey);
    const mpClient = new MercadoPagoConfig({ accessToken: mpToken });
    const paymentClient = new Payment(mpClient);

    // 1. Criar transação pendente no nosso Supabase
    const { data: dbData, error: dbError } = await supabaseClient
      .from('payments')
      .insert([
        {
          document_id,
          document_title: document_title || 'Documento',
          amount: parseFloat(amount),
          status: 'pending',
          payment_method: 'pix'
        }
      ])
      .select('id')
      .single();

    if (dbError) {
      console.error("Erro interno no Supabase:", dbError);
      return res.status(500).json({ error: 'Erro de banco de dados.' });
    }

    const internalPaymentId = dbData.id;

    // 2. Chamar o MercadoPago
    const mpRequest = {
      transaction_amount: parseFloat(amount),
      description: `Documento: ${document_title}`,
      payment_method_id: 'pix',
      payer: {
        email: 'cliente_anonimo@gerador.com.br', // Email genérico
        first_name: 'Cliente',
        last_name: 'Gerador'
      },
      external_reference: internalPaymentId, // Guarda o nosso ID da transação
    };

    const mpData = await paymentClient.create({ body: mpRequest });

    // Extrair códigos QR
    const qrCodeBase64 = mpData.point_of_interaction?.transaction_data?.qr_code_base64;
    const qrCode = mpData.point_of_interaction?.transaction_data?.qr_code;
    const mpPaymentId = mpData.id;

    return res.status(200).json({ 
      success: true, 
      paymentId: internalPaymentId, 
      mpPaymentId: mpPaymentId,
      qr_code_base64: qrCodeBase64,
      qr_code: qrCode
    });
    
  } catch (error) {
    console.error('Erro na geração do PIX:', error);
    return res.status(500).json({ error: 'Falha interna na API de PIX.', details: error.message });
  }
}
