"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    return queryInterface.addColumn("Tarefas", "concluida", {
      allowNull: true,
      defaultValue: false,
      type: Sequelize.BOOLEAN,
    });
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.removeColumn("Tarefas", "concluida");
  },
};
