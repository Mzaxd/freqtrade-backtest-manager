# Source Tree and Module Organization

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
