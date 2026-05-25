// Configuração de links de afiliados e doações para o AnixDocs.
// Você pode substituir facilmente as URLs de links e imagens abaixo pelos seus dados reais de afiliado!

export const CHAVE_PIX_DOACAO = "00020101021126780014BR.GOV.BCB.PIX2556pix-qr.mercadopago.com/instore/ol/v2/CyFDU56LVSYfTgMSZj15204000053039865802BR5914Anix Lan House6009SAO PAULO62080504mpis63041022"; // Chave Pix Mercado Pago real do usuário
export const MERCADO_LIVRE_LINK = "https://meli.la/2xHWHJc"; // Link de afiliado do Mercado Livre para a camisa da seleção

export const affiliatesConfig = {
  // 1. Categoria Carreira / Educação (Focado em Currículos)
  carreira: {
    title: "Seu Currículo Está Pronto! Que tal um Curso Profissional?",
    description: "Se destaque no mercado de trabalho e adicione certificados incríveis ao seu currículo com nossos parceiros educacionais.",
    ctaText: "Ver Cursos Recomendados (-10% OFF)",
    bannerUrl: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=500&auto=format&fit=crop&q=60", // Imagem representativa de aprendizado digital
    affiliateLink: "https://seu-link-de-afiliado.com/cursos-online",
  },
  
  // 2. Categoria Imobiliário / Serviços (Focado em Contratos)
  imobiliario: {
    title: "Imóvel Alugado? Proteja seu Lar ou Organize sua Mudança!",
    description: "Garanta tranquilidade para o seu novo lar com seguros fiança/residencial líderes de mercado a partir de R$ 19,90/mês.",
    ctaText: "Simular Seguro Residencial Grátis",
    bannerUrl: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=500&auto=format&fit=crop&q=60", // Imagem representativa de casa/chaves
    affiliateLink: "https://seu-link-de-afiliado.com/seguro-residencial",
  },

  // 3. Categoria Finanças / Negócios (Focado em Recibos, RPA e Orçamentos)
  financas: {
    title: "Facilite as Vendas do seu Negócio!",
    description: "Adquira a maquininha de cartões Ton/Mercado Pago sem aluguel, com as menores taxas do mercado e frete grátis para todo o Brasil.",
    ctaText: "Pedir Maquininha com Desconto",
    bannerUrl: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=500&auto=format&fit=crop&q=60", // Imagem representativa de transação/cartão
    affiliateLink: "https://seu-link-de-afiliado.com/maquininha-desconto",
  },

  // 4. Geral / Padrão (Usado se o documento não se encaixar em nenhuma das acima)
  geral: {
    title: "Crie Documentos Profissionais em Segundos!",
    description: "Precisa de hospedagem para o seu site ou quer criar um negócio online? Conheça nossos parceiros tecnológicos com descontos exclusivos.",
    ctaText: "Conhecer Oferta Tecnológica",
    bannerUrl: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=500&auto=format&fit=crop&q=60", // Imagem de tecnologia/negócios
    affiliateLink: "https://seu-link-de-afiliado.com/hospedagem",
  }
};

// Função auxiliar para mapear o ID do documento para sua respectiva categoria de afiliado
export const getAffiliateByCategory = (docId) => {
  if (docId === 'curriculo') {
    return affiliatesConfig.carreira;
  }
  if (docId === 'contrato_aluguel' || docId.includes('contrato')) {
    return affiliatesConfig.imobiliario;
  }
  if (docId === 'recibo' || docId === 'rpa' || docId === 'orcamento' || docId.includes('recibo') || docId.includes('pagamento')) {
    return affiliatesConfig.financas;
  }
  return affiliatesConfig.geral;
};
