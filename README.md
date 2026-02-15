# Sistema Lista de Tarefas

Sistema web para cadastro e gerenciamento de tarefas.

## Funcionalidades

- **Listagem de Tarefas**: Exibe todas as tarefas ordenadas por ordem de apresentação
- **Inclusão**: Adiciona novas tarefas com nome, custo e data limite
- **Edição**: Permite alterar nome, custo e data limite de tarefas existentes
- **Exclusão**: Remove tarefas com confirmação
- **Reordenação**: Arraste e solte (drag-and-drop) ou use os botões ▲▼
- **Destaque**: Tarefas com custo >= R$ 1.000,00 são destacadas em amarelo
- **Somatório**: Exibe o total dos custos no rodapé

## Tecnologias

- **Backend**: Node.js + Express
- **Banco de Dados**: PostgreSQL
- **Frontend**: HTML, CSS e JavaScript puro

## Instalação Local

1. Clone o repositório:
```bash
git clone https://github.com/SEU_USUARIO/sistema-lista-tarefas.git
cd sistema-lista-tarefas
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente:
```bash
cp .env.example .env
# Edite o arquivo .env com suas configurações de banco de dados
```

4. Execute o servidor:
```bash
npm start
```

5. Acesse: http://localhost:3000

## Estrutura do Banco de Dados

### Tabela: tarefas

| Campo | Tipo | Descrição |
|-------|------|-----------|
| id | SERIAL | Identificador (chave primária) |
| nome | VARCHAR(255) | Nome da tarefa (único) |
| custo | DECIMAL(15,2) | Custo em R$ (>= 0) |
| data_limite | DATE | Data limite |
| ordem_apresentacao | INTEGER | Ordem de exibição (único) |

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
