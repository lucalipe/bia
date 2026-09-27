import React, { useRef, useState } from "react";
import Modal from "./Modal";

// Converte uma data no formato nativo do input[type=date] (aaaa-mm-dd)
// para o formato usado pela BIA (dd/mm/aaaa).
const formatarDataBR = (dataIso) => {
  if (!dataIso) return "";
  const [ano, mes, dia] = dataIso.split("-");
  return `${dia}/${mes}/${ano}`;
};

const AddTask = ({ onAdd }) => {
  const [titulo, setTitulo] = useState("");
  const [dia, setDia] = useState("");
  const [dataIso, setDataIso] = useState("");
  const [importante, setImportante] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const dateInputRef = useRef(null);

  const abrirCalendario = () => {
    if (dateInputRef.current?.showPicker) {
      dateInputRef.current.showPicker();
    } else {
      dateInputRef.current?.focus();
    }
  };

  const onDateChange = (e) => {
    const valor = e.target.value;
    setDataIso(valor);
    setDia(formatarDataBR(valor));
  };

  const onSubmit = (e) => {
    e.preventDefault();

    if (!titulo.trim()) {
      setShowModal(true);
      return;
    }

    onAdd({
      titulo: titulo.trim(),
      dia_atividade: dia || new Date().toLocaleDateString('pt-BR'),
      importante
    });

    setTitulo("");
    setDia("");
    setDataIso("");
    setImportante(false);
  };

  return (
    <form className="add-form" onSubmit={onSubmit}>
      <div className="form-control">
        <label>Tarefa</label>
        <input
          type="text"
          placeholder="O que você precisa fazer?"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
        />
      </div>
      
      <div className="form-control">
        <label>Data/Prazo</label>
        <div className="date-picker-field">
          <input
            type="text"
            placeholder="Quando?"
            value={dia}
            readOnly
            onClick={abrirCalendario}
          />
          <input
            type="date"
            ref={dateInputRef}
            value={dataIso}
            onChange={onDateChange}
            className="date-picker-hidden"
            tabIndex={-1}
            aria-hidden="true"
          />
        </div>
      </div>
      
      <div className="form-control-check">
        <input
          type="checkbox"
          id="importante"
          checked={importante}
          onChange={(e) => setImportante(e.target.checked)}
        />
        <label htmlFor="importante">Importante</label>
      </div>
      
      <button type="submit" className="btn btn-block success">
        Adicionar Task dominio CDN com cloudfront + Agentes de IA & Multi Agentic
      </button>
      
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Campo obrigatório"
        message="Por favor, adicione uma descrição para a tarefa"
        type="warning"
      />
    </form>
  );
};

export default AddTask;
