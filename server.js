const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { initDatabase, getDb, saveDatabase } = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Helper para converter resultado sql.js para array de objetos
const queryToObjects = (result) => {
  if (!result || result.length === 0) return [];
  if (!result[0].values || result[0].values.length === 0) return [];
  const columns = result[0].columns;
  const values = result[0].values;
  return values.map(row => {
    const obj = {};
    columns.forEach((col, i) => obj[col] = row[i]);
    return obj;
  });
};

// Helper para verificar se query retornou resultados
const hasResults = (result) => {
  return result && result.length > 0 && result[0].values && result[0].values.length > 0;
};

// Helper para validar data no formato ISO (YYYY-MM-DD)
const validarDataISO = (dataStr) => {
  if (!dataStr || typeof dataStr !== 'string') return false;
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dataStr)) return false;
  const [ano, mes, dia] = dataStr.split('-').map(Number);
  const data = new Date(ano, mes - 1, dia);
  return data.getFullYear() === ano && data.getMonth() === mes - 1 && data.getDate() === dia;
};

// ROTAS DA API

// Listar todas as tarefas
app.get('/api/tarefas', (req, res) => {
  try {
    const db = getDb();
    const result = db.exec('SELECT * FROM tarefas ORDER BY ordem_apresentacao ASC');
    const tarefas = queryToObjects(result);
    res.json(tarefas);
  } catch (err) {
    console.error('Erro ao listar tarefas:', err);
    res.status(500).json({ error: 'Erro ao listar tarefas' });
  }
});

// Obter uma tarefa específica
app.get('/api/tarefas/:id', (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const result = db.exec(`SELECT * FROM tarefas WHERE id = ${parseInt(id)}`);
    const tarefas = queryToObjects(result);
    if (tarefas.length === 0) {
      return res.status(404).json({ error: 'Tarefa não encontrada' });
    }
    res.json(tarefas[0]);
  } catch (err) {
    console.error('Erro ao buscar tarefa:', err);
    res.status(500).json({ error: 'Erro ao buscar tarefa' });
  }
});

// Incluir nova tarefa
app.post('/api/tarefas', (req, res) => {
  try {
    const db = getDb();
    const { nome, custo, data_limite } = req.body;

    // Validações
    if (!nome || nome.trim() === '') {
      return res.status(400).json({ error: 'Nome da tarefa é obrigatório' });
    }
    if (custo === undefined || custo === null || isNaN(parseFloat(custo)) || parseFloat(custo) < 0) {
      return res.status(400).json({ error: 'Custo deve ser maior ou igual a zero' });
    }
    if (!data_limite) {
      return res.status(400).json({ error: 'Data limite é obrigatória' });
    }
    // Validar formato de data (YYYY-MM-DD)
    if (!validarDataISO(data_limite)) {
      return res.status(400).json({ error: 'Data limite inválida' });
    }

    const nomeLimpo = nome.trim().replace(/'/g, "''");

    // Verificar se nome já existe
    const existente = db.exec(`SELECT id FROM tarefas WHERE LOWER(nome) = LOWER('${nomeLimpo}')`);
    if (hasResults(existente)) {
      return res.status(400).json({ error: 'Já existe uma tarefa com este nome' });
    }

    // Obter próxima ordem
    const maxResult = db.exec('SELECT COALESCE(MAX(ordem_apresentacao), 0) + 1 AS proxima FROM tarefas');
    const proximaOrdem = maxResult.length > 0 ? maxResult[0].values[0][0] : 1;

    // Inserir
    db.run(`INSERT INTO tarefas (nome, custo, data_limite, ordem_apresentacao) VALUES ('${nomeLimpo}', ${custo}, '${data_limite}', ${proximaOrdem})`);
    saveDatabase();

    // Buscar tarefa inserida pelo nome (mais confiável que last_insert_rowid no sql.js)
    const novaResult = db.exec(`SELECT * FROM tarefas WHERE LOWER(nome) = LOWER('${nomeLimpo}')`);
    const novaTarefa = queryToObjects(novaResult)[0];

    res.status(201).json(novaTarefa);
  } catch (err) {
    console.error('Erro ao criar tarefa:', err);
    res.status(500).json({ error: 'Erro ao criar tarefa' });
  }
});

// Editar tarefa
app.put('/api/tarefas/:id', (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const { nome, custo, data_limite } = req.body;

    // Validações
    if (!nome || nome.trim() === '') {
      return res.status(400).json({ error: 'Nome da tarefa é obrigatório' });
    }
    if (custo === undefined || custo === null || isNaN(parseFloat(custo)) || parseFloat(custo) < 0) {
      return res.status(400).json({ error: 'Custo deve ser maior ou igual a zero' });
    }
    if (!data_limite) {
      return res.status(400).json({ error: 'Data limite é obrigatória' });
    }
    // Validar formato de data (YYYY-MM-DD)
    if (!validarDataISO(data_limite)) {
      return res.status(400).json({ error: 'Data limite inválida' });
    }

    const idNum = parseInt(id);
    const nomeLimpo = nome.trim().replace(/'/g, "''");

    // Verificar se existe
    const existeResult = db.exec(`SELECT * FROM tarefas WHERE id = ${idNum}`);
    if (!hasResults(existeResult)) {
      return res.status(404).json({ error: 'Tarefa não encontrada' });
    }

    // Verificar nome duplicado
    const duplicado = db.exec(`SELECT id FROM tarefas WHERE LOWER(nome) = LOWER('${nomeLimpo}') AND id != ${idNum}`);
    if (hasResults(duplicado)) {
      return res.status(400).json({ error: 'Já existe outra tarefa com este nome' });
    }

    // Atualizar
    db.run(`UPDATE tarefas SET nome = '${nomeLimpo}', custo = ${custo}, data_limite = '${data_limite}' WHERE id = ${idNum}`);
    saveDatabase();

    const atualizada = db.exec(`SELECT * FROM tarefas WHERE id = ${idNum}`);
    res.json(queryToObjects(atualizada)[0]);
  } catch (err) {
    console.error('Erro ao atualizar tarefa:', err);
    res.status(500).json({ error: 'Erro ao atualizar tarefa' });
  }
});

// Excluir tarefa
app.delete('/api/tarefas/:id', (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const idNum = parseInt(id);

    const existeResult = db.exec(`SELECT * FROM tarefas WHERE id = ${idNum}`);
    if (!hasResults(existeResult)) {
      return res.status(404).json({ error: 'Tarefa não encontrada' });
    }

    const tarefa = queryToObjects(existeResult)[0];
    db.run(`DELETE FROM tarefas WHERE id = ${idNum}`);
    saveDatabase();

    res.json({ message: 'Tarefa excluída com sucesso', tarefa });
  } catch (err) {
    console.error('Erro ao excluir tarefa:', err);
    res.status(500).json({ error: 'Erro ao excluir tarefa' });
  }
});

