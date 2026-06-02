FROM node:20-alpine

WORKDIR /app

# Установите системные зависимости
RUN apk add --no-cache python3 py3-pip

# Копируйте package.json и requirements.txt
COPY package.json pnpm-lock.yaml* npm-shrinkwrap.json* ./
COPY requirements.txt ./

# Установите Node зависимости
RUN npm install -g pnpm && \
    pnpm install --frozen-lockfile

# Установите Python зависимости
RUN pip install -r requirements.txt

# Копируйте весь код
COPY . .

# Expose порт
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3001/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Запуск приложения
CMD ["node", "index.js"]
