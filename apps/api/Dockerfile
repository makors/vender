FROM oven/bun:latest

WORKDIR /app

# Copy only API manifest first for better layer caching
COPY apps/api/package.json ./package.json
COPY apps/api/tsconfig.json ./tsconfig.json

# Install dependencies for the API workspace
RUN bun install

# Copy the rest of the API workspace
COPY apps/api/ ./

EXPOSE 3001

# Directory for SQLite database file (will be bind-mounted via compose)
VOLUME ["/app/data"]

CMD ["bun", "run", "dev"]

