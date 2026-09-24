import React, { useState } from "react";
import { FaTimes, FaStar, FaRegStar, FaEdit, FaCheck, FaCheckCircle, FaRegCircle } from "react-icons/fa";
import Modal from "./Modal";

const Task = ({ task, onDelete, onToggle, onToggleConcluida, onEditTitulo }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitulo, setEditedTitulo] = useState(task.titulo);
  const [showModal, setShowModal] = useState(false);

  const startEditing = () => {
    if (task.concluida) return;
    setEditedTitulo(task.titulo);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setEditedTitulo(task.titulo);
    setIsEditing(false);
  };

  const confirmEditing = () => {
    const tituloTrimmed = editedTitulo.trim();

    if (!tituloTrimmed) {
      setShowModal(true);
      return;
    }

    onEditTitulo(task.uuid, tituloTrimmed);
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      confirmEditing();
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancelEditing();
    }
  };

  return (
    <div
      className={`task ${task.importante ? "reminder" : ""} ${task.concluida ? "completed" : ""}`}
      onDoubleClick={() => !isEditing && onToggle(task.uuid)}
    >
      <div className="task-content">
        {isEditing ? (
          <input
            type="text"
            className="task-edit-input"
            value={editedTitulo}
            onChange={(e) => setEditedTitulo(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
          />
        ) : (
          <h3>{task.titulo}</h3>
        )}
        <p className="task-date">
          📅 {task.dia_atividade || "Sem data definida"}
        </p>
      </div>
      <div className="task-actions">
        {isEditing ? (
          <>
            <button
              className="task-save"
              onClick={confirmEditing}
              title="Salvar"
            >
              <FaCheck />
            </button>
            <button
              className="task-cancel"
              onClick={cancelEditing}
              title="Cancelar"
            >
              <FaTimes />
            </button>
          </>
        ) : (
          <>
            <button
              className="task-conclude"
              onClick={() => onToggleConcluida(task.uuid)}
              title={task.concluida ? "Desmarcar como concluída" : "Marcar como concluída"}
            >
              {task.concluida ? <FaCheckCircle /> : <FaRegCircle />}
            </button>
            <button
              className="task-edit"
              onClick={startEditing}
              disabled={task.concluida}
              title={task.concluida ? "Tarefa concluída: título não pode ser editado" : "Editar título"}
            >
              <FaEdit />
            </button>
            <button
              className="task-priority"
              onClick={() => onToggle(task.uuid)}
              title={task.importante ? "Remover importante" : "Marcar importante"}
            >
              {task.importante ? <FaStar /> : <FaRegStar />}
            </button>
            <button
              className="task-delete"
              onClick={() => onDelete(task.uuid)}
              title="Excluir"
            >
              <FaTimes />
            </button>
          </>
        )}
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Campo obrigatório"
        message="O título da tarefa não pode ficar vazio"
        type="warning"
      />
    </div>
  );
};

export default Task;
