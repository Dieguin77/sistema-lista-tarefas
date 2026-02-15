const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Criar tabela se não existir
const initDatabase = async () => {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS tarefas (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(255) NOT NULL UNIQUE,
        custo DECIMAL(15, 2) NOT NULL CHECK (custo >= 0),
        data_limite DATE NOT NULL,
        ordem_apresentacao INTEGER NOT NULL UNIQUE
      );
    `);
    console.log('Tabela tarefas verificada/criada com sucesso');
  } catch (err) {
    console.error('Erro ao criar tabela:', err);
  } finally {
    client.release();
  }
};

module.exports = { pool, initDatabase };
