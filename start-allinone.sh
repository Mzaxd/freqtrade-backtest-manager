#!/bin/bash

# 启动脚本 - 用于 All-in-One 版本

set -e

echo "Starting Freqtrade Backtest Manager (All-in-One)..."

# 设置环境变量
export DATABASE_URL="postgresql://freqtrade:freqtrade_password@localhost:5432/freqtrade_db"
export REDIS_URL="redis://localhost:6379"
export FREQTRADE_PATH="docker run --rm -v /app/user_data:/freqtrade/user_data freqtradeorg/freqtrade:stable"
export FREQTRADE_USER_DATA_PATH="/app/user_data"
export FREQTRADE_CONTAINER_USER_DATA_PATH="/freqtrade/user_data"

# 启动 PostgreSQL
echo "Starting PostgreSQL..."
pg_ctl -D /var/lib/postgresql/data start

# 等待 PostgreSQL 启动
sleep 5

# 启动 Redis
echo "Starting Redis..."
redis-server --daemonize yes

# 等待 Redis 启动
sleep 2

# 运行数据库迁移
echo "Running database migrations..."
pnpm db:migrate

# 启动 Worker 进程（后台）
echo "Starting worker process..."
pnpm worker &

# 启动 Web 应用
echo "Starting web application..."
pnpm start