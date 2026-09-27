import React from "react";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer>
      <div className="footer-content">
        <p>Formação AWS 2026</p>
        <Link to="/grafico" className="footer-link">
          Gráfico de Prioridade
        </Link>
        <Link to="/about" className="footer-link">
          Sobre a BIA
        </Link>
      </div>
    </footer>
  );
};

export default Footer;