// Reordenar (subir/descer)
app.put('/api/tarefas/:id/reordenar', (req, res) => {
  try {
    const db = getDb();
    const { id } = req.params;
    const { direcao } = req.body;
    const idNum = parseInt(id);

    const atualResult = db.exec(`SELECT * FROM tarefas WHERE id = ${idNum}`);
    if (!hasResults(atualResult)) {
      return res.status(404).json({ error: 'Tarefa não encontrada' });
    }

    const tarefaAtual = queryToObjects(atualResult)[0];
    const ordemAtual = tarefaAtual.ordem_apresentacao;

    let trocaQuery;
    if (direcao === 'subir') {
      trocaQuery = `SELECT * FROM tarefas WHERE ordem_apresentacao < ${ordemAtual} ORDER BY ordem_apresentacao DESC LIMIT 1`;
    } else if (direcao === 'descer') {
      trocaQuery = `SELECT * FROM tarefas WHERE ordem_apresentacao > ${ordemAtual} ORDER BY ordem_apresentacao ASC LIMIT 1`;
    } else {
      return res.status(400).json({ error: 'Direção inválida' });
    }

    const trocaResult = db.exec(trocaQuery);
    if (!hasResults(trocaResult)) {
      return res.status(400).json({ 
        error: direcao === 'subir' ? 'Já está na primeira posição' : 'Já está na última posição' 
      });
    }

    const tarefaTroca = queryToObjects(trocaResult)[0];
    const ordemTroca = tarefaTroca.ordem_apresentacao;
    const idTroca = tarefaTroca.id;

    // Trocar ordens
    db.run(`UPDATE tarefas SET ordem_apresentacao = -1 WHERE id = ${idNum}`);
    db.run(`UPDATE tarefas SET ordem_apresentacao = ${ordemAtual} WHERE id = ${idTroca}`);
    db.run(`UPDATE tarefas SET ordem_apresentacao = ${ordemTroca} WHERE id = ${idNum}`);
    saveDatabase();

    res.json({ message: 'Ordem atualizada com sucesso' });
  } catch (err) {
    console.error('Erro ao reordenar:', err);
    res.status(500).json({ error: 'Erro ao reordenar tarefa' });
  }
});

// Reordenar drag-and-drop
app.put('/api/tarefas/reordenar/drag', (req, res) => {
  try {
    const db = getDb();
    const { ordens } = req.body;

    // Primeiro para negativo
    for (let i = 0; i < ordens.length; i++) {
      db.run(`UPDATE tarefas SET ordem_apresentacao = ${-(i + 1)} WHERE id = ${ordens[i].id}`);
    }
    // Depois para final
    for (let i = 0; i < ordens.length; i++) {
      db.run(`UPDATE tarefas SET ordem_apresentacao = ${i + 1} WHERE id = ${ordens[i].id}`);
    }
    saveDatabase();

    res.json({ message: 'Ordem atualizada com sucesso' });
  } catch (err) {
    console.error('Erro ao reordenar:', err);
    res.status(500).json({ error: 'Erro ao reordenar tarefas' });
  }
});

// Rota principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Iniciar servidor após banco estar pronto
initDatabase().then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor rodando na porta ${PORT}`);
    console.log(`Acesse: http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('Erro ao inicializar banco:', err);
  process.exit(1);
});
