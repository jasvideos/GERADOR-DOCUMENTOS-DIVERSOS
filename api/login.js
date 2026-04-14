
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
    
    // Senha definida no ambiente do servidor (não exposta ao cliente)
    // Se não houver variável no ambiente, usa o padrão 'admin123'
    const ADMIN_PASSWORD = (process.env.ADMIN_PASSWORD || process.env.VITE_ADMIN_PASSWORD || 'admin123').trim();

    if (password === ADMIN_PASSWORD) {
      return res.status(200).json({ success: true, token: 'authenticated_session_v1' });
    } else {
      return res.status(401).json({ success: false, error: 'Senha incorreta' });
    }
  } catch (error) {
    console.error("Erro no Login API:", error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
}
