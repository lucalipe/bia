const tarefasController = require('../../../api/controllers/tarefas');

// Mock do initializeModels
jest.mock('../../../api/models', () => {
  return jest.fn();
});

const initializeModels = require('../../../api/models');

describe('Tarefas Controller', () => {
  let req, res, mockTarefas;

  beforeEach(() => {
    req = {
      body: {},
      params: {}
    };
    res = {
      send: jest.fn(),
      status: jest.fn().mockReturnThis()
    };

    mockTarefas = {
      create: jest.fn(),
      findByPk: jest.fn(),
      findAll: jest.fn(),
      destroy: jest.fn(),
      update: jest.fn()
    };

    initializeModels.mockResolvedValue({ Tarefas: mockTarefas });
    jest.clearAllMocks();
  });

  describe('create', () => {
    test('deve criar uma tarefa com sucesso', async () => {
      const novaTarefa = {
        titulo: 'Teste',
        dia_atividade: '2026-01-26',
        importante: true
      };
      req.body = novaTarefa;

      const tarefaCriada = { uuid: '123', ...novaTarefa };
      mockTarefas.create.mockResolvedValue(tarefaCriada);

      const { create } = tarefasController();
      await create(req, res);

      expect(mockTarefas.create).toHaveBeenCalledWith(novaTarefa);
      expect(res.send).toHaveBeenCalledWith(tarefaCriada);
    });

    test('deve retornar erro 500 ao falhar', async () => {
      req.body = { titulo: 'Teste' };
      mockTarefas.create.mockRejectedValue(new Error('Erro no banco'));

      const { create } = tarefasController();
      await create(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({
        message: 'Erro no banco'
      });
    });
  });

  describe('find', () => {
    test('deve retornar uma tarefa por uuid', async () => {
      const tarefa = { uuid: '123', titulo: 'Teste' };
      req.params.uuid = '123';
      mockTarefas.findByPk.mockResolvedValue(tarefa);

      const { find } = tarefasController();
      await find(req, res);

      expect(mockTarefas.findByPk).toHaveBeenCalledWith('123');
      expect(res.send).toHaveBeenCalledWith(tarefa);
    });

    test('deve retornar 404 quando tarefa não existe', async () => {
      req.params.uuid = '999';
      mockTarefas.findByPk.mockResolvedValue(null);

      const { find } = tarefasController();
      await find(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith({
        message: 'Tarefa não encontrada.'
      });
    });

    test('deve retornar erro 500 ao falhar', async () => {
      req.params.uuid = '123';
      mockTarefas.findByPk.mockRejectedValue(new Error('Erro no banco'));

      const { find } = tarefasController();
      await find(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({
        message: 'Erro no banco'
      });
    });
  });

  describe('findAll', () => {
    test('deve retornar todas as tarefas', async () => {
      const tarefas = [
        { uuid: '1', titulo: 'Tarefa 1' },
        { uuid: '2', titulo: 'Tarefa 2' }
      ];
      mockTarefas.findAll.mockResolvedValue(tarefas);

      const { findAll } = tarefasController();
      await findAll(req, res);

      expect(mockTarefas.findAll).toHaveBeenCalled();
      expect(res.send).toHaveBeenCalledWith({ dbTime: expect.any(Number), data: tarefas });
    });

    test('deve retornar erro 500 ao falhar', async () => {
      mockTarefas.findAll.mockRejectedValue(new Error('Erro no banco'));

      const { findAll } = tarefasController();
      await findAll(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({
        message: 'Erro no banco'
      });
    });
  });

  describe('delete', () => {
    test('deve deletar uma tarefa com sucesso', async () => {
      req.params.uuid = '123';
      mockTarefas.destroy.mockResolvedValue(1);

      const { delete: deleteFn } = tarefasController();
      await deleteFn(req, res);

      expect(mockTarefas.destroy).toHaveBeenCalledWith({
        where: { uuid: '123' }
      });
      expect(res.send).toHaveBeenCalledWith({
        message: 'Tarefa deletada com sucesso.'
      });
    });

    test('deve retornar 404 quando tarefa não existe', async () => {
      req.params.uuid = '999';
      mockTarefas.destroy.mockResolvedValue(0);

      const { delete: deleteFn } = tarefasController();
      await deleteFn(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith({
        message: 'Tarefa não encontrada.'
      });
    });

    test('deve retornar erro 500 ao falhar', async () => {
      req.params.uuid = '123';
      mockTarefas.destroy.mockRejectedValue(new Error('Erro no banco'));

      const { delete: deleteFn } = tarefasController();
      await deleteFn(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({
        message: 'Erro no banco'
      });
    });
  });

  describe('update_priority', () => {
    test('deve atualizar uma tarefa com sucesso', async () => {
      const tarefaAtualizada = { uuid: '123', importante: true };
      req.params.uuid = '123';
      req.body = { importante: true };
      mockTarefas.update.mockResolvedValue([1]);
      mockTarefas.findByPk.mockResolvedValue(tarefaAtualizada);

      const { update_priority } = tarefasController();
      await update_priority(req, res);

      expect(mockTarefas.update).toHaveBeenCalledWith(
        { importante: true },
        { where: { uuid: '123' } }
      );
      expect(res.send).toHaveBeenCalledWith(tarefaAtualizada);
    });

    test('deve retornar 404 quando tarefa não existe', async () => {
      req.params.uuid = '999';
      req.body = { importante: true };
      mockTarefas.update.mockResolvedValue([0]);
      mockTarefas.findByPk.mockResolvedValue(null);

      const { update_priority } = tarefasController();
      await update_priority(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith({
        message: 'Tarefa não encontrada.'
      });
    });

    test('deve retornar erro 500 ao falhar', async () => {
      req.params.uuid = '123';
      req.body = { importante: true };
      mockTarefas.update.mockRejectedValue(new Error('Erro no banco'));

      const { update_priority } = tarefasController();
      await update_priority(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({
        message: 'Erro no banco'
      });
    });
  });

  describe('update_titulo', () => {
    test('deve atualizar o título de uma tarefa com sucesso', async () => {
      const tarefaAtualizada = { uuid: '123', titulo: 'Novo título' };
      req.params.uuid = '123';
      req.body = { titulo: '  Novo título  ' };
      mockTarefas.update.mockResolvedValue([1]);
      mockTarefas.findByPk.mockResolvedValue(tarefaAtualizada);

      const { update_titulo } = tarefasController();
      await update_titulo(req, res);

      expect(mockTarefas.update).toHaveBeenCalledWith(
        { titulo: 'Novo título' },
        { where: { uuid: '123' } }
      );
      expect(res.send).toHaveBeenCalledWith(tarefaAtualizada);
    });

    test('deve retornar 404 quando tarefa não existe', async () => {
      req.params.uuid = '999';
      req.body = { titulo: 'Novo título' };
      mockTarefas.update.mockResolvedValue([0]);
      mockTarefas.findByPk.mockResolvedValue(null);

      const { update_titulo } = tarefasController();
      await update_titulo(req, res);

      expect(mockTarefas.update).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith({
        message: 'Tarefa não encontrada.'
      });
    });

    test('deve retornar 409 quando a tarefa está concluída', async () => {
      req.params.uuid = '123';
      req.body = { titulo: 'Novo título' };
      mockTarefas.findByPk.mockResolvedValue({ uuid: '123', titulo: 'Antigo', concluida: true });

      const { update_titulo } = tarefasController();
      await update_titulo(req, res);

      expect(mockTarefas.update).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.send).toHaveBeenCalledWith({
        message: 'Tarefa concluída não pode ter o título editado.'
      });
    });

    test('deve retornar 400 quando título vier vazio', async () => {
      req.params.uuid = '123';
      req.body = { titulo: '   ' };

      const { update_titulo } = tarefasController();
      await update_titulo(req, res);

      expect(mockTarefas.update).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({
        message: 'O título da tarefa é obrigatório.'
      });
    });

    test('deve retornar 400 quando título não for informado', async () => {
      req.params.uuid = '123';
      req.body = {};

      const { update_titulo } = tarefasController();
      await update_titulo(req, res);

      expect(mockTarefas.update).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.send).toHaveBeenCalledWith({
        message: 'O título da tarefa é obrigatório.'
      });
    });

    test('deve retornar erro 500 ao falhar', async () => {
      req.params.uuid = '123';
      req.body = { titulo: 'Novo título' };
      mockTarefas.findByPk.mockResolvedValue({ uuid: '123', titulo: 'Antigo', concluida: false });
      mockTarefas.update.mockRejectedValue(new Error('Erro no banco'));

      const { update_titulo } = tarefasController();
      await update_titulo(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({
        message: 'Erro no banco'
      });
    });
  });

  describe('update_conclusao', () => {
    test('deve marcar uma tarefa como concluída com sucesso', async () => {
      const tarefaAtualizada = { uuid: '123', concluida: true };
      req.params.uuid = '123';
      req.body = { concluida: true };
      mockTarefas.update.mockResolvedValue([1]);
      mockTarefas.findByPk.mockResolvedValue(tarefaAtualizada);

      const { update_conclusao } = tarefasController();
      await update_conclusao(req, res);

      expect(mockTarefas.update).toHaveBeenCalledWith(
        { concluida: true },
        { where: { uuid: '123' } }
      );
      expect(res.send).toHaveBeenCalledWith(tarefaAtualizada);
    });

    test('deve desmarcar uma tarefa concluída com sucesso', async () => {
      const tarefaAtualizada = { uuid: '123', concluida: false };
      req.params.uuid = '123';
      req.body = { concluida: false };
      mockTarefas.update.mockResolvedValue([1]);
      mockTarefas.findByPk.mockResolvedValue(tarefaAtualizada);

      const { update_conclusao } = tarefasController();
      await update_conclusao(req, res);

      expect(mockTarefas.update).toHaveBeenCalledWith(
        { concluida: false },
        { where: { uuid: '123' } }
      );
      expect(res.send).toHaveBeenCalledWith(tarefaAtualizada);
    });

    test('deve retornar 404 quando tarefa não existe', async () => {
      req.params.uuid = '999';
      req.body = { concluida: true };
      mockTarefas.update.mockResolvedValue([0]);
      mockTarefas.findByPk.mockResolvedValue(null);

      const { update_conclusao } = tarefasController();
      await update_conclusao(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.send).toHaveBeenCalledWith({
        message: 'Tarefa não encontrada.'
      });
    });

    test('deve retornar erro 500 ao falhar', async () => {
      req.params.uuid = '123';
      req.body = { concluida: true };
      mockTarefas.update.mockRejectedValue(new Error('Erro no banco'));

      const { update_conclusao } = tarefasController();
      await update_conclusao(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith({
        message: 'Erro no banco'
      });
    });
  });
});
