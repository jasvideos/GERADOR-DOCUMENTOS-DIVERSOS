import React, { useState, useEffect, useRef, useCallback } from 'react';
import './TutorialContrato.css'; // Reutiliza os mesmos estilos

// ============================================================
// DADOS DO TUTORIAL — CURRÍCULO
// ============================================================
const TUTORIAL_STEPS = [
  {
    tab: 'Dados Pessoais',
    field: null,
    value: null,
    narration: 'Bem-vindo ao tutorial de preenchimento do Currículo Profissional! Vou te guiar por cada seção para criar um currículo completo e moderno. E uma dica especial: você pode escolher entre 5 modelos visuais diferentes. Vamos começar!',
    label: 'Introdução',
    isModelAlert: false,
  },
  {
    tab: 'Dados Pessoais',
    field: null,
    value: null,
    narration: 'Primeiro, uma dica importante! No topo do formulário, você encontra os botões de modelo: Clássico, Moderno, Criativo, Executivo e Primeiro Emprego. Cada um tem um visual diferente para o PDF. Escolha o que mais combina com você antes de baixar!',
    label: '🎨 Dica: Modelos Disponíveis',
    isModelAlert: true,
  },
  {
    tab: 'Dados Pessoais',
    field: 'nome',
    value: 'Ana Carolina Ferreira',
    narration: 'Na aba de Dados Pessoais, comece digitando seu nome completo. Use seu nome como aparece nos documentos oficiais.',
    label: 'Nome Completo',
  },
  {
    tab: 'Dados Pessoais',
    field: 'cargo_desejado',
    value: 'Analista de Marketing Digital',
    narration: 'Informe o cargo que está buscando. Seja específico: em vez de apenas "analista", coloque a área, como Analista de Marketing Digital.',
    label: 'Cargo Desejado',
  },
  {
    tab: 'Dados Pessoais',
    field: 'email',
    value: 'ana.ferreira@email.com',
    narration: 'Coloque um e-mail profissional. Evite apelidos ou nomes informais. Se possível, crie um e-mail só com seu nome.',
    label: 'E-mail',
  },
  {
    tab: 'Dados Pessoais',
    field: 'telefone',
    value: '(11) 98765-4321',
    narration: 'Telefone para contato. Inclua o DDD e, de preferência, um número de WhatsApp ativo.',
    label: 'Telefone',
  },
  {
    tab: 'Dados Pessoais',
    field: 'cidade',
    value: 'São Paulo',
    narration: 'Informe sua cidade e estado.',
    label: 'Cidade',
  },
  {
    tab: 'Dados Pessoais',
    field: 'linkedin',
    value: 'linkedin.com/in/anacarolinaferreira',
    narration: 'Se tiver um perfil no LinkedIn, inclua o link. Isso aumenta muito suas chances de ser chamado para uma entrevista!',
    label: 'LinkedIn',
  },
  {
    tab: 'Resumo',
    field: 'resumo',
    value: 'Profissional com 4 anos de experiência em marketing digital, especializada em gestão de redes sociais, criação de conteúdo e análise de métricas. Orientada a resultados, com histórico comprovado de aumento de engajamento e geração de leads qualificados.',
    narration: 'Na aba de Resumo Profissional, escreva um parágrafo curto sobre você. Mas temos um atalho muito útil! Veja o botão "Ver Modelos" ao lado do título. Clicando nele, aparecem cinco opções de resumo pré-definidos — como Primeiro Emprego, Profissional Experiente, Gestão e Liderança ou Criativo — que você pode usar como base e personalizar. Muito mais rápido!',
    label: 'Resumo Profissional',
  },
  {
    tab: 'Experiência',
    field: null,
    value: null,
    narration: 'Na aba de Experiência Profissional, você verá um botão azul redondo com o símbolo de mais, no canto direito do título. Clique nele cada vez que quiser adicionar uma nova empresa. Para cada empresa, preencha o nome, o cargo que ocupou e o período. Pode clicar o botão quantas vezes for necessário para adicionar todas as suas experiências!',
    label: '➕ Aba: Experiência (botão +)',
  },
  {
    tab: 'Formação',
    field: null,
    value: null,
    narration: 'Na aba de Formação Acadêmica funciona exatamente igual! O botão azul com o sinal de mais adiciona um novo curso. Clique nele para cada faculdade, curso técnico ou certificação que quiser incluir, preenchendo a instituição, o nome do curso e o período. Você pode adicionar quantas formações precisar!',
    label: '➕ Aba: Formação (botão +)',
  },
  {
    tab: 'Idiomas',
    field: null,
    value: null,
    narration: 'Em Idiomas, liste os idiomas que você fala e o seu nível: Básico, Intermediário, Avançado ou Fluente. Inglês intermediário já é um diferencial para muitas vagas!',
    label: 'Aba: Idiomas',
  },
  {
    tab: 'Habilidades',
    field: null,
    value: null,
    narration: 'Na aba de Habilidades, não precisa digitar nada! Já existem mais de trinta botões de habilidades pré-definidas esperando por você. Estão divididas em comportamentais, como Liderança, Comunicação eficaz e Proatividade, e técnicas, como Microsoft Excel, Atendimento ao cliente, Vendas e Redes Sociais. É só clicar nas que você tem e elas aparecem no currículo automaticamente!',
    label: '💪 Aba: Habilidades (chips)',
  },
  {
    tab: 'Habilidades',
    field: null,
    value: null,
    narration: 'Pronto! Agora não esqueça: antes de baixar, experimente mudar o modelo do currículo. Clique nos botões Moderno, Executivo ou Criativo para ver qual visual fica melhor com seu perfil. Depois clique em Baixar PDF para ter seu currículo profissional!',
    label: '✅ Conclusão e Modelos',
    isModelAlert: true,
  },
];

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================
const TutorialCurriculo = ({ onClose, onApplyData }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [displayedValues, setDisplayedValues] = useState({});
  const [caption, setCaption] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [activeTab, setActiveTab] = useState('Dados Pessoais');
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [progress, setProgress] = useState(0);

  const typewriterRef = useRef(null);
  const captionTimerRef = useRef(null);

  const totalSteps = TUTORIAL_STEPS.length;
  const step = TUTORIAL_STEPS[currentStep];

  const stopAll = useCallback(() => {
    if (typewriterRef.current) clearInterval(typewriterRef.current);
    if (captionTimerRef.current) clearInterval(captionTimerRef.current);
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setIsTyping(false);
    setIsSpeaking(false);
  }, []);

  const speak = useCallback((text) => {
    if (!voiceEnabled || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = 'pt-BR';
    utter.rate = 0.9;
    utter.pitch = 1.0;
    const voices = window.speechSynthesis.getVoices();
    const ptVoice = voices.find(v => v.lang.startsWith('pt'));
    if (ptVoice) utter.voice = ptVoice;
    utter.onstart = () => setIsSpeaking(true);
    utter.onend = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utter);
  }, [voiceEnabled]);

  const animateCaption = useCallback((text) => {
    setCaption('');
    if (captionTimerRef.current) clearInterval(captionTimerRef.current);
    const words = text.split(' ');
    let wordIndex = 0;
    const msPerWord = (text.length / words.length) * 60;
    captionTimerRef.current = setInterval(() => {
      if (wordIndex >= words.length) { clearInterval(captionTimerRef.current); return; }
      setCaption(prev => prev + (wordIndex === 0 ? '' : ' ') + words[wordIndex]);
      wordIndex++;
    }, msPerWord);
  }, []);

  const typeField = useCallback((fieldName, fullValue, onDone) => {
    if (!fieldName) { if (onDone) setTimeout(onDone, 500); return; }
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

  const runStep = useCallback((stepIndex) => {
    stopAll();
    const s = TUTORIAL_STEPS[stepIndex];
    setActiveTab(s.tab);
    setProgress(Math.round(((stepIndex + 1) / totalSteps) * 100));
    speak(s.narration);
    animateCaption(s.narration);
    if (s.field && s.value) {
      setTimeout(() => {
        typeField(s.field, s.value, () => {
          onApplyData(prev => ({ ...prev, [s.field]: s.value }));
        });
      }, 600);
    }
  }, [stopAll, speak, animateCaption, typeField, onApplyData, totalSteps]);

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
    if (isPaused) { window.speechSynthesis.resume(); setIsPaused(false); }
    else { window.speechSynthesis.pause(); setIsPaused(true); }
  };

  const toggleVoice = () => {
    if (voiceEnabled) { window.speechSynthesis.cancel(); setIsSpeaking(false); }
    setVoiceEnabled(v => !v);
  };

  const TAB_NAMES = ['Dados Pessoais', 'Resumo', 'Experiência', 'Formação', 'Idiomas', 'Habilidades'];

  const ABA_CAMPOS = {
    'Dados Pessoais': [
      { key: 'nome', label: 'Nome Completo' },
      { key: 'cargo_desejado', label: 'Cargo Desejado' },
      { key: 'email', label: 'E-mail' },
      { key: 'telefone', label: 'Telefone' },
      { key: 'cidade', label: 'Cidade' },
      { key: 'linkedin', label: 'LinkedIn' },
    ],
    'Resumo': [
      { key: 'resumo', label: 'Resumo Profissional' },
    ],
    'Experiência': [
      { key: null, label: 'Clique no botão ➕ azul ao lado do título para adicionar uma experiência', info: true },
      { key: null, label: 'Preencha: Empresa, Cargo e Período (ex: 2020 - 2022)', info: true },
      { key: null, label: 'Clique o botão + novamente para cada empresa diferente', info: true },
      { key: null, label: 'Use o 🗑️ para remover uma entrada adicionada por engano', info: true },
    ],
    'Formação': [
      { key: null, label: 'Mesmo funcionamento da Experiência: clique ➕ para adicionar', info: true },
      { key: null, label: 'Preencha: Instituição, Curso e Período', info: true },
      { key: null, label: 'Inclua faculdades, cursos técnicos e certificações', info: true },
    ],
    'Idiomas': [
      { key: null, label: 'Liste os idiomas e seu nível', info: true },
      { key: null, label: 'Básico, Intermediário, Avançado ou Fluente', info: true },
    ],
    'Habilidades': [
      { key: null, label: '✅ Clique nos chips para selecionar suas habilidades', info: true },
      { key: null, label: 'Comportamentais: Liderança, Comunicação, Proatividade...', info: true },
      { key: null, label: 'Técnicas: Excel, Word, Atendimento, Vendas, Redes Sociais...', info: true },
      { key: null, label: 'São mais de 30 opções pré-definidas para escolher!', info: true },
    ],
  };

  const currentFields = ABA_CAMPOS[activeTab] || [];
  const MODELOS = ['Clássico', 'Moderno', 'Criativo', 'Executivo', '1º Emprego'];

  return (
    <div className="tutorial-overlay">
      <div className="tutorial-modal">

        {/* HEADER */}
        <div className="tutorial-header" style={{ background: 'linear-gradient(135deg, #064e3b 0%, #1e293b 100%)' }}>
          <div className="tutorial-header-left">
            <span className="tutorial-badge" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>▶ TUTORIAL</span>
            <h2 className="tutorial-title">Currículo Profissional</h2>
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

        {/* BARRA DE PROGRESSO */}
        <div className="tutorial-progress-bar">
          <div className="tutorial-progress-fill" style={{
            width: `${progress}%`,
            background: 'linear-gradient(90deg, #10b981, #059669, #34d399)'
          }} />
        </div>

        {/* CORPO */}
        <div className="tutorial-body">

          {/* PAINEL FORMULÁRIO */}
          <div className="tutorial-form-panel">

            {/* ALERTA DE MODELOS */}
            {step.isModelAlert && (
              <div className="tutorial-model-alert">
                <span className="tutorial-model-alert-icon">🎨</span>
                <div>
                  <strong>Escolha o modelo do seu currículo!</strong>
                  <div className="tutorial-model-pills">
                    {MODELOS.map(m => (
                      <span key={m} className="tutorial-model-pill">{m}</span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Abas */}
            <div className="tutorial-tabs">
              {TAB_NAMES.map((name) => (
                <button
                  key={name}
                  className={`tutorial-tab ${activeTab === name ? 'active' : ''} ${
                    TUTORIAL_STEPS.slice(0, currentStep + 1).some(s => s.tab === name) ? 'visited' : ''
                  }`}
                  style={activeTab === name ? { borderBottomColor: '#10b981', color: '#6ee7b7' } : {}}
                  onClick={() => setActiveTab(name)}
                >
                  {name}
                </button>
              ))}
            </div>

            {/* Campos */}
            <div className="tutorial-fields">
              {currentFields.map((campo, idx) => {
                if (campo.info) {
                  return (
                    <div key={idx} className="tutorial-info-hint">
                      ✦ {campo.label}
                    </div>
                  );
                }
                const isCurrentField = step.field === campo.key && isTyping;
                const hasValue = displayedValues[campo.key];
                return (
                  <div
                    key={idx}
                    className={`tutorial-field-row ${isCurrentField ? 'highlighting' : ''} ${hasValue ? 'filled' : ''}`}
                    style={isCurrentField ? {
                      background: 'rgba(16, 185, 129, 0.12)',
                      borderColor: 'rgba(16, 185, 129, 0.4)',
                      boxShadow: '0 0 12px rgba(16, 185, 129, 0.2)',
                    } : hasValue ? { borderColor: 'rgba(16, 185, 129, 0.25)' } : {}}
                  >
                    <label className="tutorial-field-label">{campo.label}</label>
                    <div className="tutorial-field-value">
                      {isCurrentField ? displayedValues[campo.key] : hasValue}
                      {isCurrentField && <span className="tutorial-cursor" style={{ color: '#10b981' }}>|</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* PAINEL INFO */}
          <div className="tutorial-info-panel">
            <div className="tutorial-step-card" style={{ background: 'rgba(16, 185, 129, 0.08)' }}>
              <div className="tutorial-step-number" style={{ color: '#10b981' }}>
                Passo {currentStep + 1} de {totalSteps}
              </div>
              <div className="tutorial-step-label">{step.label}</div>
              <div className="tutorial-step-narration">{step.narration}</div>
            </div>

            <div className="tutorial-steps-list">
              {TUTORIAL_STEPS.map((s, i) => (
                <div
                  key={i}
                  className={`tutorial-step-item ${i === currentStep ? 'current' : ''} ${i < currentStep ? 'done' : ''}`}
                  style={i === currentStep ? { background: 'rgba(16, 185, 129, 0.15)', borderColor: 'rgba(16, 185, 129, 0.3)' } : {}}
                  onClick={() => { setCurrentStep(i); runStep(i); }}
                >
                  <span className="tutorial-step-dot" style={i === currentStep ? { color: '#10b981' } : {}}>
                    {i < currentStep ? '✓' : i === currentStep ? '▶' : '○'}
                  </span>
                  <span className="tutorial-step-item-label">{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* LEGENDA */}
        <div className="tutorial-caption-bar">
          <div className="tutorial-caption-icon">💬</div>
          <div className="tutorial-caption-text">{caption || step.narration}</div>
          {isSpeaking && (
            <div className="tutorial-speaking-indicator">
              <span style={{ background: '#10b981' }} /><span style={{ background: '#10b981' }} /><span style={{ background: '#10b981' }} />
            </div>
          )}
        </div>

        {/* CONTROLES */}
        <div className="tutorial-controls">
          <button className="tutorial-ctrl-btn secondary" onClick={goPrev} disabled={currentStep === 0}>
            ⏮ Anterior
          </button>
          <button className="tutorial-ctrl-btn pause" onClick={togglePause} disabled={!isSpeaking && !isPaused}>
            {isPaused ? '▶ Continuar' : '⏸ Pausar'}
          </button>
          <button
            className="tutorial-ctrl-btn primary"
            onClick={goNext}
            disabled={currentStep === totalSteps - 1}
            style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
          >
            Próximo ⏭
          </button>
        </div>

      </div>
    </div>
  );
};

export default TutorialCurriculo;
