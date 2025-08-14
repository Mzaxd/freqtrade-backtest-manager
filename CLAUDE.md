# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Development
- `pnpm dev` - Start development server on port 5173
- `pnpm build` - Build the Next.js application
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint

### Worker System
- `pnpm worker` - Start the background worker process (required for backtest/data processing)

### Database Operations
- `pnpm db:migrate` - Run database migrations
- `pnpm db:push` - Push schema changes to database
- `pnpm db:generate` - Generate Prisma client
- `pnpm db:studio` - Open Prisma Studio

## Architecture Overview

This is a Freqtrade backtest management system built with Next.js, featuring:

### Worker-Based Architecture
- **Web Server**: Next.js app handling UI and API routes
- **Worker Process**: Separate Node.js process using tsx for background jobs
- **Queue System**: BullMQ with Redis for job management
- **Three Worker Types**: backtest, dataDownload, plot

### Database Models
- **BacktestTask**: Stores backtest jobs with status, results, and metadata
- **Strategy**: Manages trading strategy files
- **Config**: Stores Freqtrade configuration JSON
- **Trade**: Individual trade results from backtests
- **MarketData**: Tracks available market data
- **DataDownloadJob**: Manages data download operations

### Key Components
- **Real-time Logs**: Redis pub/sub for live log streaming during backtests
- **Internationalization**: Support for English (en) and Chinese (zh) using next-intl
- **Freqtrade Integration**: Executes backtests via Docker or local freqtrade installation
- **File Management**: Handles config files, strategies, and result files

### File Structure
- `src/workers/` - Background job processors
- `src/app/api/` - API routes for CRUD operations
- `src/components/` - React components with shadcn/ui
- `prisma/` - Database schema and migrations
- `messages/` - Internationalization files

## Environment Configuration

Required environment variables:
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection for queues
- `FREQTRADE_PATH` - Path to freqtrade executable (or Docker command)
- `FREQTRADE_USER_DATA_PATH` - Local path to freqtrade user data
- `FREQTRADE_CONTAINER_USER_DATA_PATH` - Container path mapping

## Development Workflow

1. Start both web server and worker: `pnpm dev` and `pnpm worker`
2. Database changes require migration via `pnpm db:migrate`
3. Workers process backtests, data downloads, and plotting jobs asynchronously
4. Real-time updates use Redis for log streaming and job status