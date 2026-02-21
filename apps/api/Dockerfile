FROM node:18-alpine

WORKDIR /app

# Copy packages/common to the path expected by wrapper requires
# Wrappers use: require('../../../../packages/common/...')
# From /app/middleware/ that resolves to /packages/common/
COPY packages/common /packages/common

# Copy API source
COPY apps/api/package.json apps/api/package-lock.json* ./
RUN npm install --production

COPY apps/api/ .

EXPOSE 3100

CMD ["node", "server.js"]
