import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import path from 'path'
import { promises as fs } from 'fs'
import AdmZip from 'adm-zip'
import os from 'os'

import {
  ChartDataQuerySchema,
  ChartDataResponseSchema,
  OHLCVDataSchema,
  TradeDataSchema,
  RawCandlestickDataSchema, // Add RawCandlestickDataSchema
  validateQuery,
  createErrorResponse,
  createSuccessResponse,
  validateFilePath,
  sanitizeString
} from '@/lib/validation'

export const runtime = 'nodejs'

// Helper function to check if a file exists
async function fileExists(filePath: string) {
  try {
    await fs.access(filePath)
    return true
  } catch {
    return false
  }
}

// 从回测专用的数据文件中读取K线数据
async function readCandlestickDataFromBacktestFile(
  candleDataFile: string,
  timerangeStart?: Date,
  timerangeEnd?: Date
) {
  if (!candleDataFile) {
    return null;
  }

  console.log(`Attempting to read candle data from backtest file: ${candleDataFile}`);

  if (!(await fileExists(candleDataFile))) {
    console.error(`Backtest candle data file not found at: ${candleDataFile}`);
    return null;
  }

  try {
    const fileContent = await fs.readFile(candleDataFile, 'utf-8');
    const data = JSON.parse(fileContent);

    if (!Array.isArray(data) || data.length === 0) {
      console.error("Candle data is not in the expected array format or is empty.");
      return null;
    }
    
    // Freqtrade数据格式: [timestamp, open, high, low, close, volume]
    let candles = data.map((row: unknown) => {
      const validatedRow = RawCandlestickDataSchema.parse(row); // Validate raw data
      return {
        time: Math.floor(validatedRow.time as number / 1000), // ms to s
        open: validatedRow.open,
        high: validatedRow.high,
        low: validatedRow.low,
        close: validatedRow.close,
        volume: validatedRow.volume,
      };
    });

    // 根据回测时间范围过滤
    if (timerangeStart && timerangeEnd) {
      const startTimestamp = Math.floor(timerangeStart.getTime() / 1000);
      const endTimestamp = Math.floor(timerangeEnd.getTime() / 1000);
      candles = candles.filter(c => c.time >= startTimestamp && c.time <= endTimestamp);
    }
    
    console.log(`Found and parsed ${candles.length} candles from backtest file.`);
    return candles;
  } catch (error) {
    console.error(`Failed to read or parse candle data from ${candleDataFile}:`, error);
    return null;
  }
}

