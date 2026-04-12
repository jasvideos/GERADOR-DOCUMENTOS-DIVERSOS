import { supabase, isSupabaseConfigured } from '../lib/supabase';

// Obtém informações de localização via IP
const getLocationInfo = async () => {
  try {
    const response = await fetch('https://ipapi.co/json/');
    const data = await response.json();
    return {
      ip: data.ip,
      city: data.city,
      region: data.region,
      country: data.country_name,
      country_code: data.country_code,
      latitude: data.latitude,
      longitude: data.longitude
    };
  } catch (error) {
    console.error('Erro ao obter localização:', error);
    return null;
  }
};

// Obtém informações do dispositivo
const getDeviceInfo = () => {
  const ua = navigator.userAgent;
  let device = 'Desktop';
  if (/mobile/i.test(ua)) device = 'Mobile';
  else if (/tablet|ipad/i.test(ua)) device = 'Tablet';
  
  let browser = 'Outro';
  if (/chrome/i.test(ua) && !/edge/i.test(ua)) browser = 'Chrome';
  else if (/firefox/i.test(ua)) browser = 'Firefox';
  else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = 'Safari';
  else if (/edge/i.test(ua)) browser = 'Edge';
  else if (/opera|opr/i.test(ua)) browser = 'Opera';

  let os = 'Outro';
  if (/windows/i.test(ua)) os = 'Windows';
  else if (/mac/i.test(ua)) os = 'MacOS';
  else if (/linux/i.test(ua)) os = 'Linux';
  else if (/android/i.test(ua)) os = 'Android';
  else if (/ios|iphone|ipad/i.test(ua)) os = 'iOS';

  return { device, browser, os };
};

// Registra acesso à página
export const trackPageView = async (page = 'home') => {
  if (!isSupabaseConfigured()) return;

  try {
    const location = await getLocationInfo();
    const device = getDeviceInfo();

    await supabase.from('page_views').insert({
      page,
      ip: location?.ip,
      city: location?.city,
      region: location?.region,
      country: location?.country,
      country_code: location?.country_code,
      latitude: location?.latitude,
      longitude: location?.longitude,
      device: device.device,
      browser: device.browser,
      os: device.os,
      referrer: document.referrer || null,
      user_agent: navigator.userAgent
    });
  } catch (error) {
    console.error('Erro ao registrar visualização:', error);
  }
};

// Registra acesso a um documento específico
export const trackDocumentView = async (documentId, documentTitle) => {
  if (!isSupabaseConfigured()) return;

  try {
    const location = await getLocationInfo();
    const device = getDeviceInfo();

    await supabase.from('document_views').insert({
      document_id: documentId,
      document_title: documentTitle,
      ip: location?.ip,
      city: location?.city,
      region: location?.region,
      country: location?.country,
      device: device.device,
      browser: device.browser
    });
  } catch (error) {
    console.error('Erro ao registrar acesso ao documento:', error);
  }
};

// Registra geração de documento (download/impressão)
export const trackDocumentGeneration = async (documentId, documentTitle, action = 'download') => {
  if (!isSupabaseConfigured()) return;

  try {
    const location = await getLocationInfo();

    await supabase.from('document_generations').insert({
      document_id: documentId,
      document_title: documentTitle,
      action, // 'download', 'print', 'share'
      city: location?.city,
      region: location?.region,
      country: location?.country
    });
  } catch (error) {
    console.error('Erro ao registrar geração:', error);
  }
};

// Registra pagamento
export const trackPayment = async (documentId, documentTitle, amount, paymentMethod = 'pix') => {
  if (!isSupabaseConfigured()) return;

  try {
    const location = await getLocationInfo();

    const { data, error } = await supabase.from('payments').insert({
      document_id: documentId,
      document_title: documentTitle,
      amount,
      payment_method: paymentMethod,
      status: 'completed',
      city: location?.city,
      region: location?.region,
      country: location?.country
    }).select();

    if (error) throw error;
    return data[0];
  } catch (error) {
    console.error('Erro ao registrar pagamento:', error);
    return null;
  }
};

// ==================== FUNÇÕES DO PAINEL ADMIN ====================

