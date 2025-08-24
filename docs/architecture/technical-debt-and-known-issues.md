# Technical Debt and Known Issues

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