// 从Freqtrade数据目录中读取K线数据（备用方案）
async function readCandlestickDataFromDataDir(
  pair: string,
  timeframe: string,
  timerangeStart?: Date,
  timerangeEnd?: Date
) {
  const userDataPath = process.env.FREQTRADE_USER_DATA_PATH;
  if (!userDataPath) {
    console.error("FREQTRADE_USER_DATA_PATH environment variable is not set.");
    return null;
  }

  // 假设pair格式为 'EXCHANGE:PAIR' 或 'PAIR'
  let exchange = 'binance'; // 默认交易所
  let pairSymbol = pair;
  if (pair.includes(':')) {
    [exchange, pairSymbol] = pair.split(':');
  }

  const pairPath = pairSymbol.replace('/', '_');
  const dataDir = path.join(userDataPath, 'data', exchange.toLowerCase());
  const candleFile = `${pairPath}-${timeframe}.json`;
  const fullPath = path.join(dataDir, candleFile);

  console.log(`Attempting to read candle data from: ${fullPath}`);

  if (!(await fileExists(fullPath))) {
    console.error(`Candle data file not found at: ${fullPath}`);
    return null;
  }

  try {
    const fileContent = await fs.readFile(fullPath, 'utf-8');
    const data = JSON.parse(fileContent);

    if (!Array.isArray(data) || data.length === 0) {
      console.error("Candle data is not in the expected array format or is empty.");
      return null;
    }
    
    // Freqtrade数据格式: [timestamp, open, high, low, close, volume]
    let candles = data.map((row: unknown) => {
      const validatedRow = RawCandlestickDataSchema.parse(row); // Validate raw data
      return {
        time: Math.floor(validatedRow.time as number / 1000), // ms to s
        open: validatedRow.open,
        high: validatedRow.high,
        low: validatedRow.low,
        close: validatedRow.close,
        volume: validatedRow.volume,
      };
    });

    // 根据回测时间范围过滤
    if (timerangeStart && timerangeEnd) {
      const startTimestamp = Math.floor(timerangeStart.getTime() / 1000);
      const endTimestamp = Math.floor(timerangeEnd.getTime() / 1000);
      candles = candles.filter(c => c.time >= startTimestamp && c.time <= endTimestamp);
    }
    
    console.log(`Found and parsed ${candles.length} candles for ${pair}.`);
    return candles;
  } catch (error) {
    console.error(`Failed to read or parse candle data from ${fullPath}:`, error);
    return null;
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    
    // Validate query parameters
    const query = {
      timeframe: searchParams.get('timeframe') || '5m',
      pair: searchParams.get('pair'),
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset'),
      startTime: searchParams.get('startTime'),
      endTime: searchParams.get('endTime')
    }
    
    const validatedQuery = validateQuery(ChartDataQuerySchema, query)
    
    if (!validatedQuery.pair) {
      return NextResponse.json(
        createErrorResponse('VALIDATION_ERROR', 'Pair parameter is required', 'MISSING_PAIR'),
        { status: 400 }
      );
    }
    
    const backtest = await prisma.backtestTask.findUnique({
      where: { id: id },
      include: {
        strategy: true,
        config: true,
        trades: {
          orderBy: { open_date: 'asc' },
          where: { pair: validatedQuery.pair }
        }
      },
    });
    
    if (!backtest) {
      return NextResponse.json(
        createErrorResponse('NOT_FOUND', 'Backtest not found', 'BACKTEST_NOT_FOUND'),
        { status: 404 }
      );
    }
    
    // 优先从回测专用的数据文件中读取K线数据
    let candleData = null;
    if (backtest.candleDataFile) {
      // Validate file path to prevent directory traversal
      if (!validateFilePath(backtest.candleDataFile)) {
        return NextResponse.json(
          createErrorResponse('VALIDATION_ERROR', 'Invalid file path', 'INVALID_FILE_PATH'),
          { status: 400 }
        );
      }
      
      candleData = await readCandlestickDataFromBacktestFile(
        backtest.candleDataFile,
        backtest.timerangeStart || undefined,
        backtest.timerangeEnd || undefined
      );
    }
    
    // 如果没有专用的数据文件，则从原始数据目录读取
    if (!candleData) {
      candleData = await readCandlestickDataFromDataDir(
        validatedQuery.pair,
        validatedQuery.timeframe,
        backtest.timerangeStart || undefined,
        backtest.timerangeEnd || undefined
      );
    }

    // 转换交易数据格式
    const trades = backtest.trades.map((trade) => ({
      pair: sanitizeString(trade.pair),
      open_date: trade.open_date.toISOString(),
      close_date: trade.close_date.toISOString(),
      profit_abs: trade.profit_abs,
      profit_pct: trade.profit_pct,
      open_rate: trade.open_rate,
      close_rate: trade.close_rate,
      amount: trade.amount,
      stake_amount: trade.stake_amount,
      trade_duration: trade.trade_duration,
      exit_reason: sanitizeString(trade.exit_reason),
    }));

    // Validate response data
    const validatedCandles = candleData || []
    const validatedTrades = trades.filter(trade => {
      try {
        TradeDataSchema.parse(trade)
        return true
      } catch {
        return false
      }
    })

    // Apply pagination if specified
    let finalCandles = validatedCandles
    if (validatedQuery.limit) {
      const offset = validatedQuery.offset || 0
      finalCandles = validatedCandles.slice(offset, offset + validatedQuery.limit)
    }

    const response = {
      candles: finalCandles,
      trades: validatedTrades,
      timeframe: validatedQuery.timeframe,
      pair: validatedQuery.pair,
      metadata: {
        totalCandles: validatedCandles.length,
        totalTrades: validatedTrades.length,
        dateRange: {
          start: backtest.timerangeStart || new Date(),
          end: backtest.timerangeEnd || new Date()
        },
        generatedAt: new Date()
      }
    };
    
    // Validate final response
    const validatedResponse = ChartDataResponseSchema.parse(response)
    
    return NextResponse.json(createSuccessResponse(validatedResponse))
  } catch (error) {
    console.error('Failed to fetch chart data:', error)
    
    if (error instanceof Error) {
      if (error.message.includes('Validation failed')) {
        return NextResponse.json(
          createErrorResponse('VALIDATION_ERROR', error.message, 'VALIDATION_FAILED'),
          { status: 400 }
        )
      }
    }
    
    return NextResponse.json(
      createErrorResponse('INTERNAL_ERROR', 'Failed to fetch chart data', 'CHART_DATA_FETCH_FAILED', error),
      { status: 500 }
    )
  }
}