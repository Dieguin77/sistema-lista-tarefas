const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { pool, initDatabase } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Inicializar banco de dados
initDatabase();

// ROTAS DA API

// Listar todas as tarefas (ordenadas por ordem_apresentacao)
app.get('/api/tarefas', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM tarefas ORDER BY ordem_apresentacao ASC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Erro ao listar tarefas:', err);
    res.status(500).json({ error: 'Erro ao listar tarefas' });
  }
});

// Obter uma tarefa específica
app.get('/api/tarefas/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM tarefas WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tarefa não encontrada' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao buscar tarefa:', err);
    res.status(500).json({ error: 'Erro ao buscar tarefa' });
  }
});

// Incluir nova tarefa
app.post('/api/tarefas', async (req, res) => {
  const client = await pool.connect();
  try {
    const { nome, custo, data_limite } = req.body;

    // Validações
    if (!nome || nome.trim() === '') {
      return res.status(400).json({ error: 'Nome da tarefa é obrigatório' });
    }
    if (custo === undefined || custo === null || custo < 0) {
      return res.status(400).json({ error: 'Custo deve ser maior ou igual a zero' });
    }
    if (!data_limite) {
      return res.status(400).json({ error: 'Data limite é obrigatória' });
    }

    // Verificar se nome já existe
    const existente = await client.query(
      'SELECT id FROM tarefas WHERE LOWER(nome) = LOWER($1)',
      [nome.trim()]
    );
    if (existente.rows.length > 0) {
      return res.status(400).json({ error: 'Já existe uma tarefa com este nome' });
    }

    // Obter próxima ordem de apresentação
    const maxOrdem = await client.query(
      'SELECT COALESCE(MAX(ordem_apresentacao), 0) + 1 AS proxima_ordem FROM tarefas'
    );
    const ordem_apresentacao = maxOrdem.rows[0].proxima_ordem;

    // Inserir tarefa
    const result = await client.query(
      `INSERT INTO tarefas (nome, custo, data_limite, ordem_apresentacao)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [nome.trim(), custo, data_limite, ordem_apresentacao]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao criar tarefa:', err);
    res.status(500).json({ error: 'Erro ao criar tarefa' });
  } finally {
    client.release();
  }
});

// Editar tarefa (apenas nome, custo e data_limite)
app.put('/api/tarefas/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { nome, custo, data_limite } = req.body;

    // Validações
    if (!nome || nome.trim() === '') {
      return res.status(400).json({ error: 'Nome da tarefa é obrigatório' });
    }
    if (custo === undefined || custo === null || custo < 0) {
      return res.status(400).json({ error: 'Custo deve ser maior ou igual a zero' });
    }
    if (!data_limite) {
      return res.status(400).json({ error: 'Data limite é obrigatória' });
    }

    // Verificar se tarefa existe
    const tarefaExistente = await client.query(
      'SELECT * FROM tarefas WHERE id = $1',
      [id]
    );
    if (tarefaExistente.rows.length === 0) {
      return res.status(404).json({ error: 'Tarefa não encontrada' });
    }

    // Verificar se novo nome já existe em outra tarefa
    const nomeExistente = await client.query(
      'SELECT id FROM tarefas WHERE LOWER(nome) = LOWER($1) AND id != $2',
      [nome.trim(), id]
    );
    if (nomeExistente.rows.length > 0) {
      return res.status(400).json({ error: 'Já existe outra tarefa com este nome' });
    }

    // Atualizar tarefa
    const result = await client.query(
      `UPDATE tarefas 
       SET nome = $1, custo = $2, data_limite = $3
       WHERE id = $4
       RETURNING *`,
      [nome.trim(), custo, data_limite, id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Erro ao atualizar tarefa:', err);
    res.status(500).json({ error: 'Erro ao atualizar tarefa' });
  } finally {
    client.release();
  }
});

// Excluir tarefa
app.delete('/api/tarefas/:id', async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;

    const result = await client.query(
      'DELETE FROM tarefas WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tarefa não encontrada' });
    }

    res.json({ message: 'Tarefa excluída com sucesso', tarefa: result.rows[0] });
  } catch (err) {
    console.error('Erro ao excluir tarefa:', err);
    res.status(500).json({ error: 'Erro ao excluir tarefa' });
  } finally {
    client.release();
  }
});

// Reordenar tarefas (mover para cima ou para baixo)
app.put('/api/tarefas/:id/reordenar', async (req, res) => {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { direcao } = req.body; // 'subir' ou 'descer'

    await client.query('BEGIN');

    // Buscar tarefa atual
    const tarefaAtual = await client.query(
      'SELECT * FROM tarefas WHERE id = $1',
      [id]
    );
    if (tarefaAtual.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Tarefa não encontrada' });
    }

    const ordemAtual = tarefaAtual.rows[0].ordem_apresentacao;
    let tarefaTroca;

    if (direcao === 'subir') {
      // Buscar tarefa anterior (ordem menor mais próxima)
      tarefaTroca = await client.query(
        'SELECT * FROM tarefas WHERE ordem_apresentacao < $1 ORDER BY ordem_apresentacao DESC LIMIT 1',
        [ordemAtual]
      );
    } else if (direcao === 'descer') {
      // Buscar próxima tarefa (ordem maior mais próxima)
      tarefaTroca = await client.query(
        'SELECT * FROM tarefas WHERE ordem_apresentacao > $1 ORDER BY ordem_apresentacao ASC LIMIT 1',
        [ordemAtual]
      );
    } else {
      await client.query('ROLLBACK');
      return res.status(400).json({ error: 'Direção inválida. Use "subir" ou "descer"' });
    }

    if (tarefaTroca.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(400).json({ 
        error: direcao === 'subir' 
          ? 'Esta tarefa já está na primeira posição' 
          : 'Esta tarefa já está na última posição' 
      });
    }

    const ordemTroca = tarefaTroca.rows[0].ordem_apresentacao;
    const idTroca = tarefaTroca.rows[0].id;

    // Usar valor temporário para evitar conflito de UNIQUE
    await client.query(
      'UPDATE tarefas SET ordem_apresentacao = -1 WHERE id = $1',
      [id]
    );
    await client.query(
      'UPDATE tarefas SET ordem_apresentacao = $1 WHERE id = $2',
      [ordemAtual, idTroca]
    );
    await client.query(
      'UPDATE tarefas SET ordem_apresentacao = $1 WHERE id = $2',
      [ordemTroca, id]
    );

    await client.query('COMMIT');

    res.json({ message: 'Ordem atualizada com sucesso' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erro ao reordenar tarefa:', err);
    res.status(500).json({ error: 'Erro ao reordenar tarefa' });
  } finally {
    client.release();
  }
});

// Reordenar via drag-and-drop (atualizar posição)
app.put('/api/tarefas/reordenar/drag', async (req, res) => {
  const client = await pool.connect();
  try {
    const { ordens } = req.body; // Array de { id, ordem_apresentacao }

    await client.query('BEGIN');

    // Primeiro, define todas as ordens como negativas para evitar conflitos
    for (let i = 0; i < ordens.length; i++) {
      await client.query(
        'UPDATE tarefas SET ordem_apresentacao = $1 WHERE id = $2',
        [-(i + 1), ordens[i].id]
      );
    }

    // Depois, atualiza para as ordens finais
    for (let i = 0; i < ordens.length; i++) {
      await client.query(
        'UPDATE tarefas SET ordem_apresentacao = $1 WHERE id = $2',
        [i + 1, ordens[i].id]
      );
    }

    await client.query('COMMIT');

    res.json({ message: 'Ordem atualizada com sucesso' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erro ao reordenar tarefas:', err);
    res.status(500).json({ error: 'Erro ao reordenar tarefas' });
  } finally {
    client.release();
  }
});

// Rota principal - servir o frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log(`Acesse: http://localhost:${PORT}`);
});
