# Freqtrade 回测管理器

基于 Next.js 的 Freqtrade 可视化回测平台，提供现代化的 Web 界面来管理策略、配置和回测任务。

## 功能特性

- 📊 **仪表盘**: 展示关键指标和最近回测
- 🔄 **回测中心**: 创建、管理和监控回测任务
- 📈 **实时日志**: 查看运行中任务的实时日志
- 🎯 **策略管理**: 上传和管理策略文件
- ⚙️ **配置管理**: 上传和管理配置文件
- 🚀 **异步处理**: 基于 BullMQ 的后台任务队列

## 技术栈

- **前端**: Next.js 15, TypeScript, Tailwind CSS, shadcn/ui
- **后端**: Next.js API Routes, Prisma ORM
- **数据库**: PostgreSQL
- **消息队列**: BullMQ + Redis
- **容器化**: Docker & Docker Compose

## 快速开始

### 环境要求

- Node.js 20+
- PostgreSQL 15+
- Redis 7+
- Freqtrade (已安装并配置好)

### 1. 安装依赖

```bash
pnpm install
```

### 2. 配置环境变量

确保 `.env` 文件已配置：

```bash
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/freqtrade_backtest_manager"

# Redis
REDIS_URL="redis://localhost:6379"

# Freqtrade
FREQTRADE_PATH="/usr/local/bin/freqtrade"
```

### 3. 数据库设置

```bash
# 创建数据库
createdb freqtrade_backtest_manager

# 运行数据库迁移
pnpm db:push
```

### 4. 启动开发环境

```bash
# 启动数据库和 Redis (使用 Docker)
docker-compose up -d postgres redis

# 启动 Next.js 开发服务器
pnpm dev

# 启动工作进程 (新终端)
pnpm worker
```

### 5. 使用 Docker Compose (推荐)

```bash
# 启动所有服务
docker-compose up -d

# 查看日志
docker-compose logs -f
```

## 项目结构

```
freqtrade-backtest-manager/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/               # API 路由
│   │   ├── backtests/         # 回测相关页面
│   │   ├── configs/           # 配置管理页面
│   │   ├── strategies/        # 策略管理页面
│   │   └── dashboard/         # 仪表盘页面
│   ├── components/            # 共享组件
│   ├── lib/                   # 共享库
│   └── workers/               # 后台任务
├── prisma/                    # 数据库 Schema
├── strategies/                # 策略文件存储
├── configs/                   # 配置文件存储
├── data/                      # 回测数据存储
└── docker-compose.yml         # Docker 配置
```

## 使用说明

1. **上传策略**: 在策略管理页面上传 `.py` 策略文件
2. **上传配置**: 在配置管理页面上传 `.json` 配置文件
3. **创建回测**: 在回测页面选择策略、配置和时间范围创建回测任务
4. **查看结果**: 在回测详情页面查看回测结果和实时日志

## 开发命令

```bash
pnpm dev          # 启动开发服务器
pnpm build        # 构建生产版本
pnpm start        # 启动生产服务器
pnpm worker       # 启动工作进程
pnpm db:generate  # 生成 Prisma 客户端
pnpm db:migrate   # 运行数据库迁移
pnpm db:studio    # 启动 Prisma Studio
```

## 注意事项

- 确保 Freqtrade 已正确安装并配置
- 策略文件需要放在 `strategies/` 目录下
- 配置文件需要放在 `configs/` 目录下
- 回测结果会保存在 `data/` 目录下
