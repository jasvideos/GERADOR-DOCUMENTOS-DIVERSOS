import React from 'react';

const BasicStep = ({ data, setData }) => {
  return (
    <div>
      <div className="form-row">
        <div className="form-group">
          <label>TIPO DE IMÓVEL</label>
          <select
            value={data.propertyType || ''}
            onChange={(e) => setData({ ...data, propertyType: e.target.value })}
          >
            <option value="Comercial">Comercial</option>
            <option value="Residencial">Residencial</option>
          </select>
        </div>
        <div className="form-group">
          <label>DURAÇÃO (MESES)</label>
          <input
            type="number"
            value={data.duration || '12'}
            onChange={(e) => setData({ ...data, duration: e.target.value })}
          />
        </div>
        <div className="form-group">
          <label>DATA DE INÍCIO</label>
          <input
            type="text"
            placeholder="dd/mm/aaaa"
            value={data.startDate || ''}
            onChange={(e) => setData({ ...data, startDate: e.target.value })}
          />
        </div>
      </div>
      <div className="form-actions">
        <button className="next-btn">PRÓXIMO</button>
      </div>
    </div>
  );
};

export default BasicStep;
