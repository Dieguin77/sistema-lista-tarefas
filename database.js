const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

// Diretório para persistência
const dataDir = path.join(__dirname, '.data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
const dbPath = path.join(dataDir, 'tarefas.db');

let db = null;

// Inicializar banco de dados
const initDatabase = async () => {
  const SQL = await initSqlJs();
  
  // Carregar banco existente ou criar novo
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
    console.log('Banco de dados carregado de:', dbPath);
  } else {
    db = new SQL.Database();
    console.log('Novo banco de dados criado');
  }
  
  // Criar tabela se não existir
  db.run(`
    CREATE TABLE IF NOT EXISTS tarefas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL UNIQUE COLLATE NOCASE,
      custo REAL NOT NULL CHECK (custo >= 0),
      data_limite TEXT NOT NULL,
      ordem_apresentacao INTEGER NOT NULL UNIQUE
    );
  `);
  
  saveDatabase();
  console.log('Banco de dados SQLite inicializado');
  return db;
};

// Salvar banco no disco
const saveDatabase = () => {
  if (db) {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  }
};

// Obter instância do banco
const getDb = () => db;

module.exports = { initDatabase, getDb, saveDatabase };
