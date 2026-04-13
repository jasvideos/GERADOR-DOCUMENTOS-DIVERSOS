import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import './App.css';
import Admin from './pages/Admin';
import { 
  trackPageView, 
  trackDocumentView, 
  trackDocumentGeneration, 
  trackPayment 
} from './services/analytics';


// --- Funções Utilitárias ---
const numeroPorExtenso = (valor) => {
  if (!valor) return '';
  const v = parseFloat(valor.toString().replace(',', '.'));
  if (isNaN(v)) return '';

  const extenso = (n) => {
    if (n === 0) return '';
    if (n < 10) return ['', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove'][n];
    if (n < 20) return ['dez', 'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove'][n - 10];
    if (n < 100) {
      const u = n % 10;
      const d = Math.floor(n / 10);
      return ['', '', 'vinte', 'trinta', 'quarenta', 'cinquenta', 'sessenta', 'setenta', 'oitenta', 'noventa'][d] + (u ? ' e ' + extenso(u) : '');
    }
    if (n < 1000) {
      if (n === 100) return 'cem';
      const c = Math.floor(n / 100);
      const r = n % 100;
      return ['', 'cento', 'duzentos', 'trezentos', 'quatrocentos', 'quinhentos', 'seiscentos', 'setecentos', 'oitocentos', 'novecentos'][c] + (r ? ' e ' + extenso(r) : '');
    }
    if (n < 1000000) {
      const m = Math.floor(n / 1000);
      const r = n % 1000;
      return (m === 1 ? 'mil' : extenso(m) + ' mil') + (r ? (r < 100 || r % 100 === 0 ? ' e ' : ' ') + extenso(r) : '');
    }
    return n.toString(); // Simplificado para até 999.999
  };

  const inteiro = Math.floor(v);
  const centavos = Math.round((v - inteiro) * 100);
  let ret = extenso(inteiro) + (inteiro === 1 ? ' real' : ' reais');
  if (centavos > 0) ret += ' e ' + extenso(centavos) + (centavos === 1 ? ' centavo' : ' centavos');
  return ret;
};

// --- Validação de CPF e CNPJ ---
const validarCpfCnpj = (val) => {
  if (!val) return true;
  const cleanVal = val.replace(/\D/g, '');

  if (cleanVal.length === 11) {
    // CPF
    if (/^(\d)\1{10}$/.test(cleanVal)) return false;
    let sum = 0, remainder;
    for (let i = 1; i <= 9; i++) sum += parseInt(cleanVal.substring(i - 1, i)) * (11 - i);
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cleanVal.substring(9, 10))) return false;

    sum = 0;
    for (let i = 1; i <= 10; i++) sum += parseInt(cleanVal.substring(i - 1, i)) * (12 - i);
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cleanVal.substring(10, 11))) return false;
    return true;
  } else if (cleanVal.length === 14) {
    // CNPJ
    if (/^(\d)\1{13}$/.test(cleanVal)) return false;
    let size = cleanVal.length - 2;
    let numbers = cleanVal.substring(0, size);
    const digits = cleanVal.substring(size);
    let sum = 0;
    let pos = size - 7;
    for (let i = size; i >= 1; i--) {
      sum += numbers.charAt(size - i) * pos--;
      if (pos < 2) pos = 9;
    }
    let result = sum % 11 < 2 ? 0 : 11 - sum % 11;
    if (result !== parseInt(digits.charAt(0))) return false;

    size = size + 1;
    numbers = cleanVal.substring(0, size);
    sum = 0;
    pos = size - 7;
    for (let i = size; i >= 1; i--) {
      sum += numbers.charAt(size - i) * pos--;
      if (pos < 2) pos = 9;
    }
    result = sum % 11 < 2 ? 0 : 11 - sum % 11;
    if (result !== parseInt(digits.charAt(1))) return false;
    return true;
  }
  return false;
};

// --- Busca de CEP (ViaCEP API) ---
const buscarCEP = async (cep) => {
  const cepLimpo = cep.replace(/\D/g, '');
  if (cepLimpo.length !== 8) return null;
  
  try {
    const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
    const data = await response.json();
    
    if (data.erro) return null;
    
    return {
      cidade: data.localidade,
      estado: data.uf,
      endereco: data.logradouro ? `${data.logradouro}, ${data.bairro}` : '',
      bairro: data.bairro,
      logradouro: data.logradouro
    };
  } catch (error) {
    console.error('Erro ao buscar CEP:', error);
    return null;
  }
};

// --- Configuração dos Modelos de Documentos ---
const documentModels = [
  {
    id: 'recibo',
    title: 'Recibo de Pagamento',
    icon: '📄',
    price: 2.90,
    description: 'Gere recibos simples de pagamento com valor por extenso automático.',
    fieldGroups: [{ fields: [
      { name: 'logo', label: 'Logotipo (Opcional)', type: 'file' },
      { name: 'valor', label: 'Valor (R$)', type: 'number', placeholder: 'Ex: 1000,00' },
      { name: 'pagador', label: 'Nome do Pagador', type: 'text', placeholder: 'Quem pagou' },
      { name: 'referente', label: 'Referente a', type: 'text', placeholder: 'Ex: Aluguel de Março' },
      { name: 'beneficiario', label: 'Nome do Beneficiário', type: 'text', placeholder: 'Quem recebeu' },
      { name: 'cpf_cnpj', label: 'CPF/CNPJ do Beneficiário', type: 'text' },
      { name: 'cep', label: 'CEP', type: 'text', placeholder: 'Digite o CEP para auto-completar', className: 'third-width' },
      { name: 'cidade', label: 'Cidade', type: 'text', className: 'third-width' },
      { name: 'estado', label: 'UF', type: 'text', className: 'third-width' },
      { name: 'data', label: 'Data', type: 'date' }
    ]}],
    generatePDF: (data) => {
      const doc = new jsPDF();
      let yOffset = 0;

      if (data.logo) {
        // Espaço 20x120mm centralizado (x=45, y=10)
        doc.addImage(data.logo, 45, 10, 120, 20);
        yOffset = 30; // Empurra o conteúdo para baixo se houver logo
      }

      doc.setFontSize(22);
      doc.text('RECIBO', 105, 20 + yOffset, null, null, 'center');
      
      doc.setFontSize(12);

      doc.setFontSize(16);
      doc.text(`VALOR: R$ ${data.valor || '0,00'}`, 190, 40 + yOffset, null, null, 'right');

      doc.setFontSize(12);
      const valorExtenso = numeroPorExtenso(data.valor) || '____________________';
      const texto = `Recebi(emos) de ${data.pagador || '____________________'}, a importância de R$ ${data.valor || '___'} (${valorExtenso}) referente a ${data.referente || '____________________'}.`;
      const splitText = doc.splitTextToSize(texto, 170);
      doc.text(splitText, 20, 60 + yOffset);

      doc.text(`Para maior clareza firmo(amos) o presente.`, 20, 90 + yOffset);
      doc.text(`${data.cidade || 'Cidade'} - ${data.estado || 'UF'}, ${data.data || '___/___/___'}`, 105, 120 + yOffset, null, null, 'center');

      doc.text('________________________________________________', 105, 130 + yOffset, null, null, 'center');
      doc.text(`${data.beneficiario || 'Assinatura'}`, 105, 135 + yOffset, null, null, 'center');
      doc.text(`CPF/CNPJ: ${data.cpf_cnpj || ''}`, 105, 140 + yOffset, null, null, 'center');

      return doc;
    }
  },
  {
    id: 'recibo_aluguel',
    title: 'Recibo de Aluguel',
    icon: '🏠',
    price: 2.90,
    description: 'Recibos detalhados para locação de imóveis residenciais ou comerciais.',
    fieldGroups: [{ fields: [
      { name: 'locador_nome', label: 'Nome do Locador (quem recebe)', type: 'text' },
      { name: 'locador_cpf_cnpj', label: 'CPF/CNPJ do Locador', type: 'text' },
      { name: 'locatario_nome', label: 'Nome do Locatário (quem paga)', type: 'text' },
      { name: 'locatario_cpf_cnpj', label: 'CPF/CNPJ do Locatário', type: 'text' },
      { name: 'endereco_imovel', label: 'Endereço do Imóvel', type: 'text' },
      { name: 'valor_aluguel', label: 'Valor do Aluguel (R$)', type: 'number' },
      { name: 'mes_referencia', label: 'Mês de Referência', type: 'text', placeholder: 'Ex: Janeiro de 2024' },
      { name: 'cep', label: 'CEP', type: 'text', placeholder: 'Digite o CEP', className: 'third-width' },
      { name: 'cidade', label: 'Cidade', type: 'text', className: 'third-width' },
      { name: 'estado', label: 'UF', type: 'text', className: 'third-width' },
      { name: 'data', label: 'Data do Pagamento', type: 'date' }
    ]}],
    generatePDF: (data) => {
      const doc = new jsPDF();
      const margin = 20;
      const pageWidth = 210;
      const maxLineWidth = pageWidth - (margin * 2);
      let yPos = 20;

      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text('RECIBO DE ALUGUEL', pageWidth / 2, yPos, { align: 'center' });
      yPos += 20;

      doc.setFontSize(16);
      doc.text(`VALOR: R$ ${data.valor_aluguel || '0,00'}`, pageWidth - margin, yPos, { align: 'right' });
      yPos += 20;

      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');

      const valorExtenso = numeroPorExtenso(data.valor_aluguel) || '____________________';
      const texto = `Recebi(emos) de ${data.locatario_nome || '____________________'} (CPF/CNPJ nº ${data.locatario_cpf_cnpj || '____________________'}), a importância de R$ ${data.valor_aluguel || '___'} (${valorExtenso}), referente ao pagamento do aluguel do imóvel situado no endereço ${data.endereco_imovel || '__________________________________'}, correspondente ao mês de ${data.mes_referencia || '____________________'}.`;
      
      const splitText = doc.splitTextToSize(texto, maxLineWidth);
      doc.text(splitText, margin, yPos, { align: 'left' });
      yPos += (splitText.length * 5) + 15;

      doc.text('Por ser a expressão da verdade, firmo(amos) o presente.', margin, yPos);
      yPos += 20;

      const d = data.data ? new Date(data.data + 'T12:00:00') : null;
      const dateText = d ? `${data.cidade || 'Cidade'} - ${data.estado || 'UF'}, ${d.getDate()} de ${d.toLocaleString('pt-BR', { month: 'long' })} de ${d.getFullYear()}.` : `${data.cidade || 'Cidade'} - ${data.estado || 'UF'}, ___ de ____________ de ______.`;
      doc.text(dateText, pageWidth / 2, yPos, { align: 'center' });
      yPos += 30;

      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 5;
      doc.text(data.locador_nome || 'Assinatura do Locador', pageWidth / 2, yPos, { align: 'center' });
      yPos += 5;
      doc.text(`CPF/CNPJ: ${data.locador_cpf_cnpj || '____________________'}`, pageWidth / 2, yPos, { align: 'center' });

      return doc;
    }
  },
  {
    id: 'declaracao_residencia',
    title: 'Declaração de Residência',
    icon: '📍',
    price: 2.90,
    description: 'Documento para comprovação de endereço residencial.',
    fieldGroups: [{ fields: [
      { name: 'nome', label: 'Seu Nome Completo', type: 'text' },
      { name: 'nacionalidade', label: 'Nacionalidade', type: 'text', className: 'half-width' },
      { name: 'estado_civil', label: 'Estado Civil', type: 'text', className: 'half-width' },
      { name: 'rg', label: 'RG', type: 'text', className: 'half-width' },
      { name: 'cpf', label: 'CPF', type: 'text', className: 'half-width' },
      { name: 'cep', label: 'CEP', type: 'text', placeholder: 'Digite o CEP para auto-completar' },
      { name: 'endereco', label: 'Endereço Completo', type: 'text' },
      { name: 'cidade', label: 'Cidade', type: 'text', className: 'half-width' },
      { name: 'estado', label: 'UF', type: 'text', className: 'half-width' },
      { name: 'data', label: 'Data', type: 'date' }
    ]}],
    generatePDF: (data) => {
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text('DECLARAÇÃO DE RESIDÊNCIA', 105, 20, null, null, 'center');
      
      doc.setFontSize(11);
      doc.setFontSize(12);
      const texto = `Eu, ${data.nome || '________________'}, ${data.nacionalidade || 'brasileiro(a)'}, ${data.estado_civil || 'solteiro(a)'}, portador(a) do RG nº ${data.rg || '___'} e inscrito(a) no CPF sob o nº ${data.cpf || '___'}, DECLARO para os devidos fins de comprovação de residência, que sou residente e domiciliado(a) na ${data.endereco || '________________'}.`;
      
      const splitText = doc.splitTextToSize(texto, 170);
      doc.text(splitText, 20, 50);

      doc.text(`Por ser verdade, firmo o presente.`, 20, 90);
      doc.text(`${data.cidade || 'Cidade'} - ${data.estado || 'UF'}, ${data.data || '___/___/___'}`, 20, 110);

      doc.text('________________________________________________', 105, 140, null, null, 'center');
      doc.text('Assinatura do Declarante', 105, 145, null, null, 'center');

      return doc;
    }
  },
  {
    id: 'contrato_locacao',
    title: 'Contrato de Locação',
    icon: '📝',
    price: 5.90,
    description: 'Contrato completo (Residencial ou Comercial) com cláusulas detalhadas.',
    fieldGroups: [
      {
        tab: 'Partes',
        fields: [
          { type: 'heading', label: 'Dados do Locador' },
          { name: 'locador_nome', label: 'Nome Completo (Locador)', type: 'text' },
          { name: 'locador_cpf_cnpj', label: 'CPF/CNPJ', type: 'text', className: 'half-width' },
          { name: 'locador_rg', label: 'RG/Inscr. Est.', type: 'text', className: 'half-width' },
          { name: 'locador_estado_civil', label: 'Estado Civil', type: 'text', className: 'half-width' },
          { name: 'locador_profissao', label: 'Profissão', type: 'text', className: 'half-width' },
          { name: 'locador_endereco', label: 'Endereço Completo', type: 'text' },
          { name: 'locador_contato', label: 'Telefone/E-mail', type: 'text' },
          
          { type: 'heading', label: 'Dados do Locatário' },
          { name: 'locatario_nome', label: 'Nome Completo (Locatário)', type: 'text' },
          { name: 'locatario_cpf_cnpj', label: 'CPF/CNPJ', type: 'text', className: 'half-width' },
          { name: 'locatario_rg', label: 'RG/Inscr. Est.', type: 'text', className: 'half-width' },
          { name: 'locatario_estado_civil', label: 'Estado Civil', type: 'text', className: 'half-width' },
          { name: 'locatario_profissao', label: 'Profissão', type: 'text', className: 'half-width' },
          { name: 'locatario_endereco', label: 'Endereço Completo', type: 'text' },
          { name: 'locatario_contato', label: 'Telefone/E-mail', type: 'text' },
        ]
      },
      {
        tab: 'Imóvel e Prazo',
        fields: [
          { name: 'endereco_imovel', label: 'Endereço do Imóvel', type: 'text' },
          { name: 'imovel_tipo', label: 'Tipo de Locação', type: 'select', options: ['Residencial', 'Comercial'] },
          { name: 'imovel_descricao', label: 'Descrição Detalhada', type: 'textarea', placeholder: 'Ex: Casa com 2 quartos, sala, cozinha...' },
          { name: 'finalidade_atividade', label: 'Atividade Comercial (se aplicável)', type: 'text', showIf: (data) => data.imovel_tipo === 'Comercial' },
          
          { type: 'heading', label: 'Prazo da Locação' },
          { name: 'prazo_duracao', label: 'Prazo (ex: 12 meses)', type: 'text', className: 'third-width' },
          { name: 'data_inicio', label: 'Data Início', type: 'date', className: 'third-width' },
          { name: 'data_termino', label: 'Data Término', type: 'date', className: 'third-width' },
        ]
      },
      {
        tab: 'Valores',
        fields: [
          { name: 'valor_aluguel', label: 'Valor do Aluguel (R$)', type: 'number', className: 'half-width' },
          { name: 'dia_vencimento', label: 'Dia do Vencimento', type: 'number', className: 'half-width' },
          { name: 'meio_pagamento', label: 'Meio de Pagamento', type: 'select', options: ['Transferência', 'Pix', 'Boleto', 'Dinheiro', 'Outro'] },
          { name: 'indice_reajuste', label: 'Índice de Reajuste', type: 'text', defaultValue: 'IGPM' },
          
          { type: 'heading', label: 'Multas e Juros' },
          { name: 'multa_rescisao', label: 'Multa Rescisão (meses)', type: 'number', defaultValue: '3', className: 'third-width' },
          { name: 'multa_atraso', label: 'Multa Atraso (%)', type: 'number', defaultValue: '10', className: 'third-width' },
          { name: 'juros_mora', label: 'Juros Mora (% ao mês)', type: 'number', defaultValue: '1', className: 'third-width' },
        ]
      },
      {
        tab: 'Garantia',
        fields: [
          { name: 'tipo_garantia', label: 'Tipo de Garantia', type: 'select', options: ['Caução', 'Fiador', 'Seguro Fiança', 'Título de Capitalização', 'Sem Garantia'] },
          { name: 'valor_caucao', label: 'Valor da Caução (R$)', type: 'number', showIf: (data) => data.tipo_garantia === 'Caução' },
          { name: 'dados_fiador', label: 'Dados do Fiador', type: 'textarea', showIf: (data) => data.tipo_garantia === 'Fiador', placeholder: 'Nome, CPF, Endereço...' },
        ]
      },
      {
        tab: 'Finalização',
        fields: [
          { name: 'cep', label: 'CEP', type: 'text', placeholder: 'Digite o CEP', className: 'third-width' },
          { name: 'cidade', label: 'Cidade', type: 'text', className: 'third-width' },
          { name: 'estado', label: 'UF', type: 'text', className: 'third-width' },
          { name: 'data_assinatura', label: 'Data da Assinatura', type: 'date' },
          { name: 'testemunha1_nome', label: 'Nome Testemunha 1', type: 'text', className: 'half-width' },
          { name: 'testemunha1_cpf', label: 'CPF Testemunha 1', type: 'text', className: 'half-width' },
          { name: 'testemunha2_nome', label: 'Nome Testemunha 2', type: 'text', className: 'half-width' },
          { name: 'testemunha2_cpf', label: 'CPF Testemunha 2', type: 'text', className: 'half-width' },
          { name: 'incluir_vistoria', label: 'Incluir Termo de Vistoria Anexo', type: 'checkbox' },
          { 
            name: 'itens_vistoria', 
            label: 'Itens da Vistoria', 
            type: 'dynamic_list', 
            showIf: (data) => data.incluir_vistoria,
            defaultValues: ['Pintura (Paredes/Teto)', 'Pisos e Rodapés', 'Portas, Fechaduras e Chaves', 'Janelas e Vidros', 'Instalações Elétricas', 'Instalações Hidráulicas', 'Louças Sanitárias e Pias', 'Móveis e Armários']
          },
        ]
      }
    ],
    generatePDF: (data) => {
      const doc = new jsPDF();
      const margin = 20;
      const pageWidth = 210;
      const maxLineWidth = pageWidth - (margin * 2);
      let yPos = 20;

      const formatDate = (dateStr) => {
        if (!dateStr) return '___/___/____';
        const [y, m, d] = dateStr.split('-');
        return `${d}/${m}/${y}`;
      };

      const addClause = (title, content) => {
        if (yPos > 270) { doc.addPage(); yPos = 20; }
        doc.setFont('helvetica', 'bold');
        doc.text(title, margin, yPos);
        yPos += 5;
        doc.setFont('helvetica', 'normal');
        const splitContent = doc.splitTextToSize(content, maxLineWidth);
        doc.text(splitContent, margin, yPos, { align: 'left' });
        yPos += (splitContent.length * 5) + 5;
      };

      // Título
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('CONTRATO DE LOCAÇÃO', pageWidth / 2, yPos, { align: 'center' });
      yPos += 7;
      doc.setFontSize(12);
      doc.text(`(${data.imovel_tipo ? data.imovel_tipo.toUpperCase() : 'RESIDENCIAL OU COMERCIAL'})`, pageWidth / 2, yPos, { align: 'center' });
      yPos += 15;
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      
      doc.text("Pelo presente instrumento particular de contrato de locação, de um lado:", margin, yPos);
      yPos += 10;

      // Dados das Partes
      const printParty = (label, prefix) => {
        doc.setFont('helvetica', 'bold');
        doc.text(label, margin, yPos);
        yPos += 5;
        doc.setFont('helvetica', 'normal');
        
        const text = `Nome completo: ${data[prefix + '_nome'] || '____________________________________________'}, CPF/CNPJ: ${data[prefix + '_cpf_cnpj'] || '____________________'}, RG/Inscrição Estadual: ${data[prefix + '_rg'] || '____________________'}, Estado civil: ${data[prefix + '_estado_civil'] || '____________________'}, Profissão: ${data[prefix + '_profissao'] || '____________________'}, Endereço completo: ${data[prefix + '_endereco'] || '_________________________________________________'}, Telefone/E-mail: ${data[prefix + '_contato'] || '____________________'}.`;

        const splitText = doc.splitTextToSize(text, maxLineWidth);
        doc.text(splitText, margin, yPos, { align: 'left' });
        yPos += (splitText.length * 5) + 5;
      };

      printParty('LOCADOR', 'locador');
      printParty('LOCATÁRIO', 'locatario');

      const transition = "As partes acima identificadas têm entre si justo e contratado o presente contrato de locação, que se regerá pelas cláusulas e condições seguintes e pela legislação aplicável.";
      const splitTransition = doc.splitTextToSize(transition, maxLineWidth);
      doc.text(splitTransition, margin, yPos);
      yPos += (splitTransition.length * 5) + 5;

      doc.setLineWidth(0.5);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 10;

      // Cláusulas
      addClause('CLÁUSULA 1 — DO IMÓVEL', `O LOCADOR dá em locação ao LOCATÁRIO o imóvel situado à: ${data.endereco_imovel || '____________________'}. Tipo: ${data.imovel_tipo || '__________'}. Descrição detalhada: ${data.imovel_descricao || '____________________'}.`);

      let finalidadeText = `O imóvel será utilizado exclusivamente para fins ${data.imovel_tipo === 'Comercial' ? 'Comerciais' : 'Residenciais'}.`;
      if (data.imovel_tipo === 'Comercial' && data.finalidade_atividade) finalidadeText += ` Atividade específica: ${data.finalidade_atividade}.`;
      addClause('CLÁUSULA 2 — DA FINALIDADE', finalidadeText);

      addClause('CLÁUSULA 3 — DO PRAZO', `O prazo da locação será de ${data.prazo_duracao || '___'} meses/anos, iniciando em ${formatDate(data.data_inicio)} e terminando em ${formatDate(data.data_termino)}.`);

      const valorExtenso = numeroPorExtenso(data.valor_aluguel) ? ` (${numeroPorExtenso(data.valor_aluguel)})` : '';
      addClause('CLÁUSULA 4 — DO VALOR DO ALUGUEL', `O aluguel mensal será de R$ ${data.valor_aluguel || '______'}${valorExtenso}, a ser pago até o dia ${data.dia_vencimento || '___'} de cada mês, por meio de: ${data.meio_pagamento || '__________'}.`);

      addClause('CLÁUSULA 5 — DO REAJUSTE', `O aluguel será reajustado anualmente pelo índice legal vigente ou outro índice acordado: ${data.indice_reajuste || 'IGPM'}.`);

      addClause('CLÁUSULA 6 — DOS ENCARGOS', `Serão de responsabilidade do LOCATÁRIO:\n• IPTU\n• Taxas de condomínio\n• Consumo de água, luz, gás e demais serviços\n• Taxas ordinárias`);

      let garantiaText = `Tipo de garantia: ${data.tipo_garantia || '__________'}.`;
      if (data.tipo_garantia === 'Caução') garantiaText += ` Valor: R$ ${data.valor_caucao || '______'}.`;
      else if (data.tipo_garantia === 'Fiador') garantiaText += ` Dados do Fiador: ${data.dados_fiador || '____________________'}.`;
      addClause('CLÁUSULA 7 — DA GARANTIA LOCATÍCIA', garantiaText);

      addClause('CLÁUSULA 8 — DAS OBRIGAÇÕES DO LOCATÁRIO', `• Pagar pontualmente aluguel e encargos\n• Conservar o imóvel\n• Não realizar alterações sem autorização\n• Permitir vistoria mediante aviso prévio\n• Restituir o imóvel nas mesmas condições`);

      addClause('CLÁUSULA 9 — DAS OBRIGAÇÕES DO LOCADOR', `• Entregar o imóvel em condições de uso\n• Garantir o uso pacífico\n• Realizar reparos estruturais necessários`);

      addClause('CLÁUSULA 10 — DAS BENFEITORIAS', `Benfeitorias somente com autorização por escrito do LOCADOR, sem direito a retenção ou indenização salvo acordo expresso.`);

      addClause('CLÁUSULA 11 — DA RESCISÃO', `Em caso de rescisão antecipada pelo LOCATÁRIO, poderá ser aplicada multa proporcional equivalente a ${data.multa_rescisao || '___'} meses de aluguel.`);

      addClause('CLÁUSULA 12 — DA MULTA POR ATRASO', `O atraso no pagamento implicará multa de ${data.multa_atraso || '__'}%, juros de ${data.juros_mora || '__'}% ao mês e correção monetária.`);

      addClause('CLÁUSULA 13 — DA VISTORIA', `Será realizado laudo de vistoria inicial e final, integrando este contrato.`);

      addClause('CLÁUSULA 14 — DA SUBLOCAÇÃO', `É vedada a sublocação ou cessão sem autorização expressa do LOCADOR.`);

      addClause('CLÁUSULA 15 — DO FORO', `Fica eleito o foro da comarca do imóvel para dirimir quaisquer controvérsias.`);

      doc.setLineWidth(0.5);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 10;

      // Declarações Finais
      doc.setFont('helvetica', 'bold');
      doc.text('DECLARAÇÕES FINAIS', margin, yPos);
      yPos += 5;
      doc.setFont('helvetica', 'normal');
      doc.text('As partes declaram que leram e concordam com todas as cláusulas.', margin, yPos);
      yPos += 15;

      let dateText = `${data.cidade || 'Local'}, ___ de ____________ de ______.`;
      if (data.data_assinatura) {
        const d = new Date(data.data_assinatura + 'T12:00:00');
        dateText = `${data.cidade || 'Local'}, ${d.getDate()} de ${d.toLocaleString('pt-BR', { month: 'long' })} de ${d.getFullYear()}.`;
      }
      doc.text(dateText, margin, yPos);
      yPos += 20;

      // Assinaturas
      if (yPos > 240) { doc.addPage(); yPos = 40; }

      const drawSignatureLine = (label, x, y) => {
        doc.line(x, y, x + 80, y);
        doc.text(label, x + 40, y + 5, { align: 'center' });
      };

      drawSignatureLine(data.locador_nome || 'LOCADOR', margin, yPos);
      drawSignatureLine(data.locatario_nome || 'LOCATÁRIO', pageWidth - margin - 80, yPos);
      yPos += 25;

      drawSignatureLine(`Testemunha 1: ${data.testemunha1_nome || ''}`, margin, yPos);
      if (data.testemunha1_cpf) doc.text(`CPF: ${data.testemunha1_cpf}`, margin + 40, yPos + 10, { align: 'center' });

      drawSignatureLine(`Testemunha 2: ${data.testemunha2_nome || ''}`, pageWidth - margin - 80, yPos);
      if (data.testemunha2_cpf) doc.text(`CPF: ${data.testemunha2_cpf}`, pageWidth - margin - 40, yPos + 10, { align: 'center' });

      // --- Termo de Vistoria Anexo ---
      if (data.incluir_vistoria) {
        doc.addPage();
        yPos = 20;
        
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text('ANEXO I - TERMO DE VISTORIA DE IMÓVEL', pageWidth / 2, yPos, { align: 'center' });
        yPos += 15;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        
        const vistoriaIntro = `Este termo é parte integrante do Contrato de Locação do imóvel situado à ${data.endereco_imovel || '____________________'}, firmado entre as partes abaixo assinadas.`;
        doc.text(doc.splitTextToSize(vistoriaIntro, maxLineWidth), margin, yPos);
        yPos += 15;

        doc.setFont('helvetica', 'bold');
        doc.text('ESTADO DE CONSERVAÇÃO DOS ITENS:', margin, yPos);
        yPos += 10;
        
        const defaultItems = ['Pintura (Paredes/Teto)', 'Pisos e Rodapés', 'Portas, Fechaduras e Chaves', 'Janelas e Vidros', 'Instalações Elétricas', 'Instalações Hidráulicas', 'Louças Sanitárias e Pias', 'Móveis e Armários'];
        const items = (data.itens_vistoria && data.itens_vistoria.length > 0) ? data.itens_vistoria : defaultItems;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        items.forEach(item => {
            doc.text(`${item}:`, margin, yPos);
            doc.text('(__) Bom  (__) Regular  (__) Ruim', margin + 90, yPos);
            yPos += 5;
            doc.text('Obs: ______________________________________________________________________', margin, yPos);
            yPos += 10;
        });

        yPos += 10;
        doc.setFontSize(10);
        doc.text("O LOCATÁRIO declara ter vistoriado o imóvel e conferido os itens acima, concordando com o estado de conservação descrito.", margin, yPos, { maxWidth: maxLineWidth });
        yPos += 20;

        drawSignatureLine('LOCADOR', margin, yPos);
        drawSignatureLine('LOCATÁRIO', pageWidth - margin - 80, yPos);
      }

      return doc;
    }
  },
  { 
    id: 'curriculo', 
    title: 'Curriculum Vitae', 
    icon: '💼',
    price: 2.90,
    description: 'Crie um currículo profissional com 5 modelos diferentes.',
    isCustom: true,
    generatePDF: (data) => {
      const doc = new jsPDF();
      const margin = 20;
      const pageWidth = 210;
      const pageHeight = 297;
      const maxLineWidth = pageWidth - (margin * 2);
      let yPos = 20;

      // Funções auxiliares
      const checkNewPage = (space = 20) => {
        if (yPos + space > pageHeight - 20) {
          doc.addPage();
          yPos = 20;
        }
      };

      const addPhoto = (x, y, w, h) => {
        if (data.foto) {
          try {
            let format = 'JPEG';
            if (data.foto.startsWith('data:image/png')) format = 'PNG';
            doc.addImage(data.foto, format, x, y, w, h);
            doc.setDrawColor(180);
            doc.setLineWidth(0.3);
            doc.rect(x, y, w, h);
          } catch (e) {
            doc.setDrawColor(200);
            doc.setFillColor(245, 245, 245);
            doc.rect(x, y, w, h, 'FD');
          }
        }
      };

      const modelo = data.modelo_curriculo || 'classico';

      // ===================== MODELO CLÁSSICO =====================
      if (modelo === 'classico') {
        const photoBoxWidth = 35;
        const photoBoxHeight = 45;
        const photoX = pageWidth - margin - photoBoxWidth;
        let headerTextMaxWidth = maxLineWidth - photoBoxWidth - 10;

        addPhoto(photoX, 20, photoBoxWidth, photoBoxHeight);

        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text((data.nome || 'SEU NOME').toUpperCase(), margin, 28);
        yPos = 35;

        doc.setFontSize(14);
        doc.setTextColor(80);
        doc.text((data.cargo || '').toUpperCase(), margin, yPos);
        yPos += 8;
        doc.setTextColor(0);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const info = [
          data.estado_civil ? `${data.estado_civil}, ${data.idade || ''} anos` : '',
          data.endereco || '',
          `${data.cidade || ''}${data.estado ? ' - ' + data.estado : ''}`,
          data.telefone ? `Tel: ${data.telefone}` : '',
          data.email || ''
        ].filter(Boolean);
        info.forEach(line => { doc.text(line, margin, yPos); yPos += 5; });

        yPos = Math.max(yPos, 70);
        doc.setLineWidth(0.5);
        doc.line(margin, yPos, pageWidth - margin, yPos);
        yPos += 10;

        // Resumo
        if (data.resumo) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(12);
          doc.text('RESUMO PROFISSIONAL', margin, yPos);
          yPos += 6;
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(10);
          const lines = doc.splitTextToSize(data.resumo, maxLineWidth);
          doc.text(lines, margin, yPos);
          yPos += lines.length * 5 + 8;
        }

        // Experiência
        if (data.experiencias?.length > 0) {
          checkNewPage(30);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(12);
          doc.text('EXPERIÊNCIA PROFISSIONAL', margin, yPos);
          yPos += 7;
          data.experiencias.forEach(exp => {
            checkNewPage(20);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(11);
            doc.text(exp.empresa || '', margin, yPos);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.text(`${exp.cargo || ''} | ${exp.periodo || ''}`, margin, yPos + 5);
            yPos += 14;
          });
          yPos += 5;
        }

        // Formação
        if (data.formacao?.length > 0) {
          checkNewPage(30);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(12);
          doc.text('FORMAÇÃO ACADÊMICA', margin, yPos);
          yPos += 7;
          data.formacao.forEach(edu => {
            checkNewPage(15);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(11);
            doc.text(edu.instituicao || '', margin, yPos);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.text(`${edu.curso || ''} | ${edu.periodo || ''}`, margin, yPos + 5);
            yPos += 14;
          });
          yPos += 5;
        }

        // Idiomas
        if (data.idiomas?.length > 0) {
          checkNewPage(20);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(12);
          doc.text('IDIOMAS', margin, yPos);
          yPos += 6;
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(10);
          data.idiomas.forEach(lang => {
            doc.text(`• ${lang.idioma} - ${lang.nivel}`, margin + 3, yPos);
            yPos += 5;
          });
          yPos += 5;
        }

        // Habilidades
        if (data.habilidades?.length > 0) {
          checkNewPage(20);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(12);
          doc.text('HABILIDADES', margin, yPos);
          yPos += 6;
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(10);
          const skills = doc.splitTextToSize(data.habilidades.join(' • '), maxLineWidth);
          doc.text(skills, margin, yPos);
        }
      }

      // ===================== MODELO MODERNO (Duas Colunas) =====================
      else if (modelo === 'moderno') {
        const sidebarWidth = 65;
        const sidebarColor = [41, 128, 185]; // Azul

        // Sidebar
        doc.setFillColor(...sidebarColor);
        doc.rect(0, 0, sidebarWidth, pageHeight, 'F');

        // Foto na sidebar
        if (data.foto) {
          addPhoto(12, 15, 40, 50);
        }

        // Nome na sidebar
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        const nomeLines = doc.splitTextToSize((data.nome || '').toUpperCase(), sidebarWidth - 10);
        doc.text(nomeLines, sidebarWidth / 2, 75, { align: 'center' });

        // Contato na sidebar
        yPos = 95;
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('CONTATO', 8, yPos);
        yPos += 8;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        if (data.telefone) { doc.text(data.telefone, 8, yPos); yPos += 6; }
        if (data.email) { 
          const emailLines = doc.splitTextToSize(data.email, sidebarWidth - 12);
          doc.text(emailLines, 8, yPos); 
          yPos += emailLines.length * 5 + 3; 
        }
        if (data.cidade) { doc.text(`${data.cidade}${data.estado ? '/' + data.estado : ''}`, 8, yPos); yPos += 10; }

        // Idiomas na sidebar
        if (data.idiomas?.length > 0) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(10);
          doc.text('IDIOMAS', 8, yPos);
          yPos += 7;
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
          data.idiomas.forEach(lang => {
            doc.text(`${lang.idioma}: ${lang.nivel}`, 8, yPos);
            yPos += 6;
          });
          yPos += 8;
        }

        // Habilidades na sidebar
        if (data.habilidades?.length > 0) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(10);
          doc.text('HABILIDADES', 8, yPos);
          yPos += 7;
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
          data.habilidades.forEach(skill => {
            if (yPos < pageHeight - 20) {
              doc.text(`• ${skill}`, 8, yPos);
              yPos += 6;
            }
          });
        }

        // Conteúdo principal (direita)
        doc.setTextColor(0, 0, 0);
        const contentX = sidebarWidth + 10;
        const contentWidth = pageWidth - sidebarWidth - margin;
        yPos = 25;

        // Cargo
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(18);
        doc.setTextColor(...sidebarColor);
        doc.text((data.cargo || 'CARGO PRETENDIDO').toUpperCase(), contentX, yPos);
        yPos += 12;
        doc.setTextColor(0);

        // Resumo
        if (data.resumo) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(11);
          doc.text('PERFIL PROFISSIONAL', contentX, yPos);
          yPos += 6;
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(10);
          const lines = doc.splitTextToSize(data.resumo, contentWidth);
          doc.text(lines, contentX, yPos);
          yPos += lines.length * 5 + 10;
        }

        // Experiência
        if (data.experiencias?.length > 0) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(11);
          doc.setTextColor(...sidebarColor);
          doc.text('EXPERIÊNCIA', contentX, yPos);
          doc.setTextColor(0);
          yPos += 7;
          data.experiencias.forEach(exp => {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.text(exp.empresa || '', contentX, yPos);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.text(`${exp.cargo || ''} • ${exp.periodo || ''}`, contentX, yPos + 5);
            yPos += 15;
          });
          yPos += 5;
        }

        // Formação
        if (data.formacao?.length > 0) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(11);
          doc.setTextColor(...sidebarColor);
          doc.text('FORMAÇÃO', contentX, yPos);
          doc.setTextColor(0);
          yPos += 7;
          data.formacao.forEach(edu => {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.text(edu.curso || '', contentX, yPos);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.text(`${edu.instituicao || ''} • ${edu.periodo || ''}`, contentX, yPos + 5);
            yPos += 15;
          });
        }
      }

      // ===================== MODELO CRIATIVO =====================
      else if (modelo === 'criativo') {
        const accentColor = [231, 76, 60]; // Vermelho coral

        // Header colorido
        doc.setFillColor(...accentColor);
        doc.rect(0, 0, pageWidth, 50, 'F');

        // Foto circular (simulada com retângulo)
        if (data.foto) {
          addPhoto(margin, 10, 35, 35);
        }

        // Nome no header
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(24);
        doc.text((data.nome || '').toUpperCase(), 65, 25);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text(data.cargo || '', 65, 38);

        // Contato abaixo do header
        yPos = 60;
        doc.setTextColor(100);
        doc.setFontSize(9);
        const contato = [data.telefone, data.email, `${data.cidade || ''}${data.estado ? ' - ' + data.estado : ''}`].filter(Boolean).join(' | ');
        doc.text(contato, pageWidth / 2, yPos, { align: 'center' });
        yPos += 15;
        doc.setTextColor(0);

        // Linha decorativa
        doc.setDrawColor(...accentColor);
        doc.setLineWidth(1);
        doc.line(margin, yPos - 5, pageWidth - margin, yPos - 5);

        // Resumo
        if (data.resumo) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(12);
          doc.setTextColor(...accentColor);
          doc.text('SOBRE MIM', margin, yPos);
          doc.setTextColor(0);
          yPos += 7;
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(10);
          const lines = doc.splitTextToSize(data.resumo, maxLineWidth);
          doc.text(lines, margin, yPos);
          yPos += lines.length * 5 + 12;
        }

        // Layout em duas colunas para experiência e formação
        const colWidth = (maxLineWidth - 10) / 2;

        // Experiência (esquerda)
        let leftY = yPos;
        if (data.experiencias?.length > 0) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(12);
          doc.setTextColor(...accentColor);
          doc.text('EXPERIÊNCIA', margin, leftY);
          doc.setTextColor(0);
          leftY += 7;
          data.experiencias.forEach(exp => {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.text(exp.empresa || '', margin, leftY);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.text(exp.cargo || '', margin, leftY + 5);
            doc.setTextColor(150);
            doc.text(exp.periodo || '', margin, leftY + 10);
            doc.setTextColor(0);
            leftY += 18;
          });
        }

        // Formação (direita)
        let rightY = yPos;
        const rightX = margin + colWidth + 10;
        if (data.formacao?.length > 0) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(12);
          doc.setTextColor(...accentColor);
          doc.text('FORMAÇÃO', rightX, rightY);
          doc.setTextColor(0);
          rightY += 7;
          data.formacao.forEach(edu => {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.text(edu.curso || '', rightX, rightY);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.text(edu.instituicao || '', rightX, rightY + 5);
            doc.setTextColor(150);
            doc.text(edu.periodo || '', rightX, rightY + 10);
            doc.setTextColor(0);
            rightY += 18;
          });
        }

        yPos = Math.max(leftY, rightY) + 10;

        // Habilidades em tags
        if (data.habilidades?.length > 0) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(12);
          doc.setTextColor(...accentColor);
          doc.text('HABILIDADES', margin, yPos);
          doc.setTextColor(0);
          yPos += 8;
          doc.setFontSize(9);
          doc.setFont('helvetica', 'normal');
          let xPos = margin;
          data.habilidades.forEach(skill => {
            const skillWidth = doc.getTextWidth(skill) + 8;
            if (xPos + skillWidth > pageWidth - margin) {
              xPos = margin;
              yPos += 10;
            }
            doc.setFillColor(240, 240, 240);
            doc.roundedRect(xPos, yPos - 4, skillWidth, 8, 2, 2, 'F');
            doc.text(skill, xPos + 4, yPos + 1);
            xPos += skillWidth + 5;
          });
        }
      }

      // ===================== MODELO EXECUTIVO =====================
      else if (modelo === 'executivo') {
        const headerColor = [44, 62, 80]; // Azul escuro

        // Header elegante
        doc.setFillColor(...headerColor);
        doc.rect(0, 0, pageWidth, 45, 'F');

        // Nome grande no header
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(26);
        doc.text((data.nome || '').toUpperCase(), margin, 25);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'normal');
        doc.text(data.cargo || '', margin, 38);

        // Foto no canto direito do header
        if (data.foto) {
          addPhoto(pageWidth - margin - 30, 8, 30, 35);
        }

        // Dados de contato
        yPos = 55;
        doc.setTextColor(0);
        doc.setFontSize(10);
        const contatoLine = [data.telefone, data.email, data.cidade].filter(Boolean).join('  •  ');
        doc.text(contatoLine, margin, yPos);
        yPos += 15;

        // Linha dupla
        doc.setDrawColor(...headerColor);
        doc.setLineWidth(0.5);
        doc.line(margin, yPos - 5, pageWidth - margin, yPos - 5);
        doc.line(margin, yPos - 3, pageWidth - margin, yPos - 3);

        // Resumo executivo
        if (data.resumo) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(12);
          doc.setTextColor(...headerColor);
          doc.text('RESUMO EXECUTIVO', margin, yPos);
          yPos += 7;
          doc.setTextColor(0);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(10);
          const lines = doc.splitTextToSize(data.resumo, maxLineWidth);
          doc.text(lines, margin, yPos);
          yPos += lines.length * 5 + 10;
        }

        // Experiência com destaques
        if (data.experiencias?.length > 0) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(12);
          doc.setTextColor(...headerColor);
          doc.text('TRAJETÓRIA PROFISSIONAL', margin, yPos);
          yPos += 8;
          doc.setTextColor(0);
          data.experiencias.forEach(exp => {
            checkNewPage(25);
            doc.setFillColor(245, 245, 245);
            doc.rect(margin, yPos - 3, maxLineWidth, 18, 'F');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(11);
            doc.text(exp.empresa || '', margin + 3, yPos + 3);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.text(exp.cargo || '', margin + 3, yPos + 10);
            doc.setTextColor(100);
            doc.text(exp.periodo || '', pageWidth - margin - 3, yPos + 3, { align: 'right' });
            doc.setTextColor(0);
            yPos += 22;
          });
          yPos += 5;
        }

        // Formação
        if (data.formacao?.length > 0) {
          checkNewPage(30);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(12);
          doc.setTextColor(...headerColor);
          doc.text('FORMAÇÃO ACADÊMICA', margin, yPos);
          yPos += 8;
          doc.setTextColor(0);
          data.formacao.forEach(edu => {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.text(edu.curso || '', margin, yPos);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.text(`${edu.instituicao || ''} | ${edu.periodo || ''}`, margin, yPos + 5);
            yPos += 13;
          });
          yPos += 8;
        }

        // Idiomas e Habilidades lado a lado
        const halfWidth = (maxLineWidth - 10) / 2;
        let leftY = yPos;
        if (data.idiomas?.length > 0) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(11);
          doc.setTextColor(...headerColor);
          doc.text('IDIOMAS', margin, leftY);
          leftY += 6;
          doc.setTextColor(0);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(10);
          data.idiomas.forEach(lang => {
            doc.text(`${lang.idioma}: ${lang.nivel}`, margin, leftY);
            leftY += 5;
          });
        }

        let rightY = yPos;
        if (data.habilidades?.length > 0) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(11);
          doc.setTextColor(...headerColor);
          doc.text('COMPETÊNCIAS', margin + halfWidth + 10, rightY);
          rightY += 6;
          doc.setTextColor(0);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(10);
          data.habilidades.slice(0, 6).forEach(skill => {
            doc.text(`✓ ${skill}`, margin + halfWidth + 10, rightY);
            rightY += 5;
          });
        }
      }

      // ===================== MODELO PRIMEIRO EMPREGO =====================
      else if (modelo === 'primeiro_emprego') {
        const youthColor = [46, 204, 113]; // Verde

        // Header simples e jovem
        doc.setFillColor(245, 245, 245);
        doc.rect(0, 0, pageWidth, 55, 'F');
        
        // Linha colorida no topo
        doc.setFillColor(...youthColor);
        doc.rect(0, 0, pageWidth, 5, 'F');

        // Foto
        if (data.foto) {
          addPhoto(margin, 15, 35, 35);
        }

        // Nome e objetivo
        doc.setTextColor(0);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(20);
        doc.text(data.nome || '', 65, 28);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...youthColor);
        doc.text(data.cargo || 'Em busca de oportunidade', 65, 40);
        doc.setTextColor(100);
        doc.setFontSize(10);
        doc.text([data.telefone, data.email].filter(Boolean).join(' | '), 65, 50);

        yPos = 65;
        doc.setTextColor(0);

        // Objetivo
        if (data.resumo) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(12);
          doc.setTextColor(...youthColor);
          doc.text('OBJETIVO', margin, yPos);
          yPos += 7;
          doc.setTextColor(0);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(10);
          const lines = doc.splitTextToSize(data.resumo, maxLineWidth);
          doc.text(lines, margin, yPos);
          yPos += lines.length * 5 + 10;
        }

        // Formação (destaque principal)
        if (data.formacao?.length > 0) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(12);
          doc.setTextColor(...youthColor);
          doc.text('FORMAÇÃO ACADÊMICA', margin, yPos);
          yPos += 8;
          doc.setTextColor(0);
          data.formacao.forEach(edu => {
            doc.setFillColor(240, 255, 245);
            doc.rect(margin, yPos - 3, maxLineWidth, 15, 'F');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(11);
            doc.text(edu.curso || '', margin + 3, yPos + 3);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.text(`${edu.instituicao || ''} • ${edu.periodo || ''}`, margin + 3, yPos + 9);
            yPos += 18;
          });
          yPos += 5;
        }

        // Habilidades (destaque)
        if (data.habilidades?.length > 0) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(12);
          doc.setTextColor(...youthColor);
          doc.text('HABILIDADES E COMPETÊNCIAS', margin, yPos);
          yPos += 8;
          doc.setTextColor(0);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(10);
          
          // Grid de habilidades
          const colW = maxLineWidth / 2;
          data.habilidades.forEach((skill, i) => {
            const col = i % 2;
            const x = margin + (col * colW);
            doc.text(`● ${skill}`, x, yPos);
            if (col === 1) yPos += 7;
          });
          if (data.habilidades.length % 2 === 1) yPos += 7;
          yPos += 8;
        }

        // Idiomas
        if (data.idiomas?.length > 0) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(12);
          doc.setTextColor(...youthColor);
          doc.text('IDIOMAS', margin, yPos);
          yPos += 7;
          doc.setTextColor(0);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(10);
          data.idiomas.forEach(lang => {
            doc.text(`${lang.idioma}: ${lang.nivel}`, margin, yPos);
            yPos += 6;
          });
          yPos += 8;
        }

        // Experiência (se houver)
        if (data.experiencias?.length > 0) {
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(12);
          doc.setTextColor(...youthColor);
          doc.text('EXPERIÊNCIAS (Estágio/Voluntariado)', margin, yPos);
          yPos += 7;
          doc.setTextColor(0);
          data.experiencias.forEach(exp => {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(10);
            doc.text(exp.empresa || '', margin, yPos);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.text(`${exp.cargo || ''} - ${exp.periodo || ''}`, margin, yPos + 5);
            yPos += 13;
          });
        }

        // Dados adicionais
        yPos += 5;
        doc.setTextColor(120);
        doc.setFontSize(9);
        const dadosExtra = [];
        if (data.estado_civil) dadosExtra.push(data.estado_civil);
        if (data.idade) dadosExtra.push(`${data.idade} anos`);
        if (data.endereco) dadosExtra.push(data.endereco);
        if (data.cidade) dadosExtra.push(`${data.cidade}${data.estado ? '/' + data.estado : ''}`);
        if (dadosExtra.length > 0) {
          doc.text(dadosExtra.join(' | '), margin, yPos);
        }
      }

      return doc;
    }
  },
  { id: 'vistoria', 
    title: 'Termo de Vistoria', 
    icon: '🔍',
    price: 2.90,
    description: 'Registre o estado de conservação de um imóvel para entrada ou saída.',
    fieldGroups: [
      {
        tab: 'Imóvel',
        fields: [
          { name: 'tipo_vistoria', label: 'Tipo de Vistoria', type: 'select', options: ['Entrada', 'Saída', 'Conferência'], className: 'half-width' },
          { name: 'data_vistoria', label: 'Data da Vistoria', type: 'date', className: 'half-width' },
          { name: 'endereco_imovel', label: 'Endereço Completo do Imóvel', type: 'text' },
          { name: 'tipo_imovel', label: 'Tipo de Imóvel', type: 'select', options: ['Apartamento', 'Casa', 'Sala Comercial', 'Galpão', 'Loja', 'Kitnet', 'Outro'], className: 'half-width' },
          { name: 'area_imovel', label: 'Área (m²)', type: 'text', className: 'half-width' },
        ]
      },
      {
        tab: 'Locador',
        fields: [
          { name: 'locador_nome', label: 'Nome Completo', type: 'text' },
          { name: 'locador_cpf', label: 'CPF/CNPJ', type: 'text', className: 'half-width' },
          { name: 'locador_telefone', label: 'Telefone', type: 'text', className: 'half-width' },
        ]
      },
      {
        tab: 'Locatário',
        fields: [
          { name: 'locatario_nome', label: 'Nome Completo', type: 'text' },
          { name: 'locatario_cpf', label: 'CPF/CNPJ', type: 'text', className: 'half-width' },
          { name: 'locatario_telefone', label: 'Telefone', type: 'text', className: 'half-width' },
        ]
      },
      {
        tab: 'Vistoria',
        fields: [
          { type: 'heading', label: 'Marque os cômodos a serem vistoriados' },
          { name: 'comodo_sala', label: 'Sala', type: 'checkbox', className: 'third-width' },
          { name: 'comodo_quarto1', label: 'Quarto 1', type: 'checkbox', className: 'third-width' },
          { name: 'comodo_quarto2', label: 'Quarto 2', type: 'checkbox', className: 'third-width' },
          { name: 'comodo_quarto3', label: 'Quarto 3', type: 'checkbox', className: 'third-width' },
          { name: 'comodo_cozinha', label: 'Cozinha', type: 'checkbox', className: 'third-width' },
          { name: 'comodo_banheiro1', label: 'Banheiro 1', type: 'checkbox', className: 'third-width' },
          { name: 'comodo_banheiro2', label: 'Banheiro 2', type: 'checkbox', className: 'third-width' },
          { name: 'comodo_lavanderia', label: 'Área de Serviço', type: 'checkbox', className: 'third-width' },
          { name: 'comodo_varanda', label: 'Varanda', type: 'checkbox', className: 'third-width' },
          { name: 'comodo_garagem', label: 'Garagem', type: 'checkbox', className: 'third-width' },
          { name: 'comodo_quintal', label: 'Quintal', type: 'checkbox', className: 'third-width' },
          { name: 'comodo_outro', label: 'Outro', type: 'checkbox', className: 'third-width' },
          { name: 'comodo_outro_nome', label: 'Nome do outro cômodo', type: 'text', showIf: (data) => data.comodo_outro },
          
          { type: 'heading', label: 'Estado Geral dos Itens' },
          { name: 'estado_pintura', label: 'Pintura (Paredes/Teto)', type: 'select', options: ['Ótimo', 'Bom', 'Regular', 'Ruim', 'N/A'], className: 'half-width' },
          { name: 'obs_pintura', label: 'Obs. Pintura', type: 'text', className: 'half-width' },
          { name: 'estado_pisos', label: 'Pisos e Rodapés', type: 'select', options: ['Ótimo', 'Bom', 'Regular', 'Ruim', 'N/A'], className: 'half-width' },
          { name: 'obs_pisos', label: 'Obs. Pisos', type: 'text', className: 'half-width' },
          { name: 'estado_portas', label: 'Portas e Fechaduras', type: 'select', options: ['Ótimo', 'Bom', 'Regular', 'Ruim', 'N/A'], className: 'half-width' },
          { name: 'obs_portas', label: 'Obs. Portas', type: 'text', className: 'half-width' },
          { name: 'estado_janelas', label: 'Janelas e Vidros', type: 'select', options: ['Ótimo', 'Bom', 'Regular', 'Ruim', 'N/A'], className: 'half-width' },
          { name: 'obs_janelas', label: 'Obs. Janelas', type: 'text', className: 'half-width' },
          { name: 'estado_eletrica', label: 'Instalação Elétrica', type: 'select', options: ['Ótimo', 'Bom', 'Regular', 'Ruim', 'N/A'], className: 'half-width' },
          { name: 'obs_eletrica', label: 'Obs. Elétrica', type: 'text', className: 'half-width' },
          { name: 'estado_hidraulica', label: 'Instalação Hidráulica', type: 'select', options: ['Ótimo', 'Bom', 'Regular', 'Ruim', 'N/A'], className: 'half-width' },
          { name: 'obs_hidraulica', label: 'Obs. Hidráulica', type: 'text', className: 'half-width' },
          { name: 'estado_loucas', label: 'Louças Sanitárias', type: 'select', options: ['Ótimo', 'Bom', 'Regular', 'Ruim', 'N/A'], className: 'half-width' },
          { name: 'obs_loucas', label: 'Obs. Louças', type: 'text', className: 'half-width' },
          { name: 'estado_moveis', label: 'Móveis/Armários Embutidos', type: 'select', options: ['Ótimo', 'Bom', 'Regular', 'Ruim', 'N/A'], className: 'half-width' },
          { name: 'obs_moveis', label: 'Obs. Móveis', type: 'text', className: 'half-width' },
        ]
      },
      {
        tab: 'Medidores',
        fields: [
          { type: 'heading', label: 'Leituras dos Medidores' },
          { name: 'leitura_luz', label: 'Leitura Luz (kWh)', type: 'text', className: 'half-width' },
          { name: 'leitura_agua', label: 'Leitura Água (m³)', type: 'text', className: 'half-width' },
          { name: 'leitura_gas', label: 'Leitura Gás (m³)', type: 'text', className: 'half-width' },
          { name: 'qtd_chaves', label: 'Quantidade de Chaves Entregues', type: 'number', className: 'half-width' },
          { name: 'qtd_controles', label: 'Quantidade de Controles (portão/garagem)', type: 'number', className: 'half-width' },
        ]
      },
      {
        tab: 'Observações',
        fields: [
          { name: 'observacoes_gerais', label: 'Observações Gerais', type: 'textarea', placeholder: 'Descreva qualquer dano, avaria ou situação relevante encontrada na vistoria...' },
          { name: 'cep', label: 'CEP', type: 'text', placeholder: 'Digite o CEP', className: 'third-width' },
          { name: 'cidade', label: 'Cidade', type: 'text', className: 'third-width' },
          { name: 'estado', label: 'UF', type: 'text', className: 'third-width' },
          { name: 'data_assinatura', label: 'Data da Assinatura', type: 'date' },
        ]
      }
    ], 
    generatePDF: (data) => {
      const doc = new jsPDF();
      const margin = 20;
      const pageWidth = 210;
      const maxLineWidth = pageWidth - (margin * 2);
      let yPos = 20;

      const checkNewPage = (requiredSpace = 25) => {
        if (yPos + requiredSpace > 280) {
          doc.addPage();
          yPos = 20;
        }
      };

      // Cabeçalho
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text(`TERMO DE VISTORIA DE ${(data.tipo_vistoria || 'ENTRADA').toUpperCase()}`, pageWidth / 2, yPos, { align: 'center' });
      yPos += 8;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Data da Vistoria: ${data.data_vistoria || '___/___/______'}`, pageWidth / 2, yPos, { align: 'center' });
      yPos += 15;

      // Dados do Imóvel
      doc.setFillColor(52, 73, 94);
      doc.rect(margin, yPos - 5, maxLineWidth, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('IDENTIFICAÇÃO DO IMÓVEL', margin + 3, yPos);
      yPos += 8;
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.text(`Endereço: ${data.endereco_imovel || ''}`, margin, yPos);
      yPos += 5;
      doc.text(`Tipo: ${data.tipo_imovel || ''}     Área: ${data.area_imovel || ''} m²`, margin, yPos);
      yPos += 12;

      // Partes
      doc.setFillColor(52, 73, 94);
      doc.rect(margin, yPos - 5, maxLineWidth, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.text('PARTES ENVOLVIDAS', margin + 3, yPos);
      yPos += 8;
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      doc.text(`LOCADOR: ${data.locador_nome || ''}`, margin, yPos);
      doc.text(`CPF/CNPJ: ${data.locador_cpf || ''}`, 120, yPos);
      yPos += 5;
      doc.text(`LOCATÁRIO: ${data.locatario_nome || ''}`, margin, yPos);
      doc.text(`CPF/CNPJ: ${data.locatario_cpf || ''}`, 120, yPos);
      yPos += 12;

      // Cômodos Vistoriados
      const comodos = [];
      if (data.comodo_sala) comodos.push('Sala');
      if (data.comodo_quarto1) comodos.push('Quarto 1');
      if (data.comodo_quarto2) comodos.push('Quarto 2');
      if (data.comodo_quarto3) comodos.push('Quarto 3');
      if (data.comodo_cozinha) comodos.push('Cozinha');
      if (data.comodo_banheiro1) comodos.push('Banheiro 1');
      if (data.comodo_banheiro2) comodos.push('Banheiro 2');
      if (data.comodo_lavanderia) comodos.push('Área de Serviço');
      if (data.comodo_varanda) comodos.push('Varanda');
      if (data.comodo_garagem) comodos.push('Garagem');
      if (data.comodo_quintal) comodos.push('Quintal');
      if (data.comodo_outro && data.comodo_outro_nome) comodos.push(data.comodo_outro_nome);

      if (comodos.length > 0) {
        doc.setFillColor(52, 73, 94);
        doc.rect(margin, yPos - 5, maxLineWidth, 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.text('CÔMODOS VISTORIADOS', margin + 3, yPos);
        yPos += 8;
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'normal');
        doc.text(comodos.join(' • '), margin, yPos);
        yPos += 12;
      }

      // Tabela de Estado dos Itens
      checkNewPage(60);
      doc.setFillColor(52, 73, 94);
      doc.rect(margin, yPos - 5, maxLineWidth, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.text('ESTADO DE CONSERVAÇÃO', margin + 3, yPos);
      yPos += 10;
      doc.setTextColor(0, 0, 0);

      // Cabeçalho da tabela
      doc.setFillColor(236, 240, 241);
      doc.rect(margin, yPos - 4, maxLineWidth, 7, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.text('ITEM', margin + 2, yPos);
      doc.text('ESTADO', 90, yPos);
      doc.text('OBSERVAÇÕES', 120, yPos);
      yPos += 6;

      const itens = [
        { nome: 'Pintura (Paredes/Teto)', estado: data.estado_pintura, obs: data.obs_pintura },
        { nome: 'Pisos e Rodapés', estado: data.estado_pisos, obs: data.obs_pisos },
        { nome: 'Portas e Fechaduras', estado: data.estado_portas, obs: data.obs_portas },
        { nome: 'Janelas e Vidros', estado: data.estado_janelas, obs: data.obs_janelas },
        { nome: 'Instalação Elétrica', estado: data.estado_eletrica, obs: data.obs_eletrica },
        { nome: 'Instalação Hidráulica', estado: data.estado_hidraulica, obs: data.obs_hidraulica },
        { nome: 'Louças Sanitárias', estado: data.estado_loucas, obs: data.obs_loucas },
        { nome: 'Móveis/Armários', estado: data.estado_moveis, obs: data.obs_moveis },
      ];

      doc.setFont('helvetica', 'normal');
      itens.forEach((item, index) => {
        checkNewPage(8);
        if (index % 2 === 0) {
          doc.setFillColor(249, 249, 249);
          doc.rect(margin, yPos - 4, maxLineWidth, 7, 'F');
        }
        doc.text(item.nome, margin + 2, yPos);
        doc.text(item.estado || '-', 90, yPos);
        const obsText = item.obs ? doc.splitTextToSize(item.obs, 65) : ['-'];
        doc.text(obsText[0], 120, yPos);
        yPos += 7;
      });
      yPos += 8;

      // Medidores
      checkNewPage(35);
      doc.setFillColor(52, 73, 94);
      doc.rect(margin, yPos - 5, maxLineWidth, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('LEITURAS E CHAVES', margin + 3, yPos);
      yPos += 10;
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      doc.text(`Luz: ${data.leitura_luz || '___'} kWh     Água: ${data.leitura_agua || '___'} m³     Gás: ${data.leitura_gas || '___'} m³`, margin, yPos);
      yPos += 6;
      doc.text(`Chaves entregues: ${data.qtd_chaves || '___'}     Controles entregues: ${data.qtd_controles || '___'}`, margin, yPos);
      yPos += 12;

      // Observações
      if (data.observacoes_gerais) {
        checkNewPage(30);
        doc.setFillColor(52, 73, 94);
        doc.rect(margin, yPos - 5, maxLineWidth, 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.text('OBSERVAÇÕES GERAIS', margin + 3, yPos);
        yPos += 10;
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'normal');
        const obsLines = doc.splitTextToSize(data.observacoes_gerais, maxLineWidth);
        obsLines.forEach(line => {
          checkNewPage(6);
          doc.text(line, margin, yPos);
          yPos += 5;
        });
        yPos += 8;
      }

      // Declaração
      checkNewPage(50);
      doc.setFillColor(241, 196, 15);
      doc.rect(margin, yPos - 3, maxLineWidth, 15, 'F');
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(9);
      const declaracao = `Declaro que vistoriei o imóvel acima descrito e concordo que as informações aqui registradas correspondem fielmente ao estado de conservação encontrado na data desta vistoria.`;
      const declLines = doc.splitTextToSize(declaracao, maxLineWidth - 6);
      declLines.forEach(line => {
        doc.text(line, margin + 3, yPos);
        yPos += 4;
      });
      yPos += 15;

      // Assinaturas
      checkNewPage(50);
      const colWidth = maxLineWidth / 2 - 5;
      doc.setFontSize(10);
      
      // Locador
      doc.line(margin, yPos, margin + colWidth, yPos);
      yPos += 5;
      doc.setFont('helvetica', 'bold');
      doc.text('LOCADOR', margin + colWidth / 2, yPos, { align: 'center' });
      yPos += 4;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(data.locador_nome || '', margin + colWidth / 2, yPos, { align: 'center' });
      
      // Locatário
      const col2Start = margin + colWidth + 10;
      doc.line(col2Start, yPos - 9, col2Start + colWidth, yPos - 9);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('LOCATÁRIO', col2Start + colWidth / 2, yPos - 4, { align: 'center' });
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.text(data.locatario_nome || '', col2Start + colWidth / 2, yPos, { align: 'center' });
      
      yPos += 15;
      doc.setFontSize(9);
      doc.text(`${data.cidade || '____________'}, ${data.data_assinatura || '___/___/______'}`, pageWidth / 2, yPos, { align: 'center' });

      return doc;
    }
  },
  {
    id: 'orcamento',
    title: 'Orçamento de Serviços',
    icon: '💰',
    price: 2.90,
    description: 'Crie orçamentos com lista de itens e cálculo automático de totais.',
    isCustom: true,
    generatePDF: (data) => {
      const doc = new jsPDF();
      const margin = 20;
      const pageWidth = 210;
      const maxLineWidth = pageWidth - (margin * 2);
      let yPos = 20;

      // Cabeçalho
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      doc.text('ORÇAMENTO', pageWidth / 2, yPos, { align: 'center' });
      yPos += 15;

      // Dados do Prestador e Cliente
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('PRESTADOR DE SERVIÇOS:', margin, yPos);
      doc.text('CLIENTE:', pageWidth / 2 + 10, yPos);
      yPos += 5;

      doc.setFont('helvetica', 'normal');
      doc.text(data.prestador_nome || '', margin, yPos);
      doc.text(data.cliente_nome || '', pageWidth / 2 + 10, yPos);
      yPos += 5;
      doc.text(data.prestador_doc ? `CPF/CNPJ: ${data.prestador_doc}` : '', margin, yPos);
      doc.text(data.cliente_doc ? `CPF/CNPJ: ${data.cliente_doc}` : '', pageWidth / 2 + 10, yPos);
      yPos += 5;
      doc.text(data.prestador_contato || '', margin, yPos);
      doc.text(data.cliente_endereco || '', pageWidth / 2 + 10, yPos);
      yPos += 15;

      // Tabela de Itens
      doc.setFillColor(240, 240, 240);
      doc.rect(margin, yPos, maxLineWidth, 8, 'F');
      doc.setFont('helvetica', 'bold');
      doc.text('DESCRIÇÃO', margin + 2, yPos + 5.5);
      doc.text('QTD', 130, yPos + 5.5, { align: 'center' });
      doc.text('UNIT. (R$)', 155, yPos + 5.5, { align: 'center' });
      doc.text('TOTAL (R$)', 190, yPos + 5.5, { align: 'right' });
      yPos += 10;

      doc.setFont('helvetica', 'normal');
      let totalGeral = 0;

      (data.itens_orcamento || []).forEach(item => {
        const qtd = parseFloat(item.quantidade) || 0;
        const unit = parseFloat(item.valor) || 0;
        const total = qtd * unit;
        totalGeral += total;

        doc.text(item.descricao || '', margin + 2, yPos);
        doc.text(qtd.toString(), 130, yPos, { align: 'center' });
        doc.text(unit.toFixed(2).replace('.', ','), 155, yPos, { align: 'center' });
        doc.text(total.toFixed(2).replace('.', ','), 190, yPos, { align: 'right' });
        yPos += 7;
      });

      yPos += 5;
      doc.setLineWidth(0.5);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 10;

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(`TOTAL GERAL: R$ ${totalGeral.toFixed(2).replace('.', ',')}`, 190, yPos, { align: 'right' });
      yPos += 20;

      // Validade e Data
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      if (data.validade) {
        doc.text(`Validade deste orçamento: ${data.validade}`, margin, yPos);
        yPos += 10;
      }

      let dateText = `${data.cidade || 'Cidade'} - ${data.estado || 'UF'}, ___ de ____________ de ______.`;
      if (data.data) {
          const d = new Date(data.data + 'T12:00:00');
          const day = d.getDate();
          const month = d.toLocaleString('pt-BR', { month: 'long' });
          const year = d.getFullYear();
          dateText = `${data.cidade || 'Cidade'} - ${data.estado || 'UF'}, ${day} de ${month} de ${year}.`;
      }
      doc.text(dateText, margin, yPos);

      return doc;
    }
  },
  {
    id: 'procuracao',
    title: 'Procuração Particular',
    icon: '⚖️',
    price: 3.90,
    description: 'Instrumento legal para representação perante terceiros.',
    fieldGroups: [
      {
        tab: 'Outorgante',
        fields: [
          { name: 'outorgante_nome', label: 'Nome do Outorgante', type: 'text', },
          { name: 'outorgante_nacionalidade', label: 'Nacionalidade (Outorgante)', type: 'text', className: 'third-width' },
          { name: 'outorgante_estado_civil', label: 'Estado Civil (Outorgante)', type: 'text', className: 'third-width' },
          { name: 'outorgante_profissao', label: 'Profissão (Outorgante)', type: 'text', className: 'third-width' },
          { name: 'outorgante_rg', label: 'RG (Outorgante)', type: 'text', className: 'third-width' },
          { name: 'outorgante_orgao', label: 'Órgão Emissor (Outorgante)', type: 'text', className: 'third-width' },
          { name: 'outorgante_cpf', label: 'CPF (Outorgante)', type: 'text', className: 'third-width' },
          { name: 'outorgante_endereco', label: 'Endereço Completo (Outorgante)', type: 'text' },
        ]
      },
      {
        tab: 'Outorgado',
        fields: [
          { name: 'outorgado_nome', label: 'Nome do Outorgado', type: 'text' },
          { name: 'outorgado_nacionalidade', label: 'Nacionalidade (Outorgado)', type: 'text', className: 'third-width' },
          { name: 'outorgado_estado_civil', label: 'Estado Civil (Outorgado)', type: 'text', className: 'third-width' },
          { name: 'outorgado_profissao', label: 'Profissão (Outorgado)', type: 'text', className: 'third-width' },
          { name: 'outorgado_rg', label: 'RG (Outorgado)', type: 'text', className: 'third-width' },
          { name: 'outorgado_orgao', label: 'Órgão Emissor (Outorgado)', type: 'text', className: 'third-width' },
          { name: 'outorgado_cpf', label: 'CPF (Outorgado)', type: 'text', className: 'third-width' },
          { name: 'outorgado_endereco', label: 'Endereço Completo (Outorgado)', type: 'text' },
        ]
      },
      {
        tab: 'Poderes',
        fields: [
          { name: 'poderes', label: 'Descrição dos Poderes', type: 'textarea', placeholder: 'Ex: representar perante a instituição X, vender o veículo...' },
          { name: 'validade', label: 'Prazo de Validade', type: 'text', placeholder: 'Ex: até o dia 10/01/2025 ou por tempo indeterminado' },
        ]
      },
      {
        tab: 'Local e Data',
        fields: [
          { name: 'cidade', label: 'Cidade', type: 'text', className: 'half-width' },
          { name: 'estado', label: 'Estado (UF)', type: 'text', className: 'half-width' },
          { name: 'data', label: 'Data', type: 'date' }
        ]
      }
    ],
    generatePDF: (data) => {
      const doc = new jsPDF();
      const margin = 20;
      const pageWidth = 210;
      const maxLineWidth = pageWidth - (margin * 2);
      let yPos = 20;

      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('PROCURAÇÃO PARTICULAR', pageWidth / 2, yPos, { align: 'center' });
      yPos += 15;

      doc.setFontSize(12);
      
      const addSection = (title, content) => {
        doc.setFont('helvetica', 'bold');
        doc.text(title, margin, yPos);
        yPos += 7;
        doc.setFont('helvetica', 'normal');
        const splitContent = doc.splitTextToSize(content, maxLineWidth);
        doc.text(splitContent, margin, yPos);
        yPos += (splitContent.length * 5) + 5;
      };

      const outorganteText = `${data.outorgante_nome || '________________'}, ${data.outorgante_nacionalidade || '________________'}, ${data.outorgante_estado_civil || '________________'}, ${data.outorgante_profissao || '________________'}, RG nº ${data.outorgante_rg || '________________'} - ${data.outorgante_orgao || '___'}, CPF nº ${data.outorgante_cpf || '________________'}, residente e domiciliado(a) na ${data.outorgante_endereco || '________________'}.`;
      addSection('OUTORGANTE:', outorganteText);

      const outorgadoText = `${data.outorgado_nome || '________________'}, ${data.outorgado_nacionalidade || '________________'}, ${data.outorgado_estado_civil || '________________'}, ${data.outorgado_profissao || '________________'}, RG nº ${data.outorgado_rg || '________________'} - ${data.outorgado_orgao || '___'}, CPF nº ${data.outorgado_cpf || '________________'}, residente e domiciliado(a) na ${data.outorgado_endereco || '________________'}.`;
      addSection('OUTORGADO:', outorgadoText);

      const poderesText = `Pelo presente instrumento particular de procuração, o(a) Outorgante nomeia e constitui o(a) Outorgado(a) como seu(sua) procurador(a), conferindo-lhe poderes especiais para ${data.poderes || '________________'}.\n\nPara tal, o(a) outorgado(a) poderá assinar documentos, formulários, termos, receber e dar quitação, solicitar, acompanhar processos, firmar acordos e praticar todos os atos necessários ao fiel cumprimento deste mandato.`;
      addSection('PODERES:', poderesText);

      const validadeText = `Esta procuração é válida ${data.validade || 'por tempo indeterminado'}.`;
      addSection('PRAZO DE VALIDADE:', validadeText);

      yPos += 10;
      let dateText = `${data.cidade || 'Cidade'} - ${data.estado || 'UF'}, ___ de ____________ de ______.`;
      if (data.data) {
          const d = new Date(data.data + 'T12:00:00');
          const day = d.getDate();
          const month = d.toLocaleString('pt-BR', { month: 'long' });
          const year = d.getFullYear();
          dateText = `${data.cidade || 'Cidade'} - ${data.estado || 'UF'}, ${day} de ${month} de ${year}.`;
      }
      doc.text(dateText, margin, yPos);
      
      yPos += 30;
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 5;
      doc.text(data.outorgante_nome || 'Assinatura do Outorgante', pageWidth / 2, yPos, { align: 'center' });

      return doc;
    }
  },
  {
    id: 'uniao_estavel',
    title: 'Declaração de União Estável',
    icon: '💍',
    price: 2.90,
    description: 'Formalize a convivência pública, contínua e duradoura.',
    fieldGroups: [
      {
        tab: '1º Declarante',
        fields: [
          { name: 'nome1', label: 'Nome do 1º Declarante', type: 'text' },
          { name: 'nacionalidade1', label: 'Nacionalidade', type: 'text', className: 'third-width' },
          { name: 'estado_civil1', label: 'Estado Civil', type: 'text', className: 'third-width' },
          { name: 'profissao1', label: 'Profissão', type: 'text', className: 'third-width' },
          { name: 'rg1', label: 'RG', type: 'text', className: 'third-width' },
          { name: 'orgao1', label: 'Órgão Emissor', type: 'text', className: 'third-width' },
          { name: 'cpf1', label: 'CPF', type: 'text', className: 'third-width' },
        ]
      },
      {
        tab: '2º Declarante',
        fields: [
          { name: 'nome2', label: 'Nome do 2º Declarante', type: 'text' },
          { name: 'nacionalidade2', label: 'Nacionalidade', type: 'text', className: 'third-width' },
          { name: 'estado_civil2', label: 'Estado Civil', type: 'text', className: 'third-width' },
          { name: 'profissao2', label: 'Profissão', type: 'text', className: 'third-width' },
          { name: 'rg2', label: 'RG', type: 'text', className: 'third-width' },
          { name: 'orgao2', label: 'Órgão Emissor', type: 'text', className: 'third-width' },
          { name: 'cpf2', label: 'CPF', type: 'text', className: 'third-width' },
        ]
      },
      {
        tab: 'Convivência',
        fields: [
          { name: 'endereco', label: 'Endereço Completo de Residência', type: 'text' },
          { name: 'data_inicio', label: 'Data de Início da Convivência', type: 'date' },
        ]
      },
      {
        tab: 'Local e Data',
        fields: [
          { name: 'cidade', label: 'Cidade', type: 'text', className: 'half-width' },
          { name: 'estado', label: 'Estado (UF)', type: 'text', className: 'half-width' },
          { name: 'data', label: 'Data da Assinatura', type: 'date' }
        ]
      }
    ],
    generatePDF: (data) => {
      const doc = new jsPDF();
      const margin = 20;
      const pageWidth = 210;
      let yPos = 20;

      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('DECLARAÇÃO DE UNIÃO ESTÁVEL', pageWidth / 2, yPos, { align: 'center' });
      yPos += 20;

      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');

      const formatDate = (dateStr) => {
        if (!dateStr) return '___/___/____';
        const [y, m, d] = dateStr.split('-');
        return `${d}/${m}/${y}`;
      };

      const texto = `Nós, abaixo assinados:\n\n` +
        `${data.nome1 || '________________'}, ${data.nacionalidade1 || '_______'}, ${data.estado_civil1 || '_______'}, ${data.profissao1 || '_______'}, portador(a) do RG nº ${data.rg1 || '_______'} ${data.orgao1 ? '- ' + data.orgao1 : ''} e inscrito(a) no CPF sob o nº ${data.cpf1 || '_______'};\n\n` +
        `E\n\n` +
        `${data.nome2 || '________________'}, ${data.nacionalidade2 || '_______'}, ${data.estado_civil2 || '_______'}, ${data.profissao2 || '_______'}, portador(a) do RG nº ${data.rg2 || '_______'} ${data.orgao2 ? '- ' + data.orgao2 : ''} e inscrito(a) no CPF sob o nº ${data.cpf2 || '_______'};\n\n` +
        `Ambos residentes e domiciliados na ${data.endereco || '________________________________'}.\n\n` +
        `DECLARAMOS, sob as penas da lei, para os devidos fins de direito e prova junto a quem interessar possa, que convivemos em UNIÃO ESTÁVEL desde ${formatDate(data.data_inicio)}, de forma pública, contínua e duradoura, estabelecida com o objetivo de constituição de família, nos termos do artigo 1.723 do Código Civil Brasileiro.\n\n` +
        `Por ser a expressão da verdade, firmamos a presente declaração.`;

      const splitText = doc.splitTextToSize(texto, pageWidth - (margin * 2));
      doc.text(splitText, margin, yPos);
      yPos += (splitText.length * 5) + 15;

      let dateText = `${data.cidade || 'Cidade'} - ${data.estado || 'UF'}, ___ de ____________ de ______.`;
      if (data.data) {
          const d = new Date(data.data + 'T12:00:00');
          const day = d.getDate();
          const month = d.toLocaleString('pt-BR', { month: 'long' });
          const year = d.getFullYear();
          dateText = `${data.cidade || 'Cidade'} - ${data.estado || 'UF'}, ${day} de ${month} de ${year}.`;
      }
      doc.text(dateText, margin, yPos);
      yPos += 30;

      // Assinaturas dos Declarantes
      doc.line(margin, yPos, 95, yPos);
      doc.line(115, yPos, pageWidth - margin, yPos);
      yPos += 5;
      doc.setFontSize(10);
      doc.text(data.nome1 || '1º Declarante', margin + 37.5, yPos, { align: 'center' });
      doc.text(data.nome2 || '2º Declarante', 115 + 37.5, yPos, { align: 'center' });

      // Espaço para Testemunhas
      yPos += 30;
      doc.setFontSize(12);
      doc.text('Testemunhas:', margin, yPos);
      yPos += 20;
      doc.line(margin, yPos, 95, yPos);
      doc.line(115, yPos, pageWidth - margin, yPos);
      yPos += 5;
      doc.setFontSize(10);
      doc.text('CPF:', margin, yPos);
      doc.text('CPF:', 115, yPos);

      return doc;
    }
  },
  {
    id: 'viagem_menor',
    title: 'Aut. Viagem Menor',
    icon: '✈️',
    price: 2.90,
    description: 'Autorização para viagem nacional de crianças e adolescentes.',
    fieldGroups: [
      {
        tab: 'Geral',
        fields: [
          { name: 'tipo_viagem', label: 'Tipo de Viagem', type: 'select', options: ['Acompanhado', 'Desacompanhado'] },
          { name: 'incluir_autenticacao', label: 'Incluir Autenticação Digital', type: 'checkbox' },
          { name: 'validade_doc', label: 'Autorização Válida até', type: 'date' },
        ]
      },
      {
        tab: 'Responsável',
        fields: [
          { type: 'heading', label: 'Dados do Responsável' },
          { name: 'resp_nome', label: 'Nome do Responsável', type: 'text' },
          { name: 'resp_qualidade', label: 'Qualidade do Responsável', type: 'select', options: ['mãe', 'pai', 'tutor(a)', 'guardiã(o)'] },
          { name: 'resp_rg', label: 'RG', type: 'text', className: 'third-width' },
          { name: 'resp_orgao', label: 'Órgão Emissor', type: 'text', className: 'third-width' },
          { name: 'resp_rg_data', label: 'Data de Expedição', type: 'date', className: 'third-width' },
          { name: 'resp_cpf', label: 'CPF', type: 'text', className: 'half-width' },
          { name: 'resp_tel', label: 'Telefone', type: 'text', className: 'half-width' },
          { name: 'resp_endereco', label: 'Endereço', type: 'text' },
          { name: 'resp_cidade', label: 'Cidade', type: 'text', className: 'half-width' },
          { name: 'resp_uf', label: 'UF', type: 'text', className: 'half-width' },
        ]
      },
      {
        tab: 'Menor',
        fields: [
          { type: 'heading', label: 'Dados do Menor' },
          { name: 'menor_nome', label: 'Nome do Menor', type: 'text' },
          { name: 'menor_nascimento', label: 'Data de Nascimento', type: 'date', className: 'half-width' },
          { name: 'menor_naturalidade', label: 'Natural de', type: 'text', className: 'half-width' },
          { name: 'menor_rg', label: 'RG', type: 'text', className: 'third-width' },
          { name: 'menor_orgao', label: 'Órgão Emissor', type: 'text', className: 'third-width' },
          { name: 'menor_rg_data', label: 'Data de Expedição', type: 'date', className: 'third-width' },
          { name: 'menor_cpf', label: 'CPF', type: 'text' },
          { name: 'menor_endereco', label: 'Endereço', type: 'text' },
          { name: 'menor_cidade', label: 'Cidade', type: 'text', className: 'half-width' },
          { name: 'menor_uf', label: 'UF', type: 'text', className: 'half-width' },
        ]
      },
      {
        tab: 'Acompanhante',
        showIf: (formData) => formData.tipo_viagem === 'Acompanhado',
        fields: [
          { type: 'heading', label: 'Dados do Acompanhante' },
          { name: 'acomp_nome', label: 'Nome do Acompanhante', type: 'text' },
          { name: 'acomp_rg', label: 'RG', type: 'text', className: 'third-width' },
          { name: 'acomp_orgao', label: 'Órgão Emissor', type: 'text', className: 'third-width' },
          { name: 'acomp_rg_data', label: 'Data de Expedição', type: 'date', className: 'third-width' },
          { name: 'acomp_cpf', label: 'CPF', type: 'text', className: 'half-width' },
          { name: 'acomp_tel', label: 'Telefone', type: 'text', className: 'half-width' },
          { name: 'acomp_endereco', label: 'Endereço', type: 'text' },
          { name: 'acomp_cidade', label: 'Cidade', type: 'text', className: 'half-width' },
          { name: 'acomp_uf', label: 'UF', type: 'text', className: 'half-width' },
        ]
      },
      {
        tab: 'Assinatura',
        fields: [
          { type: 'heading', label: 'Local e Data da Assinatura' },
          { name: 'local_assinatura', label: 'Local da Assinatura', type: 'text', className: 'half-width' },
          { name: 'data_assinatura', label: 'Data da Assinatura', type: 'date', className: 'half-width' },
        ]
      }
    ],
    generatePDF: (data) => {
      const doc = new jsPDF();
      const margin = 20;
      const pageWidth = 210;
      const maxLineWidth = pageWidth - (margin * 2);
      let yPos = 15;

      const formatDate = (dateStr) => {
        if (!dateStr) return '_____/_____/______';
        const [y, m, d] = dateStr.split('-');
        return `${d}/${m}/${y}`;
      };

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('FORMULÁRIO DE AUTORIZAÇÃO DE VIAGEM NACIONAL', pageWidth / 2, yPos, { align: 'center' });
      yPos += 7;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      
      const isDesacompanhado = data.tipo_viagem === 'Desacompanhado';
      const subtitle = isDesacompanhado 
        ? '(PARA MENOR DE 16 ANOS DESACOMPANHADO – AUTORIZADO POR UM RESPONSÁVEL)'
        : '(PARA MENOR DE 16 ANOS ACOMPANHADO – AUTORIZADO POR UM RESPONSÁVEL)';
      doc.text(subtitle, pageWidth / 2, yPos, { align: 'center' });
      yPos += 15;

      doc.text(`Esta Autorização de Viagem é válida até ${formatDate(data.validade_doc)}.`, margin, yPos);
      yPos += 10;

      const drawParagraph = (text) => {
        const splitText = doc.splitTextToSize(text, maxLineWidth);
        doc.text(splitText, margin, yPos);
        yPos += (splitText.length * 5) + 5;
      };

      const drawQuality = (selected) => {
        const options = ['mãe', 'pai', 'tutor(a)', 'guardiã(o)'];
        let text = 'na qualidade de ';
        options.forEach(opt => {
          text += `( ${opt === selected ? 'X' : '__'} ) ${opt}      `;
        });
        return text;
      };

      let respText = `Eu, ${data.resp_nome || '__________________________________'}, cédula de identidade nº ${data.resp_rg || '__________________'}, expedida pela ${data.resp_orgao || '______'}, na data de ${formatDate(data.resp_rg_data)}, CPF nº ${data.resp_cpf || '__________________'}, endereço de domicílio ${data.resp_endereco || '__________________________________'}, cidade ${data.resp_cidade || '__________________'}, UF ${data.resp_uf || '__'}, telefone de contato ( ${data.resp_tel ? data.resp_tel.substring(0, 2) : '__'} ) ${data.resp_tel ? data.resp_tel.substring(2) : '__________________'}, ${drawQuality(data.resp_qualidade)}`;
      drawParagraph(respText);

      doc.setFont('helvetica', 'bold');
      drawParagraph('AUTORIZO a circular livremente, dentro do território nacional,');
      doc.setFont('helvetica', 'normal');

      let menorText = `${data.menor_nome || '__________________________________'}, nascido(a) em ${formatDate(data.menor_nascimento)}, natural de ${data.menor_naturalidade || '__________________'}, cédula de identidade nº ${data.menor_rg || '__________________'}, expedida pela ${data.menor_orgao || '______'}, na data de ${formatDate(data.menor_rg_data)}, CPF nº ${data.menor_cpf || '__________________'}, endereço de domicílio ${data.menor_endereco || '__________________________________'}, cidade ${data.menor_cidade || '__________________'}, UF ${data.menor_uf || '__'},`;
      drawParagraph(menorText);

      doc.setFont('helvetica', 'bold');
      
      if (isDesacompanhado) {
        drawParagraph('DESACOMPANHADO(A).');
      } else {
        drawParagraph('DESDE QUE ACOMPANHADA(O) DE');
        doc.setFont('helvetica', 'normal');
        let acompText = `${data.acomp_nome || '__________________________________'}, cédula de identidade nº ${data.acomp_rg || '__________________'}, expedida pela ${data.acomp_orgao || '______'}, na data de ${formatDate(data.acomp_rg_data)}, CPF nº ${data.acomp_cpf || '__________________'}, endereço de domicílio ${data.acomp_endereco || '__________________________________'}, cidade ${data.acomp_cidade || '__________________'}, UF ${data.acomp_uf || '__'}, telefone de contato ( ${data.acomp_tel ? data.acomp_tel.substring(0, 2) : '__'} ) ${data.acomp_tel ? data.acomp_tel.substring(2) : '__________________'}.`;
        drawParagraph(acompText);
      }

      yPos += 15;

      let dateText = `${data.local_assinatura || '__________________'}, ___ de ____________ de 20_____.`;
      if (data.data_assinatura) {
        const d = new Date(data.data_assinatura + 'T12:00:00');
        const day = d.getDate();
        const month = d.toLocaleString('pt-BR', { month: 'long' });
        const year = d.getFullYear();
        dateText = `${data.local_assinatura || '__________________'}, ${day} de ${month} de ${year}.`;
      }
      doc.text(dateText, margin, yPos);
      yPos += 25;

      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 5;
      doc.text(data.resp_nome || 'Assinatura de mãe, ou pai, ou responsável legal', pageWidth / 2, yPos, { align: 'center' });
      yPos += 10;

      doc.setFontSize(9);
      doc.text('(Reconhecer firmas por semelhança ou autenticidade)', pageWidth / 2, yPos, { align: 'center' });

      // --- Bloco de Autenticação Digital ---
      if (data.incluir_autenticacao) {
        const hash = "DIGITAL-" + Math.random().toString(36).substring(2, 10).toUpperCase() + "-" + Date.now().toString(36).toUpperCase();
        
        doc.setLineWidth(0.5);
        doc.setDrawColor(200);
        doc.line(margin, 280, pageWidth - margin, 280);
        
        doc.setFontSize(8);
        doc.setTextColor(100);
        doc.text(`Autenticação Digital: ${hash}`, margin, 285);
        doc.text(`Documento assinado eletronicamente. A autenticidade pode ser verificada mediante apresentação deste código.`, margin, 289);
        doc.setTextColor(0, 0, 0);
      }

      return doc;
    }
  },
  {
    id: 'hipossuficiencia',
    title: 'Declaração de Hipossuficiência',
    icon: '🤝',
    price: 2.90,
    description: 'Atestado de pobreza para gratuidade de justiça.',
    fieldGroups: [{ fields: [
      { name: 'nome', label: 'Nome Completo', type: 'text' },
      { name: 'documento_numero', label: 'Nº RG/Passaporte', type: 'text', className: 'third-width' },
      { name: 'orgao_expedidor', label: 'Órgão Expedidor', type: 'text', className: 'third-width' },
      { name: 'data_expedicao', label: 'Data de Expedição', type: 'date', className: 'third-width' },
      { name: 'validade_documento', label: 'Validade do Documento', type: 'date', className: 'half-width' },
      { name: 'cpf', label: 'CPF', type: 'text', className: 'half-width' },
      { name: 'pais', label: 'País de Residência', type: 'text', className: 'half-width' },
      { name: 'telefone', label: 'Telefone', type: 'text', className: 'half-width' },
      { name: 'email', label: 'E-mail', type: 'email' },
      { name: 'cep', label: 'CEP', type: 'text', placeholder: 'Digite o CEP para auto-completar' },
      { name: 'endereco', label: 'Endereço Completo', type: 'text' },
      { name: 'cidade', label: 'Cidade', type: 'text', className: 'half-width' },
      { name: 'estado', label: 'UF', type: 'text', className: 'half-width' },
      { name: 'data', label: 'Data da Assinatura', type: 'date' }
    ]}],
    generatePDF: (data) => {
      const doc = new jsPDF();
      const margin = 20;
      const pageWidth = 210;
      let yPos = 20;

      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('DECLARAÇÃO DE HIPOSSUFICIÊNCIA', pageWidth / 2, yPos, { align: 'center' });
      yPos += 20;

      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');

      const formatDate = (dateStr) => {
        if (!dateStr) return '___/___/____';
        const [y, m, d] = dateStr.split('-');
        return `${d}/${m}/${y}`;
      };

      const texto = `Eu, ${data.nome || '__________________________________'}, portador da carteira de identidade/passaporte nº ${data.documento_numero || '_______'}, expedido por (pelo) ${data.orgao_expedidor || '_______'}, em ${formatDate(data.data_expedicao)}, com validade até ${formatDate(data.validade_documento)}, CPF nº ${data.cpf || '______________'}, residente em (na/no/nos) ${data.pais || '______________'} no seguinte endereço: ${data.endereco || '__________________________________'}, telefone ${data.telefone || '________'}, e-mail ${data.email || '______________'} DECLARO para fins de prova junto à Defensoria Pública, que sou carente de recursos, não dispondo de condições econômicas para custear honorários de advogado particular no Brasil e tampouco arcar com as custas e despesas de processos judiciais sem sacrifício do meu sustento e de minha família. Por ser a expressão da verdade, assumindo inteira responsabilidade pelas declarações acima e sob as penas da lei, assino a presente declaração para que produza seus efeitos legais.`;

      const maxWidth = pageWidth - (margin * 2);
      const splitText = doc.splitTextToSize(texto, maxWidth);
      doc.text(splitText, margin, yPos, { align: 'left' });
      yPos += (splitText.length * 5) + 20;

      let dateText = `${data.cidade || 'Local'} - ${data.estado || 'UF'}, ___ de ____________ de ______.`;
      if (data.data) {
          const d = new Date(data.data + 'T12:00:00');
          dateText = `${data.cidade || 'Local'} - ${data.estado || 'UF'}, ${d.getDate()} de ${d.toLocaleString('pt-BR', { month: 'long' })} de ${d.getFullYear()}.`;
      }
      doc.text(dateText, margin, yPos);
      yPos += 20;

      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 5;
      doc.text(data.nome || 'Assinatura', pageWidth / 2, yPos, { align: 'center' });

      return doc;
    }
  },
  {
    id: 'rpa',
    title: 'Recibo de Pagamento de Autônomo (RPA)',
    icon: '💼',
    price: 2.90,
    description: 'Recibo oficial para autônomos com cálculo de impostos.',
    fieldGroups: [
      {
        tab: 'Contratante',
        fields: [
          { name: 'contratante_nome', label: 'Nome/Razão Social do Contratante', type: 'text' },
          { name: 'contratante_cnpj_cpf', label: 'CNPJ/CPF do Contratante', type: 'text' },
        ]
      },
      {
        tab: 'Contratado',
        fields: [
          { name: 'contratado_nome', label: 'Nome do Contratado (Autônomo)', type: 'text' },
          { name: 'contratado_cpf', label: 'CPF do Contratado', type: 'text' },
          { name: 'contratado_inss', label: 'Nº Inscrição INSS/PIS do Contratado', type: 'text' },
        ]
      },
      {
        tab: 'Valores e Serviço',
        fields: [
          { name: 'servico_descricao', label: 'Descrição dos Serviços Prestados', type: 'textarea' },
          { name: 'valor_bruto', label: 'Valor Bruto (R$)', type: 'number', className: 'third-width' },
          { name: 'desconto_inss', label: 'Desconto INSS (R$)', type: 'number', className: 'third-width' },
          { name: 'desconto_irrf', label: 'Desconto IRRF (R$)', type: 'number', className: 'third-width' },
        ]
      },
      {
        tab: 'Local e Data',
        fields: [
          { name: 'cidade', label: 'Cidade', type: 'text', className: 'half-width' },
          { name: 'estado', label: 'Estado (UF)', type: 'text', className: 'half-width' },
          { name: 'data', label: 'Data do Pagamento', type: 'date' }
        ]
      }
    ],
    generatePDF: (data) => {
      const doc = new jsPDF();
      const margin = 20;
      const pageWidth = 210;
      const maxLineWidth = pageWidth - (margin * 2);
      let yPos = 20;

      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('RECIBO DE PAGAMENTO DE AUTÔNOMO (RPA)', pageWidth / 2, yPos, { align: 'center' });
      yPos += 15;

      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');

      const valorBruto = parseFloat(data.valor_bruto) || 0;
      const descontoInss = parseFloat(data.desconto_inss) || 0;
      const descontoIrrf = parseFloat(data.desconto_irrf) || 0;
      const valorLiquido = valorBruto - descontoInss - descontoIrrf;

      const valorLiquidoStr = valorLiquido.toFixed(2).replace('.', ',');
      const valorLiquidoExtenso = numeroPorExtenso(valorLiquido.toFixed(2)) || '____________________';

      const texto = `Recebi de ${data.contratante_nome || '____________________'} (CNPJ/CPF nº ${data.contratante_cnpj_cpf || '____________________'}), a importância líquida de R$ ${valorLiquidoStr} (${valorLiquidoExtenso}), referente aos serviços de ${data.servico_descricao || '____________________'} prestados nesta data.`;
      
      const splitText = doc.splitTextToSize(texto, maxLineWidth);
      doc.text(splitText, margin, yPos);
      yPos += (splitText.length * 5) + 15;

      doc.setFont('helvetica', 'bold');
      doc.text('DEMONSTRATIVO DE VALORES', margin, yPos);
      yPos += 7;
      doc.setFont('helvetica', 'normal');
      
      const tableY = yPos;
      doc.rect(margin, tableY, maxLineWidth, 30);
      
      doc.text(`(+) Valor Bruto dos Serviços:`, margin + 5, tableY + 7);
      doc.text(`R$ ${data.valor_bruto || '0,00'}`, margin + maxLineWidth - 5, tableY + 7, { align: 'right' });
      doc.text(`(-) Desconto INSS:`, margin + 5, tableY + 14);
      doc.text(`R$ ${data.desconto_inss || '0,00'}`, margin + maxLineWidth - 5, tableY + 14, { align: 'right' });
      doc.text(`(-) Desconto IRRF:`, margin + 5, tableY + 21);
      doc.text(`R$ ${data.desconto_irrf || '0,00'}`, margin + maxLineWidth - 5, tableY + 21, { align: 'right' });
      doc.setFont('helvetica', 'bold');
      doc.text(`(=) Valor Líquido a Receber:`, margin + 5, tableY + 28);
      doc.text(`R$ ${valorLiquidoStr}`, margin + maxLineWidth - 5, tableY + 28, { align: 'right' });
      yPos += 40;

      doc.setFont('helvetica', 'normal');
      doc.text('Declaro ainda que sou responsável pelo recolhimento dos impostos devidos.', margin, yPos);
      yPos += 15;

      let dateText = `${data.cidade || 'Cidade'} - ${data.estado || 'UF'}, ___ de ____________ de ______.`;
      if (data.data) {
          const d = new Date(data.data + 'T12:00:00');
          dateText = `${data.cidade || 'Cidade'} - ${data.estado || 'UF'}, ${d.getDate()} de ${d.toLocaleString('pt-BR', { month: 'long' })} de ${d.getFullYear()}.`;
      }
      doc.text(dateText, pageWidth / 2, yPos, { align: 'center' });
      yPos += 25;

      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 5;
      doc.text(data.contratado_nome || 'Assinatura do Contratado (Autônomo)', pageWidth / 2, yPos, { align: 'center' });
      yPos += 5;
      doc.text(`CPF: ${data.contratado_cpf || '____________________'}`, pageWidth / 2, yPos, { align: 'center' });
      yPos += 5;
      doc.text(`INSS/PIS: ${data.contratado_inss || '____________________'}`, pageWidth / 2, yPos, { align: 'center' });

      return doc;
    }
  },
];

function App() {
  // Se a URL contém '/admin', mostra o painel administrativo
  if (window.location.pathname === '/admin') {
    return <Admin />;
  }

  // Estados com inicialização síncrona via localStorage para evitar perda de dados no reload
  const [selectedDocId, setSelectedDocId] = useState(() =>
    localStorage.getItem('anixdocs_selectedDocId') || null
  );
  const [formData, setFormData] = useState(() => {
    const saved = localStorage.getItem('anixdocs_formData');
    try {
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });
  const [errors, setErrors] = useState({});
  const [activeTab, setActiveTab] = useState(() => parseInt(localStorage.getItem('anixdocs_activeTab'), 10) || 0);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [activeModal, setActiveModal] = useState(null); // 'resumo', 'idiomas', 'habilidades', 'welcome', 'pix', 'preview'
  const [showWelcomeModal, setShowWelcomeModal] = useState(true);
  const [showPixModal, setShowPixModal] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [pixCode, setPixCode] = useState('');
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  const selectedDoc = documentModels.find(d => d.id === selectedDocId);

  // Registra visualização da página ao carregar
  useEffect(() => {
    trackPageView('home');
  }, []);

  // Registra visualização de documento selecionado
  useEffect(() => {
    if (selectedDoc) {
      trackDocumentView(selectedDoc.id, selectedDoc.title);
    }
  }, [selectedDoc]);

  // Atualiza o preview automaticamente quando os dados mudam
  useEffect(() => {
    if (selectedDoc) {
      const currentGroup = selectedDoc.fieldGroups?.[activeTab];
      if (currentGroup?.showIf && !currentGroup.showIf(formData)) {
        setActiveTab(0); // Reseta para a primeira aba se a atual se tornar inválida
      }
    }
  }, [formData, activeTab, selectedDoc]);

  // Salva rascunho automaticamente sempre que formData mudar
  useEffect(() => {
    localStorage.setItem('anixdocs_formData', JSON.stringify(formData));
  }, [formData]);

  // Salva estado da navegação (documento selecionado e aba ativa) para persistência entre reloads
  useEffect(() => {
    if (selectedDocId) localStorage.setItem('anixdocs_selectedDocId', selectedDocId);
    else localStorage.removeItem('anixdocs_selectedDocId');
    localStorage.setItem('anixdocs_activeTab', activeTab.toString());
  }, [selectedDocId, activeTab]);

  useEffect(() => {
    if (selectedDoc && selectedDoc.generatePDF) {
      // Debounce para evitar lentidão na digitação
      const timer = setTimeout(() => {
        const doc = selectedDoc.generatePDF(formData);
        if (doc) {
          const dataUri = doc.output('datauristring');
          setPreviewUrl(dataUri);
        }
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [formData, selectedDoc]);

  // Bloqueia atalhos de teclado (Ctrl+P, Ctrl+S, etc)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 's' || e.key === 'P' || e.key === 'S')) {
        const rightPanel = document.querySelector('.right-panel');
        if (rightPanel && (rightPanel.contains(e.target) || rightPanel.contains(document.activeElement))) {
          e.preventDefault();
          return false;
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, []);

  // Bloqueia clique direito no preview
  useEffect(() => {
    if (!previewUrl) return;
    
    const handleContextMenu = (e) => {
      const rightPanel = document.querySelector('.right-panel');
      if (rightPanel && rightPanel.contains(e.target)) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };
    
    const handleMouseDown = (e) => {
      const rightPanel = document.querySelector('.right-panel');
      if (rightPanel && rightPanel.contains(e.target)) {
        if (e.button === 2) { // Botão direito
          e.preventDefault();
          e.stopPropagation();
          return false;
        }
      }
    };

    document.addEventListener('contextmenu', handleContextMenu, true);
    document.addEventListener('mousedown', handleMouseDown, true);
    
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu, true);
      document.removeEventListener('mousedown', handleMouseDown, true);
    };
  }, [previewUrl]);

  const handleInputChange = (e) => {
    const { name, value, type, files, checked } = e.target;

    if (name === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (value && !emailRegex.test(value)) {
        setErrors(prev => ({ ...prev, [name]: 'E-mail inválido' }));
      } else {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[name];
          return newErrors;
        });
      }
    }

    if (name.includes('cpf') || name.includes('cnpj')) {
      if (value && !validarCpfCnpj(value)) {
        setErrors(prev => ({ ...prev, [name]: 'CPF/CNPJ inválido' }));
      } else {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors[name];
          return newErrors;
        });
      }
    }

    if (type === 'file' && files && files[0]) {
      const file = files[0];
      
      // Se for upload de foto do currículo, redimensiona mantendo proporção
      if (name === 'foto' && file.type.startsWith('image/')) {
        const img = new Image();
        const reader = new FileReader();
        
        reader.onload = (e) => {
          img.src = e.target.result;
          
          img.onload = () => {
            // Cria um canvas para redimensionar a imagem
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Define dimensões proporcionais (3x4 ratio)
            const maxWidth = 600;
            const maxHeight = 800;
            let width = img.width;
            let height = img.height;
            
            // Calcula proporção mantendo aspect ratio
            if (width > height) {
              if (width > maxWidth) {
                height = (height * maxWidth) / width;
                width = maxWidth;
              }
            } else {
              if (height > maxHeight) {
                width = (width * maxHeight) / height;
                height = maxHeight;
              }
            }
            
            canvas.width = width;
            canvas.height = height;
            
            // Desenha a imagem redimensionada
            ctx.drawImage(img, 0, 0, width, height);
            
            // Converte para base64 com qualidade otimizada
            const resizedImageData = canvas.toDataURL('image/jpeg', 0.85);
            
            setFormData(prev => ({
              ...prev,
              [name]: resizedImageData
            }));
          };
        };
        
        reader.readAsDataURL(file);
      } else {
        // Processamento padrão para outros arquivos
        const reader = new FileReader();
        reader.onload = (evt) => {
          setFormData(prev => ({
            ...prev,
            [name]: evt.target.result
          }));
        };
        reader.readAsDataURL(file);
      }
    } else if (type === 'checkbox') {
      setFormData(prev => ({
        ...prev,
        [name]: checked
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
      
      // Auto-complete de CEP
      if (name === 'cep' || name.endsWith('_cep')) {
        const cepLimpo = value.replace(/\D/g, '');
        if (cepLimpo.length === 8) {
          buscarCEP(cepLimpo).then(dados => {
            if (dados) {
              // Define o prefixo para campos relacionados (ex: locador_cep -> locador_cidade)
              const prefixo = name.endsWith('_cep') ? name.replace('_cep', '_') : '';
              
              setFormData(prev => ({
                ...prev,
                [`${prefixo}cidade`]: dados.cidade,
                [`${prefixo}estado`]: dados.estado,
                ...(dados.endereco && { [`${prefixo}endereco`]: dados.endereco }),
                ...(dados.bairro && { [`${prefixo}bairro`]: dados.bairro })
              }));
            }
          });
        }
      }
    }
  };

  const handleDocSelect = (id) => {
    setSelectedDocId(id);
    setFormData({}); // Limpa o formulário ao trocar de documento
    setErrors({});
    setPreviewUrl(null);
    setActiveTab(0);
    setActiveModal(null);
  };

  const handleBackToHome = () => {
    setSelectedDocId(null);
    setFormData({});
    setErrors({});
    setPreviewUrl(null);
    setActiveTab(0);
  };

  const handlePreview = () => {
    if (selectedDoc && selectedDoc.generatePDF) {
      const doc = selectedDoc.generatePDF(formData);
      if (doc) {
        const dataUri = doc.output('datauristring');
        setPreviewUrl(dataUri);
        setShowPreviewModal(true);
      }
    }
  };

  const generateDoc = () => {
    if (selectedDoc && selectedDoc.generatePDF) {
      // Garante que arrays vazios não quebrem o PDF
      return selectedDoc.generatePDF(formData);
    }
    return null;
  };

  const handleDownload = () => {
    if (!isPaid) {
      handleRequestPayment();
      return;
    }
    const doc = generateDoc();
    if (doc) {
      doc.save(`${selectedDoc.id}.pdf`);
      trackDocumentGeneration(selectedDoc.id, selectedDoc.title, 'download');
    }
  };

  const handlePrint = () => {
    if (!isPaid) {
      handleRequestPayment();
      return;
    }
    const doc = generateDoc();
    if (doc) {
      doc.autoPrint();
      window.open(doc.output('bloburl'), '_blank');
      trackDocumentGeneration(selectedDoc.id, selectedDoc.title, 'print');
    }
  };

  const handleShare = async () => {
    if (!isPaid) {
      handleRequestPayment();
      return;
    }
    const doc = generateDoc();
    if (doc) {
      const blob = doc.output('blob');
      const file = new File([blob], `${selectedDoc.id}.pdf`, { type: "application/pdf" });
      if (navigator.share) {
        try {
          await navigator.share({
            files: [file],
            title: selectedDoc.title,
            text: 'Segue o documento gerado.'
          });
          trackDocumentGeneration(selectedDoc.id, selectedDoc.title, 'share');
        } catch (err) {
          console.error("Erro ao compartilhar", err);
        }
      } else {
        alert("O compartilhamento direto não é suportado neste navegador/dispositivo. Por favor, baixe o PDF e envie manualmente.");
      }
    }
  };

  const handleRequestPayment = () => {
    // Gera um código PIX mockup (em produção, viria da API do Mercado Pago/Stripe)
    const mockPixCode = '00020126580014br.gov.bcb.pix0136' + Math.random().toString(36).substr(2, 32) + '5204000053039865802BR5925Anix Copiadora LTDA6009Sao Paulo62070503***6304' + Math.random().toString(16).substr(2, 4).toUpperCase();
    setPixCode(mockPixCode);
    setShowPixModal(true);
  };

  const handlePaymentConfirmed = () => {
    // Em produção, isso seria confirmado via webhook
    setIsPaid(true);
    setShowPixModal(false);
    // Registra o pagamento
    if (selectedDoc) {
      trackPayment(selectedDoc.id, selectedDoc.title, selectedDoc.price || 0, 'pix');
    }
    setShowSuccessModal(true);
  };

  const visibleFieldGroups = selectedDoc?.fieldGroups?.filter(g => g.showIf ? g.showIf(formData) : true) || [];
  const currentFields = selectedDoc?.fieldGroups?.[activeTab]?.fields || [];

  const handleTabClick = (group) => {
    const originalIndex = selectedDoc.fieldGroups.findIndex(g => g.tab === group.tab);
    setActiveTab(originalIndex);
  };

  // --- Funções Específicas para o Currículo ---

  const addListItem = (listName, itemTemplate) => {
    setFormData(prev => ({
      ...prev,
      [listName]: [...(prev[listName] || []), itemTemplate]
    }));
  };

  const removeListItem = (listName, index) => {
    setFormData(prev => {
      const newList = [...(prev[listName] || [])];
      newList.splice(index, 1);
      return { ...prev, [listName]: newList };
    });
  };

  const updateListItem = (listName, index, field, value) => {
    setFormData(prev => {
      const newList = [...(prev[listName] || [])];
      newList[index] = { ...newList[index], [field]: value };
      return { ...prev, [listName]: newList };
    });
  };

  const toggleSkill = (skill) => {
    setFormData(prev => {
      const currentSkills = prev.habilidades || [];
      if (currentSkills.includes(skill)) {
        return { ...prev, habilidades: currentSkills.filter(s => s !== skill) };
      } else {
        return { ...prev, habilidades: [...currentSkills, skill] };
      }
    });
  };

  const toggleLanguage = (lang, nivel) => {
    // Adiciona ou atualiza o nível se já existe
    setFormData(prev => {
      const currentLangs = prev.idiomas || [];
      const existingIndex = currentLangs.findIndex(l => l.idioma === lang);
      
      if (existingIndex >= 0) {
        // Se clicou e já existe, atualiza nível ou remove se for desmarcar (opcional, aqui vamos só atualizar)
        const newLangs = [...currentLangs];
        newLangs[existingIndex] = { idioma: lang, nivel };
        return { ...prev, idiomas: newLangs };
      } else {
        return { ...prev, idiomas: [...currentLangs, { idioma: lang, nivel }] };
      }
    });
  };

  const removeLanguage = (lang) => {
    setFormData(prev => ({
      ...prev,
      idiomas: (prev.idiomas || []).filter(l => l.idioma !== lang)
    }));
  };

  const addBudgetItem = () => {
    setFormData(prev => ({
      ...prev,
      itens_orcamento: [...(prev.itens_orcamento || []), { descricao: '', quantidade: 1, valor: 0 }]
    }));
  };

  const updateBudgetItem = (index, field, value) => {
    setFormData(prev => {
      const newItems = [...(prev.itens_orcamento || [])];
      newItems[index] = { ...newItems[index], [field]: value };
      return { ...prev, itens_orcamento: newItems };
    });
  };

  const resumeTemplates = [
    { label: "Primeiro Emprego", text: `Em busca da minha primeira oportunidade profissional como ${formData.cargo || '[Cargo]'}, desejo aplicar meus conhecimentos e habilidades para contribuir com o crescimento da empresa. Sou proativo, tenho facilidade de aprendizado e estou disposto a enfrentar novos desafios.` },
    { label: "Profissional Experiente", text: `Profissional com sólida experiência na área de ${formData.cargo || '[Cargo]'}, focado em resultados e eficiência. Possuo histórico comprovado de melhoria de processos e liderança de equipes.` },
    { label: "Gestão e Liderança", text: `Gestor experiente com foco em liderança de equipes e gestão estratégica. Habilidade em motivar colaboradores e alinhar objetivos individuais aos da organização.` },
    { label: "Criativo / Inovação", text: `Profissional criativo e apaixonado por inovação, buscando atuar como ${formData.cargo || '[Cargo]'}. Experiência em desenvolvimento de soluções originais e pensamento fora da caixa.` },
    { label: "Administrativo Geral", text: `Atuando como ${formData.cargo || '[Cargo]'} com foco em organização, pontualidade e eficiência administrativa. Comprometido com a qualidade e o bom ambiente de trabalho.` }
  ];

  const skillsList = [
    "Liderança", "Negociação", "Adaptabilidade", "Comunicação eficaz", 
    "Autoconfiança", "Resiliência", "Autoconhecimento", "Pensamento crítico", 
    "Trabalho em equipe", "Criatividade", "Proatividade", "Inteligência emocional", 
    "Resolução de problemas", "Foco em resultados", "Gestão do tempo"
  ];

  const languagesList = ["Inglês", "Espanhol", "Francês"];
  const languageLevels = ["Básico", "Intermediário", "Avançado", "Fluente"];

  // --- Renderização do Formulário Personalizado (CV) ---
  const renderCVForm = () => {
    const cvTabs = ['Dados Pessoais', 'Resumo', 'Experiência', 'Formação', 'Idiomas', 'Habilidades'];

    const modelosCurriculo = [
      { id: 'classico', nome: 'Clássico', desc: 'Layout tradicional, ideal para áreas formais' },
      { id: 'moderno', nome: 'Moderno', desc: 'Duas colunas com design atual' },
      { id: 'criativo', nome: 'Criativo', desc: 'Visual diferenciado com cores' },
      { id: 'executivo', nome: 'Executivo', desc: 'Elegante para cargos de liderança' },
      { id: 'primeiro_emprego', nome: 'Primeiro Emprego', desc: 'Focado em formação e habilidades' },
    ];

    return (
      <div className="cv-form">
        {/* Seletor de Modelo */}
        <div className="modelo-selector" style={{ marginBottom: '20px', padding: '20px', background: '#f8f9fa', borderRadius: '10px' }}>
          <label style={{ fontWeight: 'bold', marginBottom: '15px', display: 'block', fontSize: '16px' }}>Escolha o Modelo do Currículo:</label>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(3, 1fr)', 
            gap: '12px',
            maxWidth: '100%'
          }}>
            {modelosCurriculo.map(modelo => (
              <div 
                key={modelo.id}
                onClick={() => setFormData(prev => ({ ...prev, modelo_curriculo: modelo.id }))}
                style={{
                  padding: '15px',
                  border: formData.modelo_curriculo === modelo.id ? '2px solid #3498db' : '2px solid #e0e0e0',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  background: formData.modelo_curriculo === modelo.id ? '#e8f4fc' : 'white',
                  transition: 'all 0.2s ease',
                  textAlign: 'center',
                  boxShadow: formData.modelo_curriculo === modelo.id ? '0 4px 12px rgba(52, 152, 219, 0.3)' : '0 2px 4px rgba(0,0,0,0.05)'
                }}
                onMouseEnter={(e) => {
                  if (formData.modelo_curriculo !== modelo.id) {
                    e.currentTarget.style.borderColor = '#aaa';
                    e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (formData.modelo_curriculo !== modelo.id) {
                    e.currentTarget.style.borderColor = '#e0e0e0';
                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
                  }
                }}
              >
                <strong style={{ display: 'block', color: formData.modelo_curriculo === modelo.id ? '#2980b9' : '#333', marginBottom: '5px', fontSize: '14px' }}>{modelo.nome}</strong>
                <small style={{ color: '#777', fontSize: '12px', lineHeight: '1.3', display: 'block' }}>{modelo.desc}</small>
              </div>
            ))}
          </div>
        </div>

        <div className="tab-buttons">
          {cvTabs.map((tab, index) => (
            <button
              key={tab}
              className={`tab-button ${activeTab === index ? 'active' : ''}`}
              onClick={() => setActiveTab(index)}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="form-content">
          {activeTab === 0 && (
            <div className="cv-section">
              <h3>Dados Pessoais</h3>
              <div className="form-group" style={{ marginBottom: '15px' }}>
                <label>Foto 3x4 (Opcional)</label>
                <input 
                  type="file" 
                  name="foto" 
                  accept="image/*"
                  onChange={handleInputChange}
                />
                {formData.foto && (
                  <div style={{ marginTop: '10px', position: 'relative', display: 'inline-block' }}>
                    <img 
                      src={formData.foto} 
                      alt="Preview da Foto" 
                      style={{ 
                        width: '120px', 
                        height: '160px', 
                        objectFit: 'cover', 
                        border: '2px solid #3498db', 
                        borderRadius: '4px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, foto: null }))}
                      style={{
                        position: 'absolute',
                        top: '-8px',
                        right: '-8px',
                        background: '#e74c3c',
                        color: 'white',
                        border: 'none',
                        borderRadius: '50%',
                        width: '24px',
                        height: '24px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                      }}
                      title="Remover foto"
                    >
                      ×
                    </button>
                    <p style={{ fontSize: '0.85rem', color: '#666', marginTop: '5px' }}>
                      Proporção 3x4 - A foto será ajustada automaticamente no PDF
                    </p>
                  </div>
                )}
              </div>
              <div className="form-group" style={{ marginBottom: '15px' }}><label>Nome Completo</label><input type="text" name="nome" value={formData.nome || ''} onChange={handleInputChange} /></div>
              <div style={{ display: 'flex', gap: '15px' }}>
                <div className="form-group" style={{ flex: 2, marginBottom: '15px' }}><label>Cargo Pretendido</label><input type="text" name="cargo" value={formData.cargo || ''} onChange={handleInputChange} /></div>
                <div className="form-group" style={{ flex: 1, marginBottom: '15px' }}><label>Estado Civil</label><input type="text" name="estado_civil" value={formData.estado_civil || ''} onChange={handleInputChange} /></div>
                <div className="form-group" style={{ flex: 0.5, marginBottom: '15px' }}><label>Idade</label><input type="number" name="idade" value={formData.idade || ''} onChange={handleInputChange} /></div>
              </div>
              <div className="form-group" style={{ marginBottom: '15px' }}><label>Endereço</label><input type="text" name="endereco" value={formData.endereco || ''} onChange={handleInputChange} /></div>
              <div className="form-group" style={{ marginBottom: '15px' }}><label>Cidade</label><input type="text" name="cidade" value={formData.cidade || ''} onChange={handleInputChange} /></div>
              <div className="form-group" style={{ marginBottom: '15px' }}><label>Estado (UF)</label><input type="text" name="estado" value={formData.estado || ''} onChange={handleInputChange} /></div>
              <div className="form-group" style={{ marginBottom: '15px' }}><label>Telefone</label><input type="text" name="telefone" value={formData.telefone || ''} onChange={handleInputChange} /></div>
              <div className="form-group" style={{ marginBottom: '15px' }}>
                <label>E-mail</label>
                <input 
                  type="email" 
                  name="email" 
                  value={formData.email || ''} 
                  onChange={handleInputChange} 
                  style={errors.email ? { borderColor: '#e74c3c' } : {}}
                />
                {errors.email && <span style={{ color: '#e74c3c', fontSize: '0.85rem', marginTop: '5px', display: 'block' }}>{errors.email}</span>}
              </div>
            </div>
          )}

          {activeTab === 1 && (
            <div className="cv-section">
              <h3>Resumo Profissional <button type="button" className="btn-open-modal" onClick={() => setActiveModal('resumo')}>Ver Modelos</button></h3>
              <textarea rows="5" name="resumo" value={formData.resumo || ''} onChange={handleInputChange} placeholder="Escreva um breve resumo sobre suas qualificações..."></textarea>
            </div>
          )}

          {activeTab === 2 && (
            <div className="cv-section">
              <h3>Experiência Profissional <button type="button" className="btn-add" onClick={() => addListItem('experiencias', { empresa: '', cargo: '', periodo: '' })}>+</button></h3>
              {(formData.experiencias || []).map((exp, index) => (
                <div key={index} className="cv-list-item">
                  <button type="button" className="btn-icon delete" onClick={() => removeListItem('experiencias', index)}>🗑️</button>
                  <div className="form-group"><label>Empresa</label><input type="text" value={exp.empresa} onChange={(e) => updateListItem('experiencias', index, 'empresa', e.target.value)} /></div>
                  <div className="form-group"><label>Cargo</label><input type="text" value={exp.cargo} onChange={(e) => updateListItem('experiencias', index, 'cargo', e.target.value)} /></div>
                  <div className="form-group"><label>Período (Ex: 2012 - 2013)</label><input type="text" value={exp.periodo} onChange={(e) => updateListItem('experiencias', index, 'periodo', e.target.value)} /></div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 3 && (
            <div className="cv-section">
              <h3>Formação Acadêmica <button type="button" className="btn-add" onClick={() => addListItem('formacao', { instituicao: '', curso: '', periodo: '' })}>+</button></h3>
              {(formData.formacao || []).map((edu, index) => (
                <div key={index} className="cvcv-item">
                  <button type="button" className="btn-icon delete" onClick={() => removeListItem('formacao', index)}>🗑️</button>
                  <div className="form-group"><label>Instituição</label><input type="text" value={edu.instituicao} onChange={(e) => updateListItem('formacao', index, 'instituicao', e.target.value)} /></div>
                  <div className="form-group"><label>Curso</label><input type="text" value={edu.curso} onChange={(e) => updateListItem('formacao', index, 'curso', e.target.value)} /></div>
                  <div className="form-group"><label>Período</label><input type="text" value={edu.periodo} onChange={(e) => updateListItem('formacao', index, 'periodo', e.target.value)} /></div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 4 && (
            <div className="cv-section">
              <h3>Idiomas</h3>
              <div>
                {languagesList.map(lang => {
                  const current = (formData.idiomas || []).find(l => l.idioma === lang);
                  return (
                    <div key={lang} className="lang-row">
                      <span>{lang}</span>
                      <select 
                        value={current ? current.nivel : ''} 
                        onChange={(e) => e.target.value ? toggleLanguage(lang, e.target.value) : removeLanguage(lang)}
                      >
                        <option value="">Não possuo</option>
                        {languageLevels.map(lvl => <option key={lvl} value={lvl}>{lvl}</option>)}
                      </select>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 5 && (
            <div className="cv-section">
              <h3>Habilidades</h3>
              <p>Clique nas habilidades que você possui.</p>
              <div className="skill-grid">
                {skillsList.map(skill => (
                  <span
                    key={skill}
                    className={`skill-chip ${(formData.habilidades || []).includes(skill) ? 'selected' : ''}`}
                    onClick={() => toggleSkill(skill)}
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // --- Renderização do Formulário de Orçamento ---
  const renderOrcamentoForm = () => {
    const totalOrcamento = (formData.itens_orcamento || []).reduce((acc, item) => {
      return acc + ((parseFloat(item.quantidade) || 0) * (parseFloat(item.valor) || 0));
    }, 0);

    return (
      <div className="cv-form">
        <div className="cv-section">
          <h3>Dados do Prestador e Cliente</h3>
          <div style={{ display: 'flex', gap: '15px' }}>
            <div className="form-group" style={{ flex: 1 }}><label>Nome do Prestador</label><input type="text" name="prestador_nome" value={formData.prestador_nome || ''} onChange={handleInputChange} /></div>
            <div className="form-group" style={{ flex: 1 }}><label>CPF/CNPJ Prestador</label><input type="text" name="prestador_doc" value={formData.prestador_doc || ''} onChange={handleInputChange} /></div>
          </div>
          <div className="form-group"><label>Contato do Prestador (Tel/Email)</label><input type="text" name="prestador_contato" value={formData.prestador_contato || ''} onChange={handleInputChange} /></div>
          
          <div style={{ display: 'flex', gap: '15px', marginTop: '15px' }}>
            <div className="form-group" style={{ flex: 1 }}><label>Nome do Cliente</label><input type="text" name="cliente_nome" value={formData.cliente_nome || ''} onChange={handleInputChange} /></div>
            <div className="form-group" style={{ flex: 1 }}><label>CPF/CNPJ Cliente</label><input type="text" name="cliente_doc" value={formData.cliente_doc || ''} onChange={handleInputChange} /></div>
          </div>
          <div className="form-group"><label>Endereço do Cliente</label><input type="text" name="cliente_endereco" value={formData.cliente_endereco || ''} onChange={handleInputChange} /></div>
        </div>

        <div className="cv-section">
          <h3>Itens do Orçamento <button type="button" className="btn-add" onClick={addBudgetItem}>+</button></h3>
          {(formData.itens_orcamento || []).map((item, index) => (
            <div key={index} className="budget-item-row">
              <div className="form-group" style={{ flex: 3 }}><label>Descrição</label><input type="text" value={item.descricao} onChange={(e) => updateBudgetItem(index, 'descricao', e.target.value)} /></div>
              <div className="form-group" style={{ flex: 1 }}><label>Qtd</label><input type="number" value={item.quantidade} onChange={(e) => updateBudgetItem(index, 'quantidade', e.target.value)} /></div>
              <div className="form-group" style={{ flex: 1 }}><label>Valor Unit.</label><input type="number" value={item.valor} onChange={(e) => updateBudgetItem(index, 'valor', e.target.value)} /></div>
              <button type="button" className="btn-icon" style={{ color: '#e74c3c', marginBottom: '10px' }} onClick={() => removeListItem('itens_orcamento', index)}>🗑️</button>
            </div>
          ))}
          <div className="budget-total">
            Total: R$ {totalOrcamento.toFixed(2).replace('.', ',')}
          </div>
        </div>

        <div className="cv-section">
          <h3>Detalhes Finais</h3>
          <div className="form-group"><label>Validade do Orçamento</label><input type="text" name="validade" placeholder="Ex: 15 dias" value={formData.validade || ''} onChange={handleInputChange} /></div>
          <div style={{ display: 'flex', gap: '15px' }}>
            <div className="form-group" style={{ flex: 1 }}><label>Cidade</label><input type="text" name="cidade" value={formData.cidade || ''} onChange={handleInputChange} /></div>
            <div className="form-group" style={{ flex: 0.5 }}><label>Estado</label><input type="text" name="estado" value={formData.estado || ''} onChange={handleInputChange} /></div>
            <div className="form-group" style={{ flex: 1 }}><label>Data</label><input type="date" name="data" value={formData.data || ''} onChange={handleInputChange} /></div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>AnixDocs</h1>
        <h2>Faça você mesmo • Rápido e Profissional</h2>
      </header>

      <div className="main-container">
        {/* --- Painel Esquerdo (Botões ou Formulário) --- */}
        <div className="left-panel">
          {!selectedDoc ? (
            <div className="doc-grid">
              {documentModels.map(doc => (
                <div key={doc.id} className="doc-card" onClick={() => handleDocSelect(doc.id)}>
                  <div className="doc-card-header">
                    <div className="doc-card-icon">{doc.icon || '📄'}</div>
                    <div className="doc-card-price">R$ {doc.price?.toFixed(2).replace('.', ',')}</div>
                  </div>
                  <div className="doc-card-title">{doc.title}</div>
                  <div className="doc-card-desc">{doc.description || 'Clique para criar este documento.'}</div>
                </div>
              ))}
            </div>
          ) : (
            <>
              <h1>{selectedDoc.title}</h1>
              <p>Preencha os dados abaixo. O preview será atualizado ao lado.</p>
              
              {selectedDoc.id === 'curriculo' ? (
                  renderCVForm()
              ) : selectedDoc.id === 'orcamento' ? (
                  renderOrcamentoForm()
              ) : (
                <>
                  {visibleFieldGroups.length > 1 && (
                    <div className="tab-buttons">
                      {visibleFieldGroups.map(group => (
                        <button
                          key={group.tab}
                          className={`tab-button ${selectedDoc.fieldGroups[activeTab].tab === group.tab ? 'active' : ''}`}
                          onClick={() => handleTabClick(group)}
                        >
                          {group.tab}
                        </button>
                      ))}
                    </div>
                  )}

                  <form onSubmit={(e) => e.preventDefault()}>
                    {currentFields.length > 0
                      ? currentFields.map(field =>
                          field.type === 'heading'
                          ? <h3 className="form-heading" key={field.label}>{field.label}</h3>
                          : (
                            <div className={`form-group ${field.className || ''}`} key={field.name}>
                              <label htmlFor={field.name}>{field.label}</label>
                              {field.type === 'textarea' ? (
                                <textarea
                                  id={field.name}
                                  name={field.name}
                                  value={formData[field.name] || ''}
                                  onChange={handleInputChange}
                                  rows="4"
                                />
                              ) : field.type === 'select' ? (
                                <select
                                  id={field.name}
                                  name={field.name}
                                  value={formData[field.name] || ''}
                                  onChange={handleInputChange}
                                >
                                  <option value="" disabled>Selecione...</option>
                                  {field.options.map(opt => (
                                    <option key={opt} value={opt}>{opt}</option>
                                  ))}
                                </select>
                              ) : field.type === 'dynamic_list' ? (
                                <div className="dynamic-list-container">
                                  {(formData[field.name] || field.defaultValues || []).map((item, idx) => (
                                    <div key={idx} style={{ display: 'flex', gap: '10px', marginBottom: '5px', alignItems: 'center' }}>
                                      <input 
                                        type="text" 
                                        value={item} 
                                        onChange={(e) => {
                                          const newList = [...(formData[field.name] || field.defaultValues || [])];
                                          newList[idx] = e.target.value;
                                          setFormData(prev => ({ ...prev, [field.name]: newList }));
                                        }}
                                      />
                                      <button type="button" className="btn-icon delete" style={{position: 'static'}} onClick={() => {
                                          const newList = [...(formData[field.name] || field.defaultValues || [])];
                                          newList.splice(idx, 1);
                                          setFormData(prev => ({ ...prev, [field.name]: newList }));
                                      }}>🗑️</button>
                                    </div>
                                  ))}
                                  <button type="button" className="btn-add" style={{marginLeft: 0, marginTop: '5px'}} onClick={() => {
                                      const newList = [...(formData[field.name] || field.defaultValues || [])];
                                      newList.push('');
                                      setFormData(prev => ({ ...prev, [field.name]: newList }));
                                  }}>+</button>
                                </div>
                              ) : (
                                <>
                                <input
                                  type={field.type}
                                  id={field.name}
                                  name={field.name}
                                  placeholder={field.placeholder || ''}
                                  {...(field.type !== 'file' ? { value: formData[field.name] || '' } : {})}
                                  {...(field.type === 'checkbox' ? { checked: formData[field.name] || false } : {})}
                                  onChange={handleInputChange}
                                  style={errors[field.name] ? { borderColor: '#e74c3c' } : {}}
                                />
                                {errors[field.name] && <span style={{ color: '#e74c3c', fontSize: '0.85rem', marginTop: '5px', display: 'block' }}>{errors[field.name]}</span>}
                                </>
                              )}
                            </div>
                          )
                        ) : (
                      <p>Este modelo estará disponível em breve.</p>
                    )}
                  </form>
                </>
              )}
            <div className="button-group">
              <button type="button" onClick={handleDownload} className="btn-action btn-download">Baixar PDF</button>
              <button type="button" onClick={handlePrint} className="btn-action btn-print">Imprimir</button>
              <button type="button" onClick={handleShare} className="btn-action btn-share">Compartilhar (WhatsApp)</button>
            </div>
            </>
          )}
        </div>

        {/* --- Painel Direito (Preview) --- */}
        <div className="right-panel" onContextMenu={(e) => e.preventDefault()}>
          {previewUrl ? (
            <div className="preview-container">
              {/* Botão de voltar para edição (mobile only) */}
              <button
                className="btn-back-edit-mobile"
                onClick={handleBackToHome}
                tabIndex={0}
              >
                ← Voltar para edição
              </button>
              <iframe 
                src={`${previewUrl}#toolbar=0&navpanes=0&view=FitH`} 
                className="preview-frame"
                title="Preview do Documento"
              />
              {/* Camada de bloqueio para evitar interação com o PDF */}
              <div 
                className="preview-blocker"
                onContextMenu={(e) => e.preventDefault()}
                onMouseDown={(e) => e.preventDefault()}
                onClick={(e) => e.preventDefault()}
              />
            </div>
          ) : (
            <div className="preview-placeholder">
              <div className="placeholder-icon">📄</div>
              <h2>Pré-visualização do Documento</h2>
              <p>Escolha um documento no menu à esquerda e preencha os dados para ver a prévia em tempo real.</p>
              <div className="placeholder-features">
                <div className="feature-item">
                  <span className="feature-icon">✨</span>
                  <span>Preview instantâneo</span>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">🔒</span>
                  <span>Dados seguros</span>
                </div>
                <div className="feature-item">
                  <span className="feature-icon">📱</span>
                  <span>PDF profissional</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* --- Botão Flutuante para Preview (Mobile) --- */}
      {selectedDoc && (
        <button 
          className="btn-preview-float"
          onClick={() => {
            // Gera o PDF e abre em nova aba (funciona melhor no mobile)
            if (selectedDoc.generatePDF) {
              const doc = selectedDoc.generatePDF(formData);
              if (doc) {
                const blobUrl = doc.output('bloburl');
                window.open(blobUrl, '_blank');
              }
            }
          }}
        >
          👁️ Ver Preview
        </button>
      )}

      {/* --- Modal de Preview Fullscreen (Mobile) --- */}
      {showPreviewModal && (
        <div className="preview-modal-overlay" onClick={() => setShowPreviewModal(false)}>
          <div className="preview-modal-content" onClick={e => e.stopPropagation()}>
            {/* Botão de voltar para edição no preview mobile */}
            <button 
              className="btn-back-edit-mobile"
              onClick={() => setShowPreviewModal(false)}
            >
              ← Voltar
            </button>
            <div className="preview-modal-header">
              <h3>Pré-visualização</h3>
              <button className="modal-close" onClick={() => setShowPreviewModal(false)}>×</button>
            </div>
            <div className="preview-modal-body">
              {previewUrl ? (
                <iframe 
                  src={`${previewUrl}#toolbar=0&navpanes=0&view=FitH`} 
                  className="preview-frame-modal"
                  title="Preview do Documento"
                />
              ) : (
                <div style={{display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#7f8c8d'}}>
                  <p>Carregando preview...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- Modais --- */}
      {activeModal && (
        <div className="modal-overlay" onClick={() => setActiveModal(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Modelos de Resumo</h3>
              <button className="modal-close" onClick={() => setActiveModal(null)}>×</button>
            </div>
            <div className="modal-body">
              {activeModal === 'resumo' && (
                <ul>
                  {resumeTemplates.map((tpl, idx) => (
                    <li key={idx} className="template-option" onClick={() => {
                      setFormData(prev => ({ ...prev, resumo: tpl.text }));
                      setActiveModal(null);
                    }}>
                      <strong>{tpl.label}</strong>
                      <p style={{fontSize: '0.9rem', margin: '5px 0 0'}}>{tpl.text}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- Modal de Boas-vindas --- */}
      {showWelcomeModal && (
        <div className="modal-overlay">
          <div className="modal-content welcome-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{margin: 0, fontSize: '2rem', fontWeight: 'bold'}}>
                Bem-vindo ao Gerador de Documentos! 📄✨
              </h2>
              <p style={{margin: '10px 0 0 0', fontSize: '1.1rem', opacity: 0.95}}>
                Crie documentos profissionais em minutos
              </p>
            </div>
            <div className="modal-body">
              <div style={{
                background: 'linear-gradient(135deg, #e3f2fd 0%, #f3e5f5 100%)',
                padding: '25px 20px',
                borderRadius: '12px',
                marginBottom: '25px',
                border: '2px solid #667eea',
                textAlign: 'center'
              }}>
                <p style={{margin: '0 0 15px 0', fontSize: '1.1rem', color: '#2c3e50', fontWeight: '700'}}>
                  🎯 Como funciona:
                </p>
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '10px',
                  fontSize: '1rem',
                  color: '#34495e'
                }}>
                  <span style={{display: 'flex', alignItems: 'center', gap: '5px'}}>
                    <span style={{fontSize: '1.5rem'}}>📄</span>
                    <span>Escolha o documento</span>
                  </span>
                  <span style={{fontSize: '1.2rem', color: '#667eea'}}>→</span>
                  <span style={{display: 'flex', alignItems: 'center', gap: '5px'}}>
                    <span style={{fontSize: '1.5rem'}}>✏️</span>
                    <span>Preencha os dados</span>
                  </span>
                  <span style={{fontSize: '1.2rem', color: '#667eea'}}>→</span>
                  <span style={{display: 'flex', alignItems: 'center', gap: '5px'}}>
                    <span style={{fontSize: '1.5rem'}}>💳</span>
                    <span>Pague via PIX</span>
                  </span>
                  <span style={{fontSize: '1.2rem', color: '#667eea'}}>→</span>
                  <span style={{display: 'flex', alignItems: 'center', gap: '5px'}}>
                    <span style={{fontSize: '1.5rem'}}>⬇️</span>
                    <span>Baixe</span>
                  </span>
                  <span style={{display: 'flex', alignItems: 'center', gap: '5px'}}>
                    <span style={{fontSize: '1.5rem'}}>🖨️</span>
                    <span>Imprima</span>
                  </span>
                  <span style={{display: 'flex', alignItems: 'center', gap: '5px'}}>
                    <span style={{fontSize: '1.5rem'}}>📱</span>
                    <span>Compartilhe via WhatsApp</span>
                  </span>
                </div>
              </div>
              
              <button 
                className="btn-primary" 
                style={{
                  width: '100%', 
                  marginTop: '10px', 
                  padding: '15px', 
                  fontSize: '1.2rem',
                  fontWeight: 'bold',
                  textTransform: 'uppercase',
                  letterSpacing: '1px'
                }}
                onClick={() => setShowWelcomeModal(false)}
              >
                🚀 Começar Agora
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- Modal de Pagamento PIX --- */}
      {showPixModal && selectedDoc && (
        <div className="modal-overlay">
          <div className="modal-content pix-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Pagamento via PIX</h3>
              <button className="modal-close" onClick={() => setShowPixModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="pix-info">
                <h4>{selectedDoc.icon} {selectedDoc.title}</h4>
                <p className="pix-price">R$ {selectedDoc.price?.toFixed(2)}</p>
              </div>
              
              <div className="pix-qrcode">
                <div className="qrcode-placeholder">
                  <svg width="200" height="200" viewBox="0 0 200 200" style={{background: 'white', padding: '10px'}}>
                    <rect width="200" height="200" fill="white"/>
                    <rect x="20" y="20" width="40" height="40" fill="black"/>
                    <rect x="70" y="20" width="10" height="10" fill="black"/>
                    <rect x="90" y="20" width="20" height="20" fill="black"/>
                    <rect x="140" y="20" width="40" height="40" fill="black"/>
                    <rect x="20" y="70" width="10" height="10" fill="black"/>
                    <rect x="50" y="70" width="10" height="10" fill="black"/>
                    <rect x="80" y="70" width="30" height="30" fill="black"/>
                    <rect x="130" y="70" width="10" height="10" fill="black"/>
                    <rect x="160" y="70" width="20" height="20" fill="black"/>
                    <rect x="20" y="140" width="40" height="40" fill="black"/>
                    <rect x="80" y="140" width="10" height="10" fill="black"/>
                    <rect x="100" y="140" width="30" height="30" fill="black"/>
                    <rect x="140" y="140" width="10" height="10" fill="black"/>
                    <rect x="160" y="160" width="20" height="20" fill="black"/>
                  </svg>
                  <p style={{fontSize: '0.85rem', color: '#666', marginTop: '10px'}}>QR Code PIX (Teste)</p>
                </div>
              </div>

              <div className="pix-code">
                <label>Código PIX Copia e Cola:</label>
                <div className="code-box">
                  <input 
                    type="text" 
                    value={pixCode} 
                    readOnly 
                    style={{flex: 1, padding: '8px', border: '1px solid #ddd', borderRadius: '4px'}}
                  />
                  <button 
                    className="btn-copy"
                    onClick={() => {
                      navigator.clipboard.writeText(pixCode);
                      alert('Código PIX copiado!');
                    }}
                  >
                    📋 Copiar
                  </button>
                </div>
              </div>

              <div className="pix-instructions">
                <p><strong>Como pagar:</strong></p>
                <ol>
                  <li>Abra o app do seu banco</li>
                  <li>Escolha a opção PIX</li>
                  <li>Escaneie o QR Code ou cole o código acima</li>
                  <li>Confirme o pagamento</li>
                </ol>
              </div>

              <div className="test-buttons">
                <button 
                  className="btn-primary"
                  onClick={handlePaymentConfirmed}
                  style={{width: '100%', padding: '12px', fontSize: '1rem', marginTop: '15px'}}
                >
                  ✅ SIMULAR PAGAMENTO CONFIRMADO (TESTE)
                </button>
                <p style={{fontSize: '0.8rem', color: '#999', textAlign: 'center', marginTop: '10px'}}>
                  Em produção, a confirmação será automática via webhook
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Sucesso */}
      {showSuccessModal && (
        <div className="modal-overlay" onClick={() => setShowSuccessModal(false)}>
          <div className="success-modal" onClick={e => e.stopPropagation()}>
            <div className="success-icon">✅</div>
            <h2>Pagamento Confirmado!</h2>
            <p>Seu documento está pronto. Agora você pode:</p>
            <div className="success-actions">
              <button className="success-btn download" onClick={() => { setShowSuccessModal(false); handleDownload(); }}>
                <span>📥</span> Baixar PDF
              </button>
              <button className="success-btn print" onClick={() => { setShowSuccessModal(false); handlePrint(); }}>
                <span>🖨️</span> Imprimir
              </button>
              <button className="success-btn share" onClick={() => { setShowSuccessModal(false); handleShare(); }}>
                <span>📤</span> Compartilhar
              </button>
            </div>
            <button className="success-close" onClick={() => setShowSuccessModal(false)}>
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;