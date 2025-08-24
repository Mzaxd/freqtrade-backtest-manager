# Development and Deployment

### Local Development Setup

1. **Required Services**: PostgreSQL, Redis, Freqtrade installation
2. **Dual Process Setup**: Web server (`pnpm dev`) + Worker process (`pnpm worker`)
3. **Environment Configuration**: Complex Freqtrade path mapping and containerization options
4. **Database Migrations**: Required Prisma client generation and schema updates

### Build and Deployment Process

- **Build Command**: `pnpm build` with Prisma client pre-generation
- **Deployment**: Docker containerization with multi-service setup (app, worker, postgres, redis)
- **Environments**: Development, staging, production with environment-specific configurations
