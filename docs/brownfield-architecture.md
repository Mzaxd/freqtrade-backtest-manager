# Freqtrade Backtest Manager Brownfield Architecture Document

## Introduction

This document captures the CURRENT STATE of the Freqtrade Backtest Manager codebase, including technical debt, workarounds, and real-world patterns. It serves as a reference for AI agents working on enhancements, particularly focusing on the K-line chart feature epic.

### Document Scope

Focused on areas relevant to: **K-line chart enhancement for backtest detail pages** - adding interactive candlestick charts with trade markers to existing backtest result views.

### Change Log

| Date | Version | Description | Author |
|------|---------|-------------|--------|
| 2025-08-24 | 1.0 | Initial brownfield analysis | Mary (Business Analyst) |

## Quick Reference - Key Files and Entry Points

### Critical Files for Understanding the System

- **Main Entry**: `src/app/[locale]/page.tsx` (Next.js app router entry)
- **Configuration**: `.env.example`, `prisma/schema.prisma`
- **Core Business Logic**: `src/workers/backtestWorker.ts`, `src/lib/queue.ts`
- **API Definitions**: `src/app/api/` (Next.js route handlers)
- **Database Models**: `prisma/schema.prisma`
- **Key Algorithms**: `src/components/EnhancedTradingChart.tsx` (existing chart component)

### Enhancement Impact Areas

Based on the epic for K-line chart functionality, these files will be affected:

- `src/app/[locale]/backtests/[id]/page.tsx` - Already has K-line tab, needs enhancement
- `src/components/EnhancedTradingChart.tsx` - Existing component needs improvements
- `src/app/api/backtests/[id]/chart-data/route.ts` - Existing API needs optimization
- `src/types/chart.ts` - Chart-related type definitions

## High Level Architecture

### Technical Summary

This is a Next.js 15 full-stack monolith application that manages Freqtrade backtesting tasks through a web interface. The system uses a worker-based architecture with BullMQ for background job processing and Redis for real-time log streaming.

### Actual Tech Stack (from package.json)

| Category | Technology | Version | Notes |
|----------|------------|---------|-------|
| Runtime | Node.js | >= 20.x | Required for Next.js 15 |
| Framework | Next.js | 15.4.5 | Using App Router, API routes, Server Actions |
| Language | TypeScript | 5.x | Full stack type safety |
| UI Library | React | 19.1.0 | Client components with hooks |
| Styling | Tailwind CSS | 4.x | Utility-first CSS |
| UI Components | shadcn/ui | Various | Radix-based component library |
| State Management | Zustand | 5.0.6 | Client-side global state |
| Data Fetching | TanStack Query | 5.83.0 | Server state management with caching |
| Database | PostgreSQL | 14+ | Primary data store |
| ORM | Prisma | 6.13.0 | Type-safe database access |
| Task Queue | BullMQ | 5.56.8 | Background job processing |
| Message Broker | Redis | 5.6.1 | Job queue backend and real-time messaging |
| Charting | Lightweight Charts | 4.1.3 | Interactive financial charts |
| Internationalization | next-intl | 3.26.5 | Chinese/English support |

### Repository Structure Reality Check

- Type: Monorepo (single package)
- Package Manager: pnpm
- Notable: Uses workspace configuration but single package

## Source Tree and Module Organization

### Project Structure (Actual)

```
freqtrade-backtest-manager/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── [locale]/          # Internationalization
│   │   │   ├── backtests/[id]/ # Backtest detail pages
│   │   │   ├── dashboard/     # Dashboard overview
│   │   │   ├── configs/       # Configuration management
│   │   │   ├── data/          # Data download management
│   │   │   ├── hyperopts/     # Hyperopt task management
│   │   │   └── strategies/    # Strategy file management
│   │   └── api/               # API routes
│   │       ├── backtests/     # Backtest CRUD and operations
│   │       ├── configs/       # Config file management
│   │       ├── data/          # Data download operations
│   │       ├── hyperopts/     # Hyperopt operations
│   │       ├── market-data/   # Market data import
│   │       ├── plots/         # Plot generation
│   │       └── strategies/    # Strategy file management
│   ├── components/            # React components
│   │   ├── ui/                # shadcn/ui base components
│   │   ├── chart/             # Chart-related components and utilities
│   │   ├── providers/         # React context providers
│   │   └── *.tsx              # Domain-specific components
│   ├── workers/               # Background job processors
│   │   ├── backtestWorker.ts   # Backtest execution logic
│   │   ├── dataDownloadWorker.ts # Data downloading
│   │   ├── hyperoptWorker.ts  # Hyperopt optimization
│   │   ├── plotWorker.ts      # Chart generation
│   │   └── index.ts           # Worker entry point
│   ├── lib/                   # Shared utilities
│   │   ├── prisma.ts          # Database client
│   │   ├── queue.ts           # BullMQ queue setup
│   │   ├── security.ts        # Security utilities
│   │   ├── utils.ts           # General utilities
│   │   └── validation.ts      # Input validation
│   ├── types/                 # TypeScript definitions
│   └── hooks/                 # Custom React hooks
├── prisma/                    # Database schema and migrations
├── messages/                  # Internationalization files
├── public/                    # Static assets
└── docker/                    # Containerization files
```

### Key Modules and Their Purpose

- **Backtest Execution**: `src/workers/backtestWorker.ts` - Core logic for running Freqtrade backtests via child_process
- **Job Queue Management**: `src/lib/queue.ts` - BullMQ queue setup and worker creation
- **Chart Component**: `src/components/EnhancedTradingChart.tsx` - Interactive trading charts with trade markers
- **Real-time Logs**: `src/components/RealtimeLogViewer.tsx` - Redis pub/sub log streaming
- **Database Models**: `prisma/schema.prisma` - Complete data model with backtest tasks, trades, and metadata
- **API Layer**: `src/app/api/` - RESTful endpoints with Next.js route handlers

## Data Models and APIs

### Data Models

The system uses Prisma with PostgreSQL. Key models include:

- **BacktestTask**: Core model for backtest jobs with status, results, and metadata
- **Strategy**: Strategy file metadata and management
- **Config**: Configuration file management with JSON storage
- **Trade**: Individual trade results with profit/loss data
- **MarketData**: Available market data tracking
- **HyperoptTask**: Hyperopt optimization job management
- **DataDownloadJob**: Data download operations

See `prisma/schema.prisma` for complete schema definitions including recent additions like detailed backtest metrics and candle data file tracking.

### API Specifications

The API follows RESTful patterns using Next.js route handlers:

- **Backtest Management**: `/api/backtests/` - CRUD operations, execution, logs, chart data
- **Configuration**: `/api/configs/` - Import and management
- **Strategy**: `/api/strategies/` - File management and content retrieval
- **Data Operations**: `/api/data/` - Download and market data management
- **Hyperopt**: `/api/hyperopts/` - Optimization job management

## Technical Debt and Known Issues

### Critical Technical Debt

1. **Error Handling in Backtest Worker**: Complex status determination logic in `backtestWorker.ts:275-445` with multiple nested conditions and debug logging mixed with production code
2. **File Path Management**: Multiple file path resolution strategies with inconsistent validation across different data sources
3. **Type Safety**: Several `@ts-ignore` comments and any types in chart components
4. **Worker Process Management**: No proper cleanup of temporary files in all error scenarios
5. **Real-time Log Streaming**: Potential memory leaks in Redis pub/sub connections

### Workarounds and Gotchas

- **Freqtrade Process Output**: Both stdout and stderr are treated as logs since Freqtrade sends INFO/WARNING to stderr
- **Result File Detection**: Complex retry logic with multiple file pattern matching due to Freqtrade version differences
- **Data File Formats**: Multiple data source fallbacks (backtest files, MarketData table, raw data directory)
- **Environment Variables**: Complex path mapping between host and container for Freqtrade execution

