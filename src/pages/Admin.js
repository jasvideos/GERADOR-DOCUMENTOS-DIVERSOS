import React, { useState, useEffect } from 'react';
import {
  getOverviewStats,
  getDocumentStats,
  getLocationStats,
  getPaymentHistory,
  getRecentViews,
  getViewsByDay,
  getDocumentPrices,
  updateDocumentPrice
} from '../services/analytics';
import { isSupabaseConfigured } from '../lib/supabase';
import { jsPDF } from 'jspdf';

const Admin = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Estados dos dados
  const [overview, setOverview] = useState(null);
  const [documentStats, setDocumentStats] = useState([]);
  const [locationStats, setLocationStats] = useState([]);
  const [payments, setPayments] = useState([]);
  const [recentViews, setRecentViews] = useState([]);
  const [viewsByDay, setViewsByDay] = useState([]);
  const [prices, setPrices] = useState([]);
  const [editingPrice, setEditingPrice] = useState(null);

  // Senha do admin (em produção, use autenticação adequada)
  const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD || 'admin123';

  const handleLogin = (e) => {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      localStorage.setItem('admin_auth', 'true');
    } else {
      alert('Senha incorreta!');
    }
  };

  useEffect(() => {
    // Verifica autenticação salva
    if (localStorage.getItem('admin_auth') === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    
    const loadData = async () => {
      setLoading(true);
      
      if (!isSupabaseConfigured()) {
        setLoading(false);
        return;
      }

      try {
        const [overviewData, docStats, locStats, paymentsData, viewsData, dailyViews, pricesData] = 
          await Promise.all([
            getOverviewStats(),
            getDocumentStats(),
            getLocationStats(),
            getPaymentHistory(),
            getRecentViews(),
            getViewsByDay(),
            getDocumentPrices()
          ]);

        setOverview(overviewData);
        setDocumentStats(docStats);
        setLocationStats(locStats);
        setPayments(paymentsData);
        setRecentViews(viewsData);
        setViewsByDay(dailyViews);
        setPrices(pricesData);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
      }
      
      setLoading(false);
    };

    loadData();
  }, [isAuthenticated]);

  const handlePriceUpdate = async (documentId) => {
    if (editingPrice === null) return;
    
    const success = await updateDocumentPrice(documentId, parseFloat(editingPrice));
    if (success) {
      const updatedPrices = await getDocumentPrices();
      setPrices(updatedPrices);
      setEditingPrice(null);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('admin_auth');
  };

  const handleGeneratePoster = () => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = 210;
    
    // Fundo do Header (Gradiente simulado)
    doc.setFillColor(102, 126, 234);
    doc.rect(0, 0, pageWidth, 55, 'F');
    
    // Nome e Slogan
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(42);
    doc.setFont('helvetica', 'bold');
    doc.text('Gerador de Documentos', pageWidth / 2, 28, { align: 'center' });
    doc.setFontSize(28);
    doc.text('Online Anix', pageWidth / 2, 40, { align: 'center' });
    
    doc.setFontSize(16);
    doc.setFont('helvetica', 'normal');
    doc.text('Faca voce mesmo! E muito facil, rapido e profissional.', pageWidth / 2, 42, { align: 'center' });

    // Como Funciona
    doc.setDrawColor(102, 126, 234);
    doc.setLineWidth(0.8);
    doc.roundedRect(20, 65, 170, 30, 5, 5, 'D');
    
    doc.setTextColor(44, 62, 80);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Como Funciona?', pageWidth / 2, 75, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('1. Escolha o documento  -  2. Preencha os dados  -  3. Pague via PIX  -  4. Baixe na hora!', pageWidth / 2, 85, { align: 'center' });

    // Lista de Serviços
    const services = [
      { n: 'Recibo Pagamento', p: 'R$ 2,90' },
      { n: 'Recibo Aluguel', p: 'R$ 2,90' },
      { n: 'Contrato Locacao', p: 'R$ 5,90' },
      { n: 'Curriculo Profissional', p: 'R$ 2,90' },
      { n: 'Declaracao Residencia', p: 'R$ 2,90' },
      { n: 'Termo de Vistoria', p: 'R$ 2,90' },
      { n: 'Orcamento Servicos', p: 'R$ 2,90' },
      { n: 'Procuracao Particular', p: 'R$ 3,90' },
      { n: 'Uniao Estavel', p: 'R$ 2,90' },
      { n: 'Aut. Viagem Menor', p: 'R$ 2,90' },
      { n: 'Hipossuficiencia', p: 'R$ 2,90' },
      { n: 'Recibo RPA', p: 'R$ 2,90' }
    ];

    let startX = 20;
    let startY = 110;
    let col = 0;
    
    services.forEach((s, i) => {
      const x = startX + (col * 58);
      const y = startY + (Math.floor(i / 3) * 18);
      
      doc.setFillColor(248, 249, 250);
      doc.roundedRect(x, y, 54, 14, 2, 2, 'F');
      doc.setDrawColor(230, 230, 230);
      doc.roundedRect(x, y, 54, 14, 2, 2, 'D');
      
      doc.setTextColor(44, 62, 80);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text(s.n, x + 2, y + 6);
      
      doc.setTextColor(39, 174, 96);
      doc.setFontSize(9);
      doc.text(s.p, x + 52, y + 11, { align: 'right' });
      
      col = (col + 1) % 3;
    });

    // QR Code Section
    doc.setFillColor(102, 126, 234);
    doc.roundedRect(65, 190, 80, 55, 8, 8, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.text('Escaneie e Acesse!', 105, 202, { align: 'center' });
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(14);
    doc.text('anixdocs.vercel.app', 105, 235, { align: 'center' });

    // Benefícios
    doc.setTextColor(127, 140, 141);
    doc.setFontSize(10);
    doc.text('Instantaneo   |   100% Seguro   |   Pague via PIX   |   Acesse do Celular', pageWidth / 2, 260, { align: 'center' });

    // Footer
    doc.setFillColor(44, 62, 80);
    doc.rect(0, 275, pageWidth, 22, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.text('Gerador de Documentos Online Anix', 20, 289);
    doc.setFontSize(10);
    doc.text('Documentos profissionais em segundos', pageWidth - 20, 289, { align: 'right' });

    doc.save('cartaz-anixdocs.pdf');
  };

  const handleGenerateFlyer = () => {
    const doc = new jsPDF('p', 'mm', 'a5');
    const pageWidth = 148;

    // Header
    doc.setFillColor(44, 62, 80);
    doc.rect(0, 0, pageWidth, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(28);
    doc.setFont('helvetica', 'bold');
    doc.text('Gerador de Documentos Online Anix', pageWidth / 2, 20, { align: 'center' });
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Muito Facil! Faca voce mesmo em minutos.', pageWidth / 2, 30, { align: 'center' });

    // Highlight Box
    doc.setDrawColor(102, 126, 234);
    doc.setFillColor(227, 242, 253);
    doc.roundedRect(10, 50, 128, 20, 3, 3, 'FD');
    doc.setTextColor(44, 62, 80);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Simples e Rapido!', pageWidth / 2, 58, { align: 'center' });
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('Escolha o documento -> Preencha os dados -> Pague via PIX -> Baixe na hora!', pageWidth / 2, 64, { align: 'center' });

    // Services
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Documentos Disponiveis', pageWidth / 2, 80, { align: 'center' });

    const services = [
      { n: 'Recibo Pagamento', p: 'R$ 2,90' },
      { n: 'Recibo Aluguel', p: 'R$ 2,90' },
      { n: 'Contrato Locacao', p: 'R$ 5,90' },
      { n: 'Curriculo Profissional', p: 'R$ 2,90' },
      { n: 'Declaracao Residencia', p: 'R$ 2,90' },
      { n: 'Termo de Vistoria', p: 'R$ 2,90' },
      { n: 'Orcamento Servicos', p: 'R$ 2,90' }
    ];

    let y = 90;
    services.forEach(s => {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.text(s.n, 15, y);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(39, 174, 96);
      doc.text(s.p, 133, y, { align: 'right' });
      doc.setDrawColor(238, 238, 238);
      doc.line(15, y + 2, 133, y + 2);
      y += 8;
      doc.setTextColor(44, 62, 80);
    });

    // QR Code Section
    doc.setFillColor(248, 249, 250);
    doc.roundedRect(44, 150, 60, 40, 5, 5, 'F');
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Escaneie e Acesse!', pageWidth / 2, 158, { align: 'center' });
    doc.setTextColor(102, 126, 234);
    doc.text('anixdocs.vercel.app', pageWidth / 2, 185, { align: 'center' });

    // Footer
    doc.setFillColor(44, 62, 80);
    doc.rect(0, 195, pageWidth, 15, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(12);
    doc.text('Gerador de Documentos Online Anix', 15, 205);
    doc.setFontSize(8);
    doc.text('Pratico, Rapido e Profissional', 133, 205, { align: 'right' });

    doc.save('flyer-anixdocs-a5.pdf');
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0);
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  // Tela de Login
  if (!isAuthenticated) {
    return (
      <div style={styles.loginContainer}>
        <div style={styles.loginCard}>
          <h2 style={styles.loginTitle}>🔐 Painel Administrativo</h2>
          <form onSubmit={handleLogin} style={styles.loginForm}>
            <input
              type="password"
              placeholder="Senha de acesso"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.loginInput}
            />
            <button type="submit" style={styles.loginButton}>Entrar</button>
          </form>
          <p style={styles.loginHint}>Acesso restrito aos administradores</p>
        </div>
      </div>
    );
  }

  // Verificação de configuração
  if (!isSupabaseConfigured()) {
    return (
      <div style={styles.container}>
        <div style={styles.warningCard}>
          <h2>⚠️ Supabase não configurado</h2>
          <p>Para usar o painel administrativo, configure as variáveis de ambiente:</p>
          <code style={styles.code}>
            VITE_SUPABASE_URL=sua_url_aqui<br/>
            VITE_SUPABASE_ANON_KEY=sua_chave_aqui
          </code>
          <p style={{ marginTop: '20px' }}>
            Consulte o arquivo <strong>ADMIN_SETUP.md</strong> para instruções completas.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <h1 style={styles.title}>📊 Painel Administrativo</h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={handleGeneratePoster} style={styles.posterButton}>🖨️ Gerar Cartaz A4</button>
          <button onClick={handleGenerateFlyer} style={styles.flyerButton}>📄 Gerar Flyer A5</button>
          <button onClick={handleLogout} style={styles.logoutButton}>Sair</button>
        </div>
      </header>

      {/* Navegação */}
      <nav style={styles.nav}>
        {['overview', 'documentos', 'localizacao', 'pagamentos', 'precos', 'acessos'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              ...styles.navButton,
              ...(activeTab === tab ? styles.navButtonActive : {})
            }}
          >
            {tab === 'overview' && '📈 Visão Geral'}
            {tab === 'documentos' && '📄 Documentos'}
            {tab === 'localizacao' && '🌍 Localização'}
            {tab === 'pagamentos' && '💰 Pagamentos'}
            {tab === 'precos' && '💲 Preços'}
            {tab === 'acessos' && '👁️ Acessos'}
          </button>
        ))}
      </nav>

      {/* Conteúdo */}
      <main style={styles.main}>
        {loading ? (
          <div style={styles.loading}>Carregando dados...</div>
        ) : (
          <>
            {/* Visão Geral */}
            {activeTab === 'overview' && overview && (
              <div>
                <div style={styles.cardsGrid}>
                  <div style={{ ...styles.statCard, borderLeft: '4px solid #3498db' }}>
                    <h3 style={styles.statTitle}>Total de Visitas</h3>
                    <p style={styles.statValue}>{overview.totalViews.toLocaleString()}</p>
                  </div>
                  <div style={{ ...styles.statCard, borderLeft: '4px solid #2ecc71' }}>
                    <h3 style={styles.statTitle}>Visitas Hoje</h3>
                    <p style={styles.statValue}>{overview.todayViews.toLocaleString()}</p>
                  </div>
                  <div style={{ ...styles.statCard, borderLeft: '4px solid #e74c3c' }}>
                    <h3 style={styles.statTitle}>Total de Vendas</h3>
                    <p style={styles.statValue}>{overview.totalPayments}</p>
                  </div>
                  <div style={{ ...styles.statCard, borderLeft: '4px solid #9b59b6' }}>
                    <h3 style={styles.statTitle}>Receita Total</h3>
                    <p style={styles.statValue}>{formatCurrency(overview.totalRevenue)}</p>
                  </div>
                  <div style={{ ...styles.statCard, borderLeft: '4px solid #f39c12' }}>
                    <h3 style={styles.statTitle}>Documentos Gerados</h3>
                    <p style={styles.statValue}>{overview.totalGenerations.toLocaleString()}</p>
                  </div>
                </div>

                {/* Gráfico de visualizações por dia */}
                <div style={styles.chartCard}>
                  <h3 style={styles.chartTitle}>📊 Visualizações (últimos 30 dias)</h3>
                  <div style={styles.chartContainer}>
                    {viewsByDay.length > 0 ? (
                      <div style={styles.barChart}>
                        {viewsByDay.map((day, index) => {
                          const maxCount = Math.max(...viewsByDay.map(d => d.count));
                          const height = maxCount > 0 ? (day.count / maxCount) * 100 : 0;
                          return (
                            <div key={index} style={styles.barWrapper}>
                              <div 
                                style={{ 
                                  ...styles.bar, 
                                  height: `${height}%`,
                                  backgroundColor: '#3498db'
                                }}
                                title={`${day.date}: ${day.count} visitas`}
                              />
                              <span style={styles.barLabel}>{day.date.slice(8)}</span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p style={styles.noData}>Nenhum dado disponível</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Documentos */}
            {activeTab === 'documentos' && (
              <div style={styles.tableCard}>
                <h3 style={styles.tableTitle}>📄 Estatísticas por Documento</h3>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Documento</th>
                      <th style={styles.th}>Visualizações</th>
                      <th style={styles.th}>%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {documentStats.length > 0 ? documentStats.map((doc, index) => {
                      const totalViews = documentStats.reduce((sum, d) => sum + d.views, 0);
                      const percentage = totalViews > 0 ? ((doc.views / totalViews) * 100).toFixed(1) : 0;
                      return (
                        <tr key={index}>
                          <td style={styles.td}>{doc.title}</td>
                          <td style={styles.td}>{doc.views.toLocaleString()}</td>
                          <td style={styles.td}>
                            <div style={styles.progressBar}>
                              <div style={{ ...styles.progressFill, width: `${percentage}%` }} />
                              <span style={styles.progressText}>{percentage}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    }) : (
                      <tr><td style={styles.td} colSpan="3">Nenhum dado disponível</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Localização */}
            {activeTab === 'localizacao' && (
              <div style={styles.tableCard}>
                <h3 style={styles.tableTitle}>🌍 Acessos por Localização</h3>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Cidade</th>
                      <th style={styles.th}>Estado</th>
                      <th style={styles.th}>País</th>
                      <th style={styles.th}>Acessos</th>
                    </tr>
                  </thead>
                  <tbody>
                    {locationStats.length > 0 ? locationStats.slice(0, 50).map((loc, index) => (
                      <tr key={index}>
                        <td style={styles.td}>{loc.city || '-'}</td>
                        <td style={styles.td}>{loc.region || '-'}</td>
                        <td style={styles.td}>{loc.country || '-'}</td>
                        <td style={styles.td}>{loc.count.toLocaleString()}</td>
                      </tr>
                    )) : (
                      <tr><td style={styles.td} colSpan="4">Nenhum dado disponível</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagamentos */}
            {activeTab === 'pagamentos' && (
              <div style={styles.tableCard}>
                <h3 style={styles.tableTitle}>💰 Histórico de Pagamentos</h3>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Data</th>
                      <th style={styles.th}>Documento</th>
                      <th style={styles.th}>Valor</th>
                      <th style={styles.th}>Cidade</th>
                      <th style={styles.th}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.length > 0 ? payments.map((payment, index) => (
                      <tr key={index}>
                        <td style={styles.td}>{formatDate(payment.created_at)}</td>
                        <td style={styles.td}>{payment.document_title}</td>
                        <td style={styles.td}>{formatCurrency(payment.amount)}</td>
                        <td style={styles.td}>{payment.city || '-'}</td>
                        <td style={styles.td}>
                          <span style={{
                            ...styles.badge,
                            backgroundColor: payment.status === 'completed' ? '#2ecc71' : '#f39c12'
                          }}>
                            {payment.status === 'completed' ? 'Pago' : payment.status}
                          </span>
                        </td>
                      </tr>
                    )) : (
                      <tr><td style={styles.td} colSpan="5">Nenhum pagamento registrado</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Preços */}
            {activeTab === 'precos' && (
              <div style={styles.tableCard}>
                <h3 style={styles.tableTitle}>💲 Gerenciar Preços</h3>
                <p style={styles.priceNote}>
                  Altere os preços dos documentos aqui. Os novos valores serão aplicados imediatamente.
                </p>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Documento</th>
                      <th style={styles.th}>Preço Atual</th>
                      <th style={styles.th}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {prices.length > 0 ? prices.map((item, index) => (
                      <tr key={index}>
                        <td style={styles.td}>{item.document_id}</td>
                        <td style={styles.td}>
                          <input
                            type="number"
                            step="0.01"
                            defaultValue={item.price}
                            onChange={(e) => setEditingPrice(e.target.value)}
                            style={styles.priceInput}
                          />
                        </td>
                        <td style={styles.td}>
                          <button 
                            onClick={() => handlePriceUpdate(item.document_id)}
                            style={styles.saveButton}
                          >
                            Salvar
                          </button>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td style={styles.td} colSpan="3">
                          Nenhum preço personalizado. Os preços padrão estão sendo usados.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {/* Acessos Recentes */}
            {activeTab === 'acessos' && (
              <div style={styles.tableCard}>
                <h3 style={styles.tableTitle}>👁️ Acessos Recentes</h3>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Data/Hora</th>
                      <th style={styles.th}>Página</th>
                      <th style={styles.th}>Cidade</th>
                      <th style={styles.th}>Dispositivo</th>
                      <th style={styles.th}>Navegador</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentViews.length > 0 ? recentViews.map((view, index) => (
                      <tr key={index}>
                        <td style={styles.td}>{formatDate(view.created_at)}</td>
                        <td style={styles.td}>{view.page || 'Home'}</td>
                        <td style={styles.td}>{view.city || '-'}, {view.region || ''}</td>
                        <td style={styles.td}>{view.device || '-'}</td>
                        <td style={styles.td}>{view.browser || '-'}</td>
                      </tr>
                    )) : (
                      <tr><td style={styles.td} colSpan="5">Nenhum acesso registrado</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

// Estilos
const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f5f6fa',
    fontFamily: 'Arial, sans-serif'
  },
  header: {
    backgroundColor: '#2c3e50',
    color: 'white',
    padding: '20px 30px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  title: {
    margin: 0,
    fontSize: '24px'
  },
  logoutButton: {
    padding: '8px 16px',
    backgroundColor: '#e74c3c',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer'
  },
  posterButton: {
    padding: '8px 16px',
    backgroundColor: '#27ae60',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontWeight: 'bold'
  },
  flyerButton: {
    padding: '8px 16px',
    backgroundColor: '#3498db',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer',
    fontWeight: 'bold'
  },
  nav: {
    backgroundColor: 'white',
    padding: '10px 30px',
    borderBottom: '1px solid #ddd',
    display: 'flex',
    gap: '10px',
    flexWrap: 'wrap'
  },
  navButton: {
    padding: '10px 20px',
    border: '1px solid #ddd',
    backgroundColor: 'white',
    borderRadius: '5px',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  navButtonActive: {
    backgroundColor: '#3498db',
    color: 'white',
    borderColor: '#3498db'
  },
  main: {
    padding: '30px'
  },
  cardsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '20px',
    marginBottom: '30px'
  },
  statCard: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '10px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
  },
  statTitle: {
    margin: '0 0 10px 0',
    fontSize: '14px',
    color: '#777'
  },
  statValue: {
    margin: 0,
    fontSize: '28px',
    fontWeight: 'bold',
    color: '#333'
  },
  chartCard: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '10px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
  },
  chartTitle: {
    margin: '0 0 20px 0',
    fontSize: '18px'
  },
  chartContainer: {
    height: '200px',
    position: 'relative'
  },
  barChart: {
    display: 'flex',
    alignItems: 'flex-end',
    height: '180px',
    gap: '4px',
    padding: '0 10px'
  },
  barWrapper: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    height: '100%',
    justifyContent: 'flex-end'
  },
  bar: {
    width: '100%',
    maxWidth: '30px',
    borderRadius: '3px 3px 0 0',
    transition: 'height 0.3s'
  },
  barLabel: {
    fontSize: '10px',
    color: '#666',
    marginTop: '5px'
  },
  tableCard: {
    backgroundColor: 'white',
    padding: '20px',
    borderRadius: '10px',
    boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
  },
  tableTitle: {
    margin: '0 0 20px 0',
    fontSize: '18px'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse'
  },
  th: {
    textAlign: 'left',
    padding: '12px',
    backgroundColor: '#f8f9fa',
    borderBottom: '2px solid #ddd',
    fontSize: '14px',
    fontWeight: 'bold'
  },
  td: {
    padding: '12px',
    borderBottom: '1px solid #eee'
  },
  progressBar: {
    width: '100%',
    height: '20px',
    backgroundColor: '#f0f0f0',
    borderRadius: '10px',
    position: 'relative',
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3498db',
    borderRadius: '10px',
    transition: 'width 0.3s'
  },
  progressText: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    fontSize: '12px',
    fontWeight: 'bold'
  },
  badge: {
    padding: '4px 8px',
    borderRadius: '4px',
    color: 'white',
    fontSize: '12px'
  },
  priceInput: {
    padding: '8px',
    border: '1px solid #ddd',
    borderRadius: '5px',
    width: '100px'
  },
  priceNote: {
    marginBottom: '20px',
    color: '#666'
  },
  saveButton: {
    padding: '8px 16px',
    backgroundColor: '#2ecc71',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer'
  },
  noData: {
    textAlign: 'center',
    color: '#999',
    padding: '40px'
  },
  loading: {
    textAlign: 'center',
    padding: '50px',
    fontSize: '18px',
    color: '#666'
  },
  loginContainer: {
    minHeight: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#2c3e50'
  },
  loginCard: {
    backgroundColor: 'white',
    padding: '40px',
    borderRadius: '10px',
    textAlign: 'center',
    boxShadow: '0 10px 30px rgba(0,0,0,0.2)'
  },
  loginTitle: {
    margin: '0 0 30px 0'
  },
  loginForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px'
  },
  loginInput: {
    padding: '12px',
    fontSize: '16px',
    border: '1px solid #ddd',
    borderRadius: '5px'
  },
  loginButton: {
    padding: '12px',
    fontSize: '16px',
    backgroundColor: '#3498db',
    color: 'white',
    border: 'none',
    borderRadius: '5px',
    cursor: 'pointer'
  },
  loginHint: {
    marginTop: '20px',
    color: '#999',
    fontSize: '14px'
  },
  warningCard: {
    backgroundColor: 'white',
    padding: '40px',
    borderRadius: '10px',
    margin: '50px auto',
    maxWidth: '600px',
    textAlign: 'center',
    boxShadow: '0 5px 20px rgba(0,0,0,0.1)'
  },
  code: {
    display: 'block',
    backgroundColor: '#f8f9fa',
    padding: '15px',
    borderRadius: '5px',
    marginTop: '15px',
    fontFamily: 'monospace',
    textAlign: 'left'
  }
};

export default Admin;
