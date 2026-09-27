import React from "react";
import { Link } from "react-router-dom";

const PriorityChart = ({ tasks }) => {
  const total = tasks.length;
  const importantCount = tasks.filter((task) => task.importante).length;
  const normalCount = total - importantCount;
  const maxCount = Math.max(importantCount, normalCount, 1);

  return (
    <div className="chart-page">
      <div className="chart-content">
        <h2>Importante x Normal</h2>

        {total === 0 ? (
          <div className="empty-state">
            <h3>Nenhuma tarefa cadastrada ainda</h3>
            <p>Adicione tarefas para ver o gráfico de prioridade.</p>
          </div>
        ) : (
          <div className="priority-chart">
            <div className="chart-bar-group">
              <span className="chart-bar-value">{importantCount}</span>
              <div className="chart-bar-track">
                <div
                  className="chart-bar chart-bar-important"
                  style={{ height: `${(importantCount / maxCount) * 100}%` }}
                />
              </div>
              <span className="chart-bar-label">Importante</span>
            </div>

            <div className="chart-bar-group">
              <span className="chart-bar-value">{normalCount}</span>
              <div className="chart-bar-track">
                <div
                  className="chart-bar chart-bar-normal"
                  style={{ height: `${(normalCount / maxCount) * 100}%` }}
                />
              </div>
              <span className="chart-bar-label">Normal</span>
            </div>
          </div>
        )}
      </div>

      <div className="chart-footer">
        <Link to="/" className="back-button">
          ← Voltar
        </Link>
      </div>
    </div>
  );
};

export default PriorityChart;
