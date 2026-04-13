-- ==============================================
-- SCHEMA DO BANCO DE DADOS - SUPABASE
-- Execute este SQL no SQL Editor do Supabase
-- ==============================================

-- Tabela de visualizações de página
CREATE TABLE IF NOT EXISTS page_views (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    page VARCHAR(100) DEFAULT 'home',
    ip VARCHAR(50),
    city VARCHAR(100),
    region VARCHAR(100),
    country VARCHAR(100),
    country_code VARCHAR(10),
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    device VARCHAR(50),
    browser VARCHAR(50),
    os VARCHAR(50),
    referrer TEXT,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Tabela de visualizações de documento
CREATE TABLE IF NOT EXISTS document_views (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    document_id VARCHAR(50) NOT NULL,
    document_title VARCHAR(200),
    ip VARCHAR(50),
    city VARCHAR(100),
    region VARCHAR(100),
    country VARCHAR(100),
    device VARCHAR(50),
    browser VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Tabela de gerações de documento (download/impressão)
CREATE TABLE IF NOT EXISTS document_generations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    document_id VARCHAR(50) NOT NULL,
    document_title VARCHAR(200),
    action VARCHAR(20) DEFAULT 'download', -- 'download', 'print', 'share'
    city VARCHAR(100),
    region VARCHAR(100),
    country VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Tabela de pagamentos
CREATE TABLE IF NOT EXISTS payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    document_id VARCHAR(50) NOT NULL,
    document_title VARCHAR(200),
    amount DECIMAL(10, 2) NOT NULL,
    payment_method VARCHAR(50) DEFAULT 'pix',
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'completed', 'failed'
    city VARCHAR(100),
    region VARCHAR(100),
    country VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Tabela de preços personalizados
CREATE TABLE IF NOT EXISTS document_prices (
    document_id VARCHAR(50) PRIMARY KEY,
    price DECIMAL(10, 2) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- ==============================================
-- ÍNDICES PARA MELHOR PERFORMANCE
-- ==============================================

CREATE INDEX IF NOT EXISTS idx_page_views_created_at ON page_views(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_views_city ON page_views(city);
CREATE INDEX IF NOT EXISTS idx_document_views_document_id ON document_views(document_id);
CREATE INDEX IF NOT EXISTS idx_document_views_created_at ON document_views(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_document_generations_document_id ON document_generations(document_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at DESC);

-- ==============================================
-- POLÍTICAS DE SEGURANÇA (RLS)
-- ==============================================

-- Habilita RLS em todas as tabelas
ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_prices ENABLE ROW LEVEL SECURITY;

-- Política para permitir INSERT anônimo (para rastreamento)
DROP POLICY IF EXISTS "Allow anonymous inserts" ON page_views;
CREATE POLICY "Allow anonymous inserts" ON page_views FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anonymous inserts" ON document_views;
CREATE POLICY "Allow anonymous inserts" ON document_views FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anonymous inserts" ON document_generations;
CREATE POLICY "Allow anonymous inserts" ON document_generations FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anonymous inserts" ON payments;
CREATE POLICY "Allow anonymous inserts" ON payments FOR INSERT WITH CHECK (true);

-- Política para permitir SELECT apenas para usuários autenticados (admin)
-- Nota: Para produção, configure autenticação adequada no Supabase
DROP POLICY IF EXISTS "Allow authenticated select" ON page_views;
CREATE POLICY "Allow authenticated select" ON page_views FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow authenticated select" ON document_views;
CREATE POLICY "Allow authenticated select" ON document_views FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow authenticated select" ON document_generations;
CREATE POLICY "Allow authenticated select" ON document_generations FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow authenticated select" ON payments;
CREATE POLICY "Allow authenticated select" ON payments FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow authenticated select" ON document_prices;
CREATE POLICY "Allow authenticated select" ON document_prices FOR SELECT USING (true);

-- Política para preços (upsert)
DROP POLICY IF EXISTS "Allow price upsert" ON document_prices;
CREATE POLICY "Allow price upsert" ON document_prices FOR ALL USING (true) WITH CHECK (true);

-- ==============================================
-- DADOS INICIAIS DE PREÇOS (OPCIONAL)
-- ==============================================

INSERT INTO document_prices (document_id, price) VALUES
    ('recibo', 1.90),
    ('recibo_aluguel', 2.50),
    ('curriculo', 2.90),
    ('vistoria', 3.90),
    ('autorizacao', 1.90),
    ('contrato_locacao', 3.90),
    ('procuracao', 2.50),
    ('declaracao', 1.90)
ON CONFLICT (document_id) DO NOTHING;

-- ==============================================
-- VIEW PARA ESTATÍSTICAS RÁPIDAS
-- ==============================================

CREATE OR REPLACE VIEW stats_overview AS
SELECT
    (SELECT COUNT(*) FROM page_views) as total_views,
    (SELECT COUNT(*) FROM page_views WHERE created_at >= CURRENT_DATE) as today_views,
    (SELECT COUNT(*) FROM payments WHERE status = 'completed') as total_payments,
    (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'completed') as total_revenue,
    (SELECT COUNT(*) FROM document_generations) as total_generations;

-- ==============================================
-- FUNÇÃO PARA LIMPAR DADOS ANTIGOS (OPCIONAL)
-- Execute periodicamente para manter o banco limpo
-- ==============================================

CREATE OR REPLACE FUNCTION clean_old_data(days_to_keep INTEGER DEFAULT 90)
RETURNS void AS $$
BEGIN
    DELETE FROM page_views WHERE created_at < NOW() - (days_to_keep || ' days')::INTERVAL;
    DELETE FROM document_views WHERE created_at < NOW() - (days_to_keep || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql;
