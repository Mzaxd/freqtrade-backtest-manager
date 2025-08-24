# High Level Architecture

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
