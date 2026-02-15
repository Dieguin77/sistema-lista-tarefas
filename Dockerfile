FROM node:18-alpine

WORKDIR /app

# Copiar package.json e instalar dependências
COPY package*.json ./
RUN npm install --production

# Copiar código fonte
COPY . .

# Criar diretório de dados
RUN mkdir -p .data

# Expor porta
EXPOSE 3000

# Iniciar aplicação
CMD ["npm", "start"]
