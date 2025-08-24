# Data Models and APIs

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