// Obtém estatísticas gerais
export const getOverviewStats = async () => {
  if (!isSupabaseConfigured()) return null;

  try {
    const today = new Date().toISOString().split('T')[0];
    const lastMonth = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // Total de visualizações
    const { count: totalViews } = await supabase
      .from('page_views')
      .select('*', { count: 'exact', head: true });

    // Visualizações hoje
    const { count: todayViews } = await supabase
      .from('page_views')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', today);

    // Total de pagamentos
    const { data: paymentsData } = await supabase
      .from('payments')
      .select('amount')
      .eq('status', 'completed');

    const totalRevenue = paymentsData?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
    const totalPayments = paymentsData?.length || 0;

    // Documentos gerados
    const { count: totalGenerations } = await supabase
      .from('document_generations')
      .select('*', { count: 'exact', head: true });

    return {
      totalViews: totalViews || 0,
      todayViews: todayViews || 0,
      totalPayments,
      totalRevenue,
      totalGenerations: totalGenerations || 0
    };
  } catch (error) {
    console.error('Erro ao obter estatísticas:', error);
    return null;
  }
};

// Obtém estatísticas por documento
export const getDocumentStats = async () => {
  if (!isSupabaseConfigured()) return [];

  try {
    const { data, error } = await supabase
      .from('document_views')
      .select('document_id, document_title')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Agrupa por documento
    const stats = {};
    data?.forEach(d => {
      if (!stats[d.document_id]) {
        stats[d.document_id] = { id: d.document_id, title: d.document_title, views: 0 };
      }
      stats[d.document_id].views++;
    });

    return Object.values(stats).sort((a, b) => b.views - a.views);
  } catch (error) {
    console.error('Erro ao obter estatísticas por documento:', error);
    return [];
  }
};

// Obtém dados de localização (para mapa)
export const getLocationStats = async () => {
  if (!isSupabaseConfigured()) return [];

  try {
    const { data, error } = await supabase
      .from('page_views')
      .select('city, region, country, country_code')
      .not('city', 'is', null);

    if (error) throw error;

    // Agrupa por cidade
    const locations = {};
    data?.forEach(d => {
      const key = `${d.city}-${d.region}-${d.country}`;
      if (!locations[key]) {
        locations[key] = { 
          city: d.city, 
          region: d.region, 
          country: d.country,
          country_code: d.country_code,
          count: 0 
        };
      }
      locations[key].count++;
    });

    return Object.values(locations).sort((a, b) => b.count - a.count);
  } catch (error) {
    console.error('Erro ao obter estatísticas de localização:', error);
    return [];
  }
};

// Obtém histórico de pagamentos
export const getPaymentHistory = async (limit = 50) => {
  if (!isSupabaseConfigured()) return [];

  try {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Erro ao obter histórico de pagamentos:', error);
    return [];
  }
};

// Obtém visualizações recentes
export const getRecentViews = async (limit = 20) => {
  if (!isSupabaseConfigured()) return [];

  try {
    const { data, error } = await supabase
      .from('page_views')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Erro ao obter visualizações recentes:', error);
    return [];
  }
};

// Obtém visualizações por dia (últimos 30 dias)
export const getViewsByDay = async () => {
  if (!isSupabaseConfigured()) return [];

  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    
    const { data, error } = await supabase
      .from('page_views')
      .select('created_at')
      .gte('created_at', thirtyDaysAgo);

    if (error) throw error;

    // Agrupa por dia
    const days = {};
    data?.forEach(d => {
      const day = d.created_at.split('T')[0];
      days[day] = (days[day] || 0) + 1;
    });

    return Object.entries(days)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  } catch (error) {
    console.error('Erro ao obter visualizações por dia:', error);
    return [];
  }
};

// ==================== GERENCIAMENTO DE PREÇOS ====================

// Obtém preços dos documentos
export const getDocumentPrices = async () => {
  if (!isSupabaseConfigured()) return [];

  try {
    const { data, error } = await supabase
      .from('document_prices')
      .select('*')
      .order('document_id');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Erro ao obter preços:', error);
    return [];
  }
};

// Atualiza preço de um documento
export const updateDocumentPrice = async (documentId, price) => {
  if (!isSupabaseConfigured()) return false;

  try {
    const { error } = await supabase
      .from('document_prices')
      .upsert({ document_id: documentId, price, updated_at: new Date().toISOString() });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Erro ao atualizar preço:', error);
    return false;
  }
};

// Obtém preço de um documento específico
export const getDocumentPrice = async (documentId, defaultPrice) => {
  if (!isSupabaseConfigured()) return defaultPrice;

  try {
    const { data, error } = await supabase
      .from('document_prices')
      .select('price')
      .eq('document_id', documentId)
      .single();

    if (error || !data) return defaultPrice;
    return data.price;
  } catch (error) {
    return defaultPrice;
  }
};
