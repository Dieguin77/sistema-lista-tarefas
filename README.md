# Sistema Lista de Tarefas

Sistema web para cadastro e gerenciamento de tarefas.

## 🌐 Acesso Online

**Aplicação em produção:** https://sistema-tarefas-app.fly.dev/

## Funcionalidades

- **Listagem de Tarefas**: Exibe todas as tarefas ordenadas por ordem de apresentação
- **Inclusão**: Adiciona novas tarefas com nome, custo e data limite
- **Edição**: Permite alterar nome, custo e data limite de tarefas existentes (via popup)
- **Exclusão**: Remove tarefas com confirmação (Sim/Não)
- **Reordenação**: Botões ▲▼ para subir/descer + arraste e solte (drag-and-drop)
- **Destaque**: Tarefas com custo >= R$ 1.000,00 são destacadas em amarelo
- **Somatório**: Exibe o total dos custos no rodapé
- **Validações**: Nome único, custo >= 0, data válida, campos obrigatórios

## Tecnologias

- **Backend**: Node.js + Express
- **Banco de Dados**: SQLite (sql.js)
- **Frontend**: HTML, CSS e JavaScript puro
- **Hospedagem**: Fly.io

## Instalação Local

1. Clone o repositório:
```bash
git clone https://github.com/Dieguin77/sistema-lista-tarefas.git
cd sistema-lista-tarefas
```

2. Instale as dependências:
```bash
npm install
```

3. Execute o servidor:
```bash
npm start
```

4. Acesse: http://localhost:3000

## Variáveis de Ambiente

O sistema usa SQLite e não requer configuração de banco de dados externo. Opcionalmente, você pode configurar:

| Variável | Descrição | Padrão |
|----------|-----------|--------|
| PORT | Porta do servidor | 3000 |

## Estrutura do Banco de Dados

### Tabela: tarefas

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | INTEGER | Identificador (chave primária, auto-incremento) |
| nome | TEXT | Nome da tarefa (único, case-insensitive) |
| custo | REAL | Custo em R$ (>= 0) |
| data_limite | TEXT | Data limite (formato YYYY-MM-DD) |
| ordem_apresentacao | INTEGER | Ordem de exibição (único) |

### Constraints

- `nome` UNIQUE - Não permite nomes duplicados
- `custo` CHECK (custo >= 0) - Custo não pode ser negativo
- `ordem_apresentacao` UNIQUE - Ordem não pode se repetir

## API Endpoints

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | /api/tarefas | Lista todas as tarefas |
| GET | /api/tarefas/:id | Obtém uma tarefa |
| POST | /api/tarefas | Cria nova tarefa |
| PUT | /api/tarefas/:id | Atualiza tarefa |
| DELETE | /api/tarefas/:id | Exclui tarefa |
| PUT | /api/tarefas/:id/reordenar | Move tarefa (subir/descer) |
| PUT | /api/tarefas/reordenar/drag | Reordena via drag-and-drop |

## Licença

MIT
