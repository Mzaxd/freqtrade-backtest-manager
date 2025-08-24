# Quick Reference - Key Files and Entry Points

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
