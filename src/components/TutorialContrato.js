import React, { useState, useEffect, useRef, useCallback } from 'react';
import './TutorialContrato.css';

// ============================================================
// DADOS DO TUTORIAL — passos com campo, valor e narração
// ============================================================
const TUTORIAL_STEPS = [
  {
    tab: 0, // Partes
    field: null,
    value: null,
    narration: 'Bem-vindo ao tutorial do Contrato de Locação! Vou te mostrar como preencher cada campo com calma. Pode acompanhar as instruções na tela enquanto o contrato é preenchido automaticamente.',
    label: 'Introdução',
  },
  {
    tab: 0,
    field: 'locador_nome',
    value: 'João Carlos Silva Santos',
    narration: 'Comece pelo nome completo do Locador. O Locador é o proprietário do imóvel, quem está alugando. Digite o nome sem abreviações.',
    label: 'Nome do Locador',
  },
  {
    tab: 0,
    field: 'locador_cpf_cnpj',
    value: '123.456.789-00',
    narration: 'Agora informe o CPF ou CNPJ do Locador. Use o formato com pontos e traço.',
    label: 'CPF do Locador',
  },
  {
    tab: 0,
    field: 'locador_rg',
    value: '12.345.678-9',
    narration: 'Preencha o número do RG do Locador.',
    label: 'RG do Locador',
  },
  {
    tab: 0,
    field: 'locador_estado_civil',
    value: 'Casado',
    narration: 'Informe o estado civil do Locador. Exemplos: solteiro, casado, divorciado.',
    label: 'Estado Civil do Locador',
  },
  {
    tab: 0,
    field: 'locador_profissao',
    value: 'Empresário',
    narration: 'Digite a profissão do Locador.',
    label: 'Profissão do Locador',
  },
  {
    tab: 0,
    field: 'locador_endereco',
    value: 'Rua das Flores, 150, Jardim Primavera, São Paulo - SP',
    narration: 'Digite o endereço completo do Locador, incluindo rua, número, bairro e cidade.',
    label: 'Endereço do Locador',
  },
  {
    tab: 0,
    field: 'locador_contato',
    value: '(11) 98765-4321 / joao.santos@email.com',
    narration: 'Insira o telefone e o e-mail do Locador para contato.',
    label: 'Contato do Locador',
  },
  {
    tab: 0,
    field: 'locatario_nome',
    value: 'Maria Oliveira Costa',
    narration: 'Agora vamos preencher os dados do Locatário. O Locatário é quem vai morar ou usar o imóvel. Digite o nome completo.',
    label: 'Nome do Locatário',
  },
  {
    tab: 0,
    field: 'locatario_cpf_cnpj',
    value: '987.654.321-00',
    narration: 'CPF ou CNPJ do Locatário.',
    label: 'CPF do Locatário',
  },
  {
    tab: 0,
    field: 'locatario_rg',
    value: '98.765.432-1',
    narration: 'RG do Locatário.',
    label: 'RG do Locatário',
  },
  {
    tab: 0,
    field: 'locatario_estado_civil',
    value: 'Solteira',
    narration: 'Estado civil do Locatário.',
    label: 'Estado Civil do Locatário',
  },
  {
    tab: 0,
    field: 'locatario_profissao',
    value: 'Professora',
    narration: 'Profissão do Locatário.',
    label: 'Profissão do Locatário',
  },
  {
    tab: 0,
    field: 'locatario_endereco',
    value: 'Av. Brasil, 500, Apto 12, Centro, São Paulo - SP',
    narration: 'Endereço atual completo do Locatário.',
    label: 'Endereço do Locatário',
  },
  {
    tab: 0,
    field: 'locatario_contato',
    value: '(11) 91234-5678 / maria.costa@email.com',
    narration: 'Telefone e e-mail do Locatário.',
    label: 'Contato do Locatário',
  },
  {
    tab: 1, // Imóvel e Prazo
    field: 'endereco_imovel',
    value: 'Rua Ipê Amarelo, 42, Bairro Novo, São Paulo - SP',
    narration: 'Agora vamos para a aba de Imóvel e Prazo. Informe o endereço completo do imóvel que está sendo alugado.',
    label: 'Endereço do Imóvel',
  },
  {
    tab: 1,
    field: 'imovel_tipo',
    value: 'Residencial',
    narration: 'Selecione o tipo de locação: Residencial para moradias, ou Comercial para negócios.',
    label: 'Tipo de Locação',
  },
  {
    tab: 1,
    field: 'imovel_descricao',
    value: 'Casa com 2 quartos, sala de estar, cozinha, 1 banheiro social e área de serviço coberta.',
    narration: 'Descreva detalhadamente o imóvel: quantos quartos, banheiros, garagem, área de serviço e outras características importantes.',
    label: 'Descrição do Imóvel',
  },
  {
    tab: 1,
    field: 'prazo_duracao',
    value: '12 meses',
    narration: 'Informe o prazo do contrato. O prazo mais comum para locação residencial é de 12 meses.',
    label: 'Prazo da Locação',
  },
  {
    tab: 1,
    field: 'data_inicio',
    value: '2024-05-01',
    narration: 'Data de início da locação, quando o Locatário começa a ocupar o imóvel.',
    label: 'Data de Início',
  },
  {
    tab: 1,
    field: 'data_termino',
    value: '2025-05-01',
    narration: 'Data de término prevista do contrato.',
    label: 'Data de Término',
  },
  {
    tab: 2, // Valores
    field: 'valor_aluguel',
    value: '1200',
    narration: 'Aba de Valores. Informe o valor mensal do aluguel em reais. Neste exemplo, mil e duzentos reais.',
    label: 'Valor do Aluguel',
  },
  {
    tab: 2,
    field: 'dia_vencimento',
    value: '10',
    narration: 'Dia do mês em que o aluguel vence. Neste exemplo, todo dia dez.',
    label: 'Dia do Vencimento',
  },
  {
    tab: 2,
    field: 'meio_pagamento',
    value: 'Pix',
    narration: 'Selecione a forma de pagamento combinada entre as partes. Aqui escolhemos Pix.',
    label: 'Meio de Pagamento',
  },
  {
    tab: 2,
    field: 'indice_reajuste',
    value: 'IGPM',
    narration: 'Índice usado para reajustar o aluguel anualmente. O mais comum é o IGPM, que é calculado pela Fundação Getúlio Vargas.',
    label: 'Índice de Reajuste',
  },
  {
    tab: 3, // Garantia
    field: 'tipo_garantia',
    value: 'Caução',
    narration: 'Aba de Garantia. Selecione o tipo de garantia do contrato. A Caução é bastante comum: o Locatário paga antecipado um valor como segurança.',
    label: 'Tipo de Garantia',
  },
  {
    tab: 3,
    field: 'valor_caucao',
    value: '2400',
    narration: 'O valor da Caução normalmente equivale a dois aluguéis. Neste caso, dois mil e quatrocentos reais, que serão devolvidos ao final do contrato caso o imóvel esteja em boas condições.',
    label: 'Valor da Caução',
  },
  {
    tab: 4, // Finalização
    field: 'cidade',
    value: 'São Paulo',
    narration: 'Por último, a aba de Finalização. Informe a cidade onde o contrato está sendo assinado.',
    label: 'Cidade',
  },
  {
    tab: 4,
    field: 'estado',
    value: 'SP',
    narration: 'Estado, usando a sigla.',
    label: 'Estado',
  },
  {
    tab: 4,
    field: 'data_assinatura',
    value: '2024-04-30',
    narration: 'Data em que o contrato será assinado pelas partes.',
    label: 'Data de Assinatura',
  },
  {
    tab: 4,
    field: 'testemunha1_nome',
    value: 'Carlos Eduardo Mendes',
    narration: 'É recomendado ter duas testemunhas. Informe o nome completo da primeira testemunha.',
    label: 'Testemunha 1',
  },
  {
    tab: 4,
    field: 'testemunha1_cpf',
    value: '111.222.333-44',
    narration: 'CPF da primeira testemunha.',
    label: 'CPF Testemunha 1',
  },
  {
    tab: 4,
    field: 'testemunha2_nome',
    value: 'Ana Paula Rodrigues',
    narration: 'Nome completo da segunda testemunha.',
    label: 'Testemunha 2',
  },
  {
    tab: 4,
    field: 'testemunha2_cpf',
    value: '555.666.777-88',
    narration: 'CPF da segunda testemunha.',
    label: 'CPF Testemunha 2',
  },
  {
    tab: 4,
    field: null,
    value: null,
    narration: 'Pronto! O Contrato de Locação está completamente preenchido. Você pode visualizar o documento no preview ao lado, e quando quiser, clique em Baixar PDF para obter o seu contrato profissional. Boa sorte!',
    label: 'Conclusão ✅',
  },
];

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================
const TutorialContrato = ({ onClose, onApplyData }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [displayedValues, setDisplayedValues] = useState({});
  const [caption, setCaption] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [progress, setProgress] = useState(0);

  const typewriterRef = useRef(null);
  const utteranceRef = useRef(null);
  const captionIndexRef = useRef(0);
  const captionTimerRef = useRef(null);

  const totalSteps = TUTORIAL_STEPS.length;
  const step = TUTORIAL_STEPS[currentStep];

  // ---- Utilitário: parar tudo ----
  const stopAll = useCallback(() => {
    if (typewriterRef.current) clearInterval(typewriterRef.current);
    if (captionTimerRef.current) clearInterval(captionTimerRef.current);
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setIsTyping(false);
    setIsSpeaking(false);
  }, []);

  // ---- Narração por voz ----
  const speak = useCallback((text) => {
    if (!voiceEnabled || !window.speechSynthesis) return;

    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'pt-BR';
    utter.rate = 0.9;
    utter.pitch = 1.0;

    // Tenta usar voz em português
    const voices = window.speechSynthesis.getVoices();
    const ptVoice = voices.find(v => v.lang.startsWith('pt'));
    if (ptVoice) utter.voice = ptVoice;

    utter.onstart = () => setIsSpeaking(true);
    utter.onend = () => setIsSpeaking(false);
    utteranceRef.current = utter;
    window.speechSynthesis.speak(utter);
  }, [voiceEnabled]);

  // ---- Animação de legenda (simula karaokê) ----
  const animateCaption = useCallback((text) => {
    setCaption('');
    captionIndexRef.current = 0;
    if (captionTimerRef.current) clearInterval(captionTimerRef.current);

    const words = text.split(' ');
    let wordIndex = 0;
    const msPerWord = (text.length / words.length) * 60; // velocidade proporcional

    captionTimerRef.current = setInterval(() => {
      if (wordIndex >= words.length) {
        clearInterval(captionTimerRef.current);
        return;
      }
      setCaption(prev => prev + (wordIndex === 0 ? '' : ' ') + words[wordIndex]);
      wordIndex++;
    }, msPerWord);
  }, []);

  // ---- Efeito Typewriter para um campo ----
  const typeField = useCallback((fieldName, fullValue, onDone) => {
    if (!fieldName) {
      if (onDone) setTimeout(onDone, 500);
      return;
    }

    setIsTyping(true);
    let i = 0;

    if (typewriterRef.current) clearInterval(typewriterRef.current);

    typewriterRef.current = setInterval(() => {
      i++;
      const partial = fullValue.slice(0, i);
      setDisplayedValues(prev => ({ ...prev, [fieldName]: partial }));

      if (i >= fullValue.length) {
        clearInterval(typewriterRef.current);
        setIsTyping(false);
        if (onDone) setTimeout(onDone, 400);
      }
    }, 45);
  }, []);

  // ---- Executar passo atual ----
  const runStep = useCallback((stepIndex) => {
    stopAll();
    const s = TUTORIAL_STEPS[stepIndex];
    setActiveTab(s.tab);
    setProgress(Math.round(((stepIndex + 1) / totalSteps) * 100));

    // Narra e anima legenda
    speak(s.narration);
    animateCaption(s.narration);

    // Typewriter no campo
    if (s.field && s.value) {
      // Pequeno delay para a narração começar primeiro
      setTimeout(() => {
        typeField(s.field, s.value, () => {
          // Propaga ao App.js após completar
          onApplyData(prev => ({ ...prev, [s.field]: s.value }));
        });
      }, 600);
    } else if (s.value === null && s.field === null) {
      // Passo de narração pura (intro/conclusão)
    }
  }, [stopAll, speak, animateCaption, typeField, onApplyData, totalSteps]);

  // ---- Auto-avançar quando a narração termina ----
  // (Neste modelo o usuário controla manualmente com os botões)

  // Inicia o primeiro passo
  useEffect(() => {
    runStep(0);
    return () => stopAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goNext = () => {
    if (currentStep < totalSteps - 1) {
      const next = currentStep + 1;
      setCurrentStep(next);
      runStep(next);
    }
  };

  const goPrev = () => {
    if (currentStep > 0) {
      const prev = currentStep - 1;
      setCurrentStep(prev);
      runStep(prev);
    }
  };

  const togglePause = () => {
    if (!window.speechSynthesis) return;
    if (isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
    } else {
      window.speechSynthesis.pause();
      setIsPaused(true);
    }
  };

  const toggleVoice = () => {
    if (voiceEnabled) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
    setVoiceEnabled(v => !v);
  };

  const TAB_NAMES = ['Partes', 'Imóvel e Prazo', 'Valores', 'Garantia', 'Finalização'];

  // Campos de cada aba para exibição no tutorial
  const ABA_CAMPOS = [
    [
      { key: 'locador_nome', label: 'Nome do Locador' },
      { key: 'locador_cpf_cnpj', label: 'CPF/CNPJ' },
      { key: 'locador_rg', label: 'RG' },
      { key: 'locador_estado_civil', label: 'Estado Civil' },
      { key: 'locador_profissao', label: 'Profissão' },
      { key: 'locador_endereco', label: 'Endereço' },
      { key: 'locador_contato', label: 'Contato' },
      { key: null, label: '─── Locatário ───', divider: true },
      { key: 'locatario_nome', label: 'Nome do Locatário' },
      { key: 'locatario_cpf_cnpj', label: 'CPF/CNPJ' },
      { key: 'locatario_rg', label: 'RG' },
      { key: 'locatario_estado_civil', label: 'Estado Civil' },
      { key: 'locatario_profissao', label: 'Profissão' },
      { key: 'locatario_endereco', label: 'Endereço' },
      { key: 'locatario_contato', label: 'Contato' },
    ],
    [
      { key: 'endereco_imovel', label: 'Endereço do Imóvel' },
      { key: 'imovel_tipo', label: 'Tipo' },
      { key: 'imovel_descricao', label: 'Descrição' },
      { key: 'prazo_duracao', label: 'Prazo' },
      { key: 'data_inicio', label: 'Data Início' },
      { key: 'data_termino', label: 'Data Término' },
    ],
    [
      { key: 'valor_aluguel', label: 'Valor do Aluguel (R$)' },
      { key: 'dia_vencimento', label: 'Dia do Vencimento' },
      { key: 'meio_pagamento', label: 'Meio de Pagamento' },
      { key: 'indice_reajuste', label: 'Índice de Reajuste' },
    ],
    [
      { key: 'tipo_garantia', label: 'Tipo de Garantia' },
      { key: 'valor_caucao', label: 'Valor da Caução (R$)' },
    ],
    [
      { key: 'cidade', label: 'Cidade' },
      { key: 'estado', label: 'Estado' },
      { key: 'data_assinatura', label: 'Data de Assinatura' },
      { key: 'testemunha1_nome', label: 'Testemunha 1' },
      { key: 'testemunha1_cpf', label: 'CPF Testemunha 1' },
      { key: 'testemunha2_nome', label: 'Testemunha 2' },
      { key: 'testemunha2_cpf', label: 'CPF Testemunha 2' },
    ],
  ];

  const currentFields = ABA_CAMPOS[activeTab] || [];

  return (
    <div className="tutorial-overlay">
      <div className="tutorial-modal">

        {/* ── HEADER ── */}
        <div className="tutorial-header">
          <div className="tutorial-header-left">
            <span className="tutorial-badge">▶ TUTORIAL</span>
            <h2 className="tutorial-title">Contrato de Locação</h2>
          </div>
          <div className="tutorial-header-right">
            <button
              className={`tutorial-voice-btn ${voiceEnabled ? 'active' : ''}`}
              onClick={toggleVoice}
              title={voiceEnabled ? 'Desativar voz' : 'Ativar voz'}
            >
              {voiceEnabled ? '🔊' : '🔇'}
            </button>
            <button className="tutorial-close-btn" onClick={() => { stopAll(); onClose(); }}>
              ✕ Fechar
            </button>
          </div>
        </div>

        {/* ── BARRA DE PROGRESSO ── */}
        <div className="tutorial-progress-bar">
          <div className="tutorial-progress-fill" style={{ width: `${progress}%` }} />
        </div>

        {/* ── CORPO ── */}
        <div className="tutorial-body">

          {/* ── PAINEL FORMULÁRIO ── */}
          <div className="tutorial-form-panel">
            {/* Abas */}
            <div className="tutorial-tabs">
              {TAB_NAMES.map((name, i) => (
                <button
                  key={i}
                  className={`tutorial-tab ${activeTab === i ? 'active' : ''} ${
                    // marca abas já visitadas
                    TUTORIAL_STEPS.slice(0, currentStep + 1).some(s => s.tab === i) ? 'visited' : ''
                  }`}
                  onClick={() => setActiveTab(i)}
                >
                  {name}
                </button>
              ))}
            </div>

            {/* Campos */}
            <div className="tutorial-fields">
              {currentFields.map((campo, idx) => {
                if (campo.divider) {
                  return <div key={idx} className="tutorial-divider">{campo.label}</div>;
                }
                const isCurrentField = step.field === campo.key && isTyping;
                const hasValue = displayedValues[campo.key];
                return (
                  <div
                    key={idx}
                    className={`tutorial-field-row ${isCurrentField ? 'highlighting' : ''} ${hasValue ? 'filled' : ''}`}
                  >
                    <label className="tutorial-field-label">{campo.label}</label>
                    <div className="tutorial-field-value">
                      {isCurrentField
                        ? displayedValues[campo.key]
                        : hasValue}
                      {isCurrentField && <span className="tutorial-cursor">|</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── PAINEL INFO ── */}
          <div className="tutorial-info-panel">
            {/* Passo atual */}
            <div className="tutorial-step-card">
              <div className="tutorial-step-number">
                Passo {currentStep + 1} de {totalSteps}
              </div>
              <div className="tutorial-step-label">{step.label}</div>
              <div className="tutorial-step-narration">{step.narration}</div>
            </div>

            {/* Mini checklist de passos */}
            <div className="tutorial-steps-list">
              {TUTORIAL_STEPS.map((s, i) => (
                <div
                  key={i}
                  className={`tutorial-step-item ${i === currentStep ? 'current' : ''} ${i < currentStep ? 'done' : ''}`}
                  onClick={() => { setCurrentStep(i); runStep(i); }}
                >
                  <span className="tutorial-step-dot">
                    {i < currentStep ? '✓' : i === currentStep ? '▶' : '○'}
                  </span>
                  <span className="tutorial-step-item-label">{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── LEGENDA ── */}
        <div className="tutorial-caption-bar">
          <div className="tutorial-caption-icon">💬</div>
          <div className="tutorial-caption-text">
            {caption || step.narration}
          </div>
          {isSpeaking && (
            <div className="tutorial-speaking-indicator">
              <span/><span/><span/>
            </div>
          )}
        </div>

        {/* ── CONTROLES ── */}
        <div className="tutorial-controls">
          <button
            className="tutorial-ctrl-btn secondary"
            onClick={goPrev}
            disabled={currentStep === 0}
          >
            ⏮ Anterior
          </button>

          <button
            className="tutorial-ctrl-btn pause"
            onClick={togglePause}
            disabled={!isSpeaking && !isPaused}
          >
            {isPaused ? '▶ Continuar' : '⏸ Pausar'}
          </button>

          <button
            className="tutorial-ctrl-btn primary"
            onClick={goNext}
            disabled={currentStep === totalSteps - 1}
          >
            Próximo ⏭
          </button>
        </div>

      </div>
    </div>
  );
};

export default TutorialContrato;