## Integration Points and External Dependencies

### External Services

| Service | Purpose | Integration Type | Key Files |
|---------|---------|-----------------|-----------|
| Freqtrade | Backtest execution | Child process spawning | `src/workers/backtestWorker.ts` |
| Redis | Job queue & messaging | BullMQ client | `src/lib/queue.ts` |
| PostgreSQL | Primary database | Prisma ORM | `prisma/schema.prisma` |

### Internal Integration Points

- **Frontend ↔ Backend**: Next.js API routes with TanStack Query for state management
- **Web Server ↔ Worker**: BullMQ queues with Redis pub/sub for real-time updates
- **Database ↔ File System**: Mixed storage strategy with database metadata and file-based results
- **Multiple Data Sources**: Complex fallback chain for candlestick data retrieval

## Development and Deployment

### Local Development Setup

1. **Required Services**: PostgreSQL, Redis, Freqtrade installation
2. **Dual Process Setup**: Web server (`pnpm dev`) + Worker process (`pnpm worker`)
3. **Environment Configuration**: Complex Freqtrade path mapping and containerization options
4. **Database Migrations**: Required Prisma client generation and schema updates

### Build and Deployment Process

- **Build Command**: `pnpm build` with Prisma client pre-generation
- **Deployment**: Docker containerization with multi-service setup (app, worker, postgres, redis)
- **Environments**: Development, staging, production with environment-specific configurations

## Testing Reality

### Current Test Coverage

- **Unit Tests**: Minimal test coverage detected
- **Integration Tests**: Limited API endpoint testing
- **E2E Tests**: Playwright configuration exists but test coverage unknown
- **Manual Testing**: Primary QA method during development

### Running Tests

```bash
pnpm test           # Test runner configuration unclear
pnpm lint           # ESLint for code quality
```

## Enhancement Impact Analysis - K-line Chart Feature

### Files That Will Need Modification

Based on the epic requirements for K-line chart enhancement:

- `src/app/[locale]/backtests/[id]/page.tsx` - Already has "K线图" tab with EnhancedTradingChart, needs performance optimization
- `src/components/EnhancedTradingChart.tsx` - Component exists but needs performance improvements for large datasets
- `src/app/api/backtests/[id]/chart-data/route.ts` - API exists but needs optimization for data preprocessing
- `src/types/chart.ts` - May need extensions for enhanced chart features

### New Files/Modules Needed

- **Performance Optimizations**: Virtualized rendering or data aggregation for large datasets
- **Enhanced API Endpoints**: Optimized data endpoints with better caching and preprocessing
- **Chart Interaction Improvements**: Better zoom, pan, and crosshair functionality

### Integration Considerations

- **Existing Tab Structure**: K-line tab already exists in backtest detail page
- **Data Pipeline**: Multi-source data retrieval already implemented
- **Performance Bottlenecks**: Large candlestick datasets may cause frontend performance issues
- **Real-time Updates**: Existing polling mechanism may need optimization

## Appendix - Useful Commands and Scripts

### Frequently Used Commands

```bash
pnpm dev             # Start development server on port 5173
pnpm worker          # Start background worker process
pnpm build           # Build Next.js application
pnpm db:migrate      # Run database migrations
pnpm db:generate     # Generate Prisma client
pnpm lint            # Run ESLint
```

### Debugging and Troubleshooting

- **Worker Logs**: Console output from worker processes shows job execution details
- **Redis Connection**: Debug logging enabled in queue setup for connection issues
- **Backtest Status**: Complex status determination logic logged for troubleshooting
- **File Path Resolution**: Multiple fallback paths logged when data files are not found

### Environment Configuration

Critical environment variables:
- `DATABASE_URL` - PostgreSQL connection
- `REDIS_URL` - Redis connection for queues
- `FREQTRADE_PATH` - Path to Freqtrade executable
- `FREQTRADE_USER_DATA_PATH` - Local data directory
- `FREQTRADE_CONTAINER_USER_DATA_PATH` - Container path mapping