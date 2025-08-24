# Appendix - Useful Commands and Scripts

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