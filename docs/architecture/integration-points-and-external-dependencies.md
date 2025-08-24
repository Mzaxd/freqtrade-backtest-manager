# Integration Points and External Dependencies

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
