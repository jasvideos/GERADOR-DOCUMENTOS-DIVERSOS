import React, { useState } from 'react';
import BasicStep from './steps/BasicStep';
import LessorStep from './steps/LessorStep';
import LesseeStep from './steps/LesseeStep';
import PropertyStep from './steps/PropertyStep';
import PaymentStep from './steps/PaymentStep';
import GuaranteeStep from './steps/GuaranteeStep';
import ClausesStep from './steps/ClausesStep';

const steps = [
  { id: 1, name: 'BÁSICO' },
  { id: 2, name: 'LOCADOR' },
  { id: 3, name: 'LOCATÁRIO' },
  { id: 4, name: 'IMÓVEL' },
  { id: 5, name: 'PAGAMENTO' },
  { id: 6, name: 'GARANTIA' },
  { id: 7, name: 'CLÁUSULAS' },
];

const MultiStepForm = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({});

  const nextStep = () => setCurrentStep((prev) => (prev < steps.length ? prev + 1 : prev));
  const prevStep = () => setCurrentStep((prev) => (prev > 1 ? prev - 1 : prev));
  const goToStep = (step) => setCurrentStep(step);

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <BasicStep data={formData} setData={setFormData} />;
      case 2:
        return <LessorStep data={formData} setData={setFormData} />;
      case 3:
        return <LesseeStep data={formData} setData={setFormData} />;
      case 4:
        return <PropertyStep data={formData} setData={setFormData} />;
      case 5:
        return <PaymentStep data={formData} setData={setFormData} />;
      case 6:
        return <GuaranteeStep data={formData} setData={setFormData} />;
      case 7:
        return <ClausesStep data={formData} setData={setFormData} />;
      default:
        return <BasicStep data={formData} setData={setFormData} />;
    }
  };

  return (
    <div className="form-container">
      <div className="header">
        <div>
            <h1>NOVO CONTRATO</h1>
            <p>PREENCHA OS PASSOS PARA GERAR O DOCUMENTO</p>
        </div>
        <button className="reset-btn">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4C7.58 4 4.01 7.58 4.01 12C4.01 16.42 7.58 20 12 20C15.73 20 18.84 17.45 19.73 14H17.65C16.83 16.33 14.61 18 12 18C8.69 18 6 15.31 6 12C6 8.69 8.69 6 12 6C13.66 6 15.14 6.69 16.22 7.78L13 11H20V4L17.65 6.35Z" fill="currentColor"/>
          </svg>
        </button>
      </div>
      <div className="step-indicator">
        {steps.map((step) => (
          <div
            key={step.id}
            className={`step ${currentStep === step.id ? 'active' : ''}`}
            onClick={() => goToStep(step.id)}
          >
            <div className="step-number">{step.id}</div>
            <div className="step-name">{step.name}</div>
          </div>
        ))}
      </div>
      <div className="step-content">
        {renderStep()}
      </div>
    </div>
  );
};

export default MultiStepForm;
