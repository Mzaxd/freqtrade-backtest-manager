# Freqtrade Backtest Manager Docker 部署指南

本项目提供两种 Docker 部署方式：

## 1. Standalone 版本 (独立版本)

此版本只包含 Freqtrade Backtest Manager 应用，需要手动配置外部 PostgreSQL 和 Redis 服务。

### 使用方法

1. 复制环境变量文件：
```bash
cp .env.standalone.example .env
```

2. 编辑 `.env` 文件，配置外部服务连接信息

3. 启动服务：
```bash
docker-compose -f docker-compose.standalone.yml up -d
```

### 环境变量配置

```bash
# 数据库配置
POSTGRES_USER=你的数据库用户名
POSTGRES_PASSWORD=你的数据库密码
POSTGRES_DB=你的数据库名

# Redis 配置
REDIS_URL=redis://你的Redis地址:6379

# Freqtrade 配置
FREQTRADE_PATH=freqtrade  # 或者 Docker 命令
FREQTRADE_USER_DATA_PATH=./user_data
FREQTRADE_CONTAINER_USER_DATA_PATH=/app/user_data
```

## 2. All-in-One 版本 (一体化版本)

此版本包含所有必要的组件：PostgreSQL、Redis、Freqtrade Backtest Manager。

### 使用方法

1. 复制环境变量文件：
```bash
cp .env.allinone.example .env
```

2. 启动服务：
```bash
docker-compose -f docker-compose.allinone.yml up -d
```

### 注意事项

- All-in-One 版本需要 Docker 权限来管理 freqtrade 容器
- 默认端口：
  - Web 应用：5173
  - PostgreSQL：5432（可选）
  - Redis：6379（可选）

## 服务说明

### Standalone 版本包含的服务
- `app`: Freqtrade Backtest Manager Web 应用
- `worker`: 后台工作进程
- `postgres`: PostgreSQL 数据库
- `redis`: Redis 缓存

### All-in-One 版本包含的服务
- `app`: 一体化应用（包含数据库、Redis、Web 应用和工作进程）
- `freqtrade`: 可选的 freqtrade 容器

## 数据持久化

### Standalone 版本
- PostgreSQL 数据：`postgres_data` 卷
- Redis 数据：`redis_data` 卷
- 用户数据：`./data` 和 `./user_data` 目录

### All-in-One 版本
- 所有数据都存储在 Docker 卷中
- 通过 volumes 挂载到主机系统

## 停止服务

```bash
# Standalone 版本
docker-compose -f docker-compose.standalone.yml down

# All-in-One 版本
docker-compose -f docker-compose.allinone.yml down
```

## 查看日志

```bash
docker-compose -f docker-compose.standalone.yml logs -f
# 或
docker-compose -f docker-compose.allinone.yml logs -f
```