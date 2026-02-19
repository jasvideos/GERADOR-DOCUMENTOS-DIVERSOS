import React, { useState, useEffect } from 'react';
import { jsPDF } from 'jspdf';
import './App.css';

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

// --- Configuração dos Modelos de Documentos ---
const documentModels = [
  {
    id: 'recibo',
    title: 'Recibo de Pagamento',
    icon: '📄',
    description: 'Gere recibos simples de pagamento com valor por extenso automático.',
    fieldGroups: [{ fields: [
      { name: 'logo', label: 'Logotipo (Opcional)', type: 'file' },
      { name: 'valor', label: 'Valor (R$)', type: 'number', placeholder: 'Ex: 1000,00' },
      { name: 'pagador', label: 'Nome do Pagador', type: 'text', placeholder: 'Quem pagou' },
      { name: 'referente', label: 'Referente a', type: 'text', placeholder: 'Ex: Aluguel de Março' },
      { name: 'beneficiario', label: 'Nome do Beneficiário', type: 'text', placeholder: 'Quem recebeu' },
      { name: 'cpf_cnpj', label: 'CPF/CNPJ do Beneficiário', type: 'text' },
      { name: 'cidade', label: 'Cidade', type: 'text', className: 'half-width' },
      { name: 'estado', label: 'Estado (UF)', type: 'text', className: 'half-width' },
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
    description: 'Recibos detalhados para locação de imóveis residenciais ou comerciais.',
    fieldGroups: [{ fields: [
      { name: 'locador_nome', label: 'Nome do Locador (quem recebe)', type: 'text' },
      { name: 'locador_cpf_cnpj', label: 'CPF/CNPJ do Locador', type: 'text' },
      { name: 'locatario_nome', label: 'Nome do Locatário (quem paga)', type: 'text' },
      { name: 'locatario_cpf_cnpj', label: 'CPF/CNPJ do Locatário', type: 'text' },
      { name: 'endereco_imovel', label: 'Endereço do Imóvel', type: 'text' },
      { name: 'valor_aluguel', label: 'Valor do Aluguel (R$)', type: 'number' },
      { name: 'mes_referencia', label: 'Mês de Referência', type: 'text', placeholder: 'Ex: Janeiro de 2024' },
      { name: 'cidade', label: 'Cidade', type: 'text', className: 'half-width' },
      { name: 'estado', label: 'Estado (UF)', type: 'text', className: 'half-width' },
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
    description: 'Documento para comprovação de endereço residencial.',
    fieldGroups: [{ fields: [
      { name: 'nome', label: 'Seu Nome Completo', type: 'text' },
      { name: 'nacionalidade', label: 'Nacionalidade', type: 'text', className: 'half-width' },
      { name: 'estado_civil', label: 'Estado Civil', type: 'text', className: 'half-width' },
      { name: 'rg', label: 'RG', type: 'text', className: 'half-width' },
      { name: 'cpf', label: 'CPF', type: 'text', className: 'half-width' },
      { name: 'endereco', label: 'Endereço Completo', type: 'text' },
      { name: 'cidade', label: 'Cidade', type: 'text', className: 'half-width' },
      { name: 'estado', label: 'Estado (UF)', type: 'text', className: 'half-width' },
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
          { name: 'cidade', label: 'Cidade', type: 'text', className: 'half-width' },
          { name: 'data_assinatura', label: 'Data da Assinatura', type: 'date', className: 'half-width' },
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
    description: 'Crie um currículo profissional, moderno e formatado.',
    isCustom: true, // Indica que usa renderização personalizada
    generatePDF: (data) => {
      const doc = new jsPDF();
      const margin = 20;
      const pageWidth = 210;
      const maxLineWidth = pageWidth - (margin * 2);
      let yPos = 20;
      let headerTextY = yPos;
      let headerTextMaxWidth = maxLineWidth;

      // --- Cabeçalho ---
      doc.setFontSize(22);
      doc.setFont('helvetica', 'bold');
      const nomeLines = doc.splitTextToSize((data.nome || 'SEU NOME').toUpperCase(), headerTextMaxWidth);
      doc.text(nomeLines, margin, headerTextY + 8);
      headerTextY += (nomeLines.length * 8);

      doc.setFontSize(14);
      doc.setTextColor(100);
      doc.setTextColor(0, 0, 0);
      const cargoLines = doc.splitTextToSize((data.cargo || 'Cargo Pretendido').toUpperCase(), headerTextMaxWidth);
      doc.text(cargoLines, margin, headerTextY + 6);
      headerTextY += (cargoLines.length * 5) + 5;
      doc.setTextColor(0, 0, 0);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const personalInfo = [
        data.estado_civil ? `${data.estado_civil}, ${data.idade || ''} anos` : (data.idade ? `${data.idade} anos` : null),
        data.endereco,
        `${data.cidade || ''}${data.estado ? ', ' + data.estado : ''}`,
        data.telefone ? `Telefone: ${data.telefone}` : null,
        data.email ? `E-mail: ${data.email}` : null
      ].filter(Boolean);

      personalInfo.forEach(line => {
        const splitLine = doc.splitTextToSize(line, headerTextMaxWidth);
        doc.text(splitLine, margin, headerTextY);
        headerTextY += (splitLine.length * 5);
      });
      
      yPos = Math.max(yPos, headerTextY);

      doc.setLineWidth(0.5);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 10;

      // --- Resumo ---
      if (data.resumo) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('RESUMO PROFISSIONAL', margin, yPos);
        yPos += 6;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        const splitResumo = doc.splitTextToSize(data.resumo, maxLineWidth);
        doc.text(splitResumo, margin, yPos);
        yPos += (splitResumo.length * 5) + 5;
      }

      // --- Experiência ---
      if (data.experiencias && data.experiencias.length > 0) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('EXPERIÊNCIA PROFISSIONAL', margin, yPos);
        yPos += 6;
        data.experiencias.forEach(exp => {
          doc.setFontSize(11);
          doc.setFont('helvetica', 'bold');
          doc.text(exp.empresa || 'Empresa', margin, yPos);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(10);
          doc.text(exp.cargo || 'Cargo', margin, yPos + 5);
          if (exp.periodo) {
            doc.text(exp.periodo, margin, yPos + 10);
            yPos += 17;
          } else {
            yPos += 12;
          }
        });
        yPos += 5;
      }

      // --- Formação ---
      if (data.formacao && data.formacao.length > 0) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('FORMAÇÃO ACADÊMICA', margin, yPos);
        yPos += 6;
        data.formacao.forEach(edu => {
          doc.setFontSize(11);
          doc.setFont('helvetica', 'bold');
          doc.text(edu.instituicao || 'Instituição', margin, yPos);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(10);
          doc.text(edu.curso || 'Curso', margin, yPos + 5);
          if (edu.periodo) {
            doc.text(edu.periodo, margin, yPos + 10);
            yPos += 17;
          } else {
            yPos += 12;
          }
        });
        yPos += 5;
      }

      // --- Idiomas e Habilidades (Lado a Lado se couber, ou sequencial) ---
      // Sequencial para simplificar
      if (data.idiomas && data.idiomas.length > 0) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('IDIOMAS', margin, yPos);
        yPos += 6;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        data.idiomas.forEach(lang => {
          doc.text(`• ${lang.idioma} - ${lang.nivel}`, margin + 5, yPos);
          yPos += 5;
        });
        yPos += 5;
      }

      if (data.habilidades && data.habilidades.length > 0) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('HABILIDADES', margin, yPos);
        yPos += 6;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        // Lista separada por vírgulas ou bullets
        const skillsText = data.habilidades.join(', ');
        const splitSkills = doc.splitTextToSize(skillsText, maxLineWidth);
        doc.text(splitSkills, margin, yPos);
        yPos += (splitSkills.length * 5) + 5;
      }

      return doc;
    }
  },
  { id: 'vistoria', 
    title: 'Termo de Vistoria', 
    icon: '🔍',
    description: 'Registre o estado de conservação de um imóvel. (Em Breve)',
    fieldGroups: [], 
    generatePDF: () => alert('Em desenvolvimento') 
  },
  {
    id: 'orcamento',
    title: 'Orçamento de Serviços',
    icon: '💰',
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
      { name: 'endereco', label: 'Endereço Completo', type: 'text' },
      { name: 'cidade', label: 'Cidade', type: 'text', className: 'half-width' },
      { name: 'estado', label: 'Estado (UF)', type: 'text', className: 'half-width' },
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
  const [selectedDocId, setSelectedDocId] = useState(null);
  const [formData, setFormData] = useState({});
  const [errors, setErrors] = useState({});
  const [activeTab, setActiveTab] = useState(0);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [activeModal, setActiveModal] = useState(null); // 'resumo', 'idiomas', 'habilidades'

  const selectedDoc = documentModels.find(d => d.id === selectedDocId);

  // Atualiza o preview automaticamente quando os dados mudam
  useEffect(() => {
    if (selectedDoc) {
      const currentGroup = selectedDoc.fieldGroups?.[activeTab];
      if (currentGroup?.showIf && !currentGroup.showIf(formData)) {
        setActiveTab(0); // Reseta para a primeira aba se a atual se tornar inválida
      }
    }
  }, [formData, activeTab, selectedDoc]);

  useEffect(() => {
    if (selectedDoc && selectedDoc.generatePDF) {
      // Debounce para evitar lentidão na digitação
      const timer = setTimeout(() => {
        const doc = selectedDoc.generatePDF(formData);
        if (doc) {
          const blob = doc.output('bloburl');
          setPreviewUrl(blob + '#toolbar=0');
        }
      }, 800); // Atualiza a cada 800ms após parar de digitar
      return () => clearTimeout(timer);
    }
  }, [formData, selectedDoc]);

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
      const reader = new FileReader();
      reader.onload = (evt) => {
        setFormData(prev => ({
          ...prev,
          [name]: evt.target.result
        }));
      };
      reader.readAsDataURL(files[0]);
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

  const generateDoc = () => {
    if (selectedDoc && selectedDoc.generatePDF) {
      // Garante que arrays vazios não quebrem o PDF
      return selectedDoc.generatePDF(formData);
    }
    return null;
  };

  const handleDownload = () => {
    const doc = generateDoc();
    if (doc) doc.save(`${selectedDoc.id}.pdf`);
  };

  const handlePrint = () => {
    const doc = generateDoc();
    if (doc) {
      doc.autoPrint();
      window.open(doc.output('bloburl'), '_blank');
    }
  };

  const handleShare = async () => {
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
        } catch (err) {
          console.error("Erro ao compartilhar", err);
        }
      } else {
        alert("O compartilhamento direto não é suportado neste navegador/dispositivo. Por favor, baixe o PDF e envie manualmente.");
      }
    }
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

    return (
      <div className="cv-form">
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
        <h1>Gerador de Documentos Diversos</h1>
        <h2>Anix Copiadora</h2>
      </header>

      <div className="main-container">
        {/* --- Painel Esquerdo (Botões ou Formulário) --- */}
        <div className="left-panel">
          {!selectedDoc ? (
            <div className="doc-grid">
              {documentModels.map(doc => (
                <div key={doc.id} className="doc-card" onClick={() => handleDocSelect(doc.id)}>
                  <div className="doc-card-icon">{doc.icon || '📄'}</div>
                  <div className="doc-card-title">{doc.title}</div>
                  <div className="doc-card-desc">{doc.description || 'Clique para criar este documento.'}</div>
                </div>
              ))}
            </div>
          ) : (
            <>
              <button className="btn-back" onClick={() => {
                setSelectedDocId(null);
                setPreviewUrl(null);
              }}>← Voltar para o Menu</button>
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
        <div className="right-panel">
          {previewUrl ? (
            <iframe src={previewUrl} className="preview-frame" title="Preview do Documento" />
          ) : (
            <div className="preview-placeholder">
              <h2>Visualização do Documento</h2>
              <p>Selecione um documento no menu à esquerda para gerar uma pré-visualização.</p>
            </div>
          )}
        </div>
      </div>
      <footer className="app-footer">
        <p>© {new Date().getFullYear()} Anix Copiadora. Todos os direitos reservados.</p>
        <p>Contato: (XX) 99999-9999 | contato@anixcopiadora.com.br</p>
      </footer>

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
    </div>
  );
}

export default App;