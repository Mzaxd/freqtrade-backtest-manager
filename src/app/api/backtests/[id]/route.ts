import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import path from 'path';
import { promises as fs } from 'fs';
import AdmZip from 'adm-zip';
import os from 'os';
import { z } from 'zod';
import { TradeData } from '@/types/chart'; // Import TradeData
import type { BacktestResultsSummary } from '@/types/chart'; // Import BacktestResultsSummary as type

export const runtime = 'nodejs'

// Helper function to check if a file exists
async function fileExists(filePath: string) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

// Zod schema for GET request query parameters
const GetBacktestTradesSchema = z.object({
  page: z.preprocess(
    (val) => parseInt(z.string().parse(val), 10),
    z.number().min(1).default(1)
  ).optional(),
  limit: z.preprocess(
    (val) => parseInt(z.string().parse(val), 10),
    z.number().min(1).default(10)
  ).optional(),
  sortBy: z.enum(['open_date', 'close_date', 'profit_abs', 'profit_pct', 'trade_duration']).default('open_date').optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc').optional(),
  pair: z.string().optional(),
  exitReason: z.string().optional(),
});

// Zod schema for params
const ParamsSchema = z.object({
  id: z.string().cuid(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const { id } = await ParamsSchema.parseAsync(resolvedParams);
    const { searchParams } = new URL(request.url);
    
    const queryParams = Object.fromEntries(searchParams.entries());
    const { page, limit, sortBy, sortOrder, pair, exitReason } = GetBacktestTradesSchema.parse(queryParams);

    const backtest = await prisma.backtestTask.findUnique({
      where: { id: id },
      include: {
        strategy: true,
        config: true,
      },
    })

    if (!backtest) {
      return NextResponse.json(
        { error: 'Backtest not found' },
        { status: 404 }
      )
    }

    let allTrades: TradeData[] = [];
    let summary: BacktestResultsSummary = {} as BacktestResultsSummary; // Initialize with a type assertion

    if (backtest.rawOutputPath && backtest.strategy?.className) {
      let resultFileContent: string | undefined;
      let tempDir: string | undefined;

      try {
        const fullMetaJsonPath = backtest.rawOutputPath; // Assuming rawOutputPath is a full path to the .meta.json file

        const backtestResultDir = path.dirname(fullMetaJsonPath);
        const baseFileName = path.basename(fullMetaJsonPath, '.meta.json');
        const zipFilePath = path.join(backtestResultDir, baseFileName + '.zip');

        if (await fileExists(zipFilePath)) {
          // Handle zip file
          tempDir = path.join(os.tmpdir(), `freqtrade-backtest-${backtest.id}`);
          const zip = new AdmZip(zipFilePath);
          if (tempDir) {
            zip.extractAllTo(tempDir, true);
          }

          const jsonFileName = baseFileName + '.json';
          const jsonFilePathInTemp = path.join(tempDir, jsonFileName);

          if (await fileExists(jsonFilePathInTemp)) {
            resultFileContent = await fs.readFile(jsonFilePathInTemp, 'utf-8');
          } else {
            console.warn(`JSON file not found in zip: ${jsonFileName}`);
          }
        } else {
          console.warn(`Zip file not found: ${zipFilePath}`);
        }

        if (resultFileContent) {
          const parsedResult = JSON.parse(resultFileContent);
          
          // Handle both strategies object and direct strategy object
          let strategyData = null;
          if (parsedResult.strategy && parsedResult.strategy[backtest.strategy.className]) {
            strategyData = parsedResult.strategy[backtest.strategy.className];
          } else if (parsedResult[backtest.strategy.className]) {
            strategyData = parsedResult[backtest.strategy.className];
          }
          
          if (strategyData) {
            if (strategyData.trades) {
              allTrades = strategyData.trades;
            }
            // Extract summary data (all keys except 'trades')
            // Ensure all properties are copied to summary
            summary = { ...strategyData };
            delete summary.trades; // Remove the trades array if it exists
          }
        }

      } catch (fileError) {
        console.error('Failed to read backtest result file or parse trades:', fileError);
      } finally {
        if (tempDir) {
          try {
            await fs.rm(tempDir, { recursive: true, force: true });
          } catch (cleanupError) {
            console.error('Failed to clean up temporary directory:', cleanupError);
          }
        }
      }
    }

    // Apply filtering
    let filteredTrades: TradeData[] = allTrades;
    if (pair) {
      filteredTrades = filteredTrades.filter(trade => trade.pair.toLowerCase().includes(pair.toLowerCase()));
    }
    if (exitReason) {
      filteredTrades = filteredTrades.filter(trade => trade.exit_reason === exitReason);
    }

    const exitReasons = Array.from(new Set(allTrades.map(t => t.exit_reason)));

    // Apply sorting
    filteredTrades.sort((a, b) => {
      const aValue = a[sortBy as keyof TradeData];
      const bValue = b[sortBy as keyof TradeData];

      // Handle string comparison for dates and other string fields
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortOrder === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
      }
      // Handle number comparison for numeric fields
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
      }
      // Fallback for other types or mixed types (shouldn't happen with current sortBy options)
      return 0;
    });

    const totalCount = filteredTrades.length;

    // Apply pagination
    const paginatedTrades = filteredTrades.slice(((page ?? 1) - 1) * (limit ?? 10), (page ?? 1) * (limit ?? 10));

    const response = {
      ...backtest,
      trades: paginatedTrades,
      tradesCount: totalCount,
      exitReasons,
      summary,
    };

    return NextResponse.json(response);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request parameters', details: error.issues }, { status: 400 });
    }
    console.error('Failed to fetch backtest:', error);
    return NextResponse.json(
      { error: 'Failed to fetch backtest', details: error.message || 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function HEAD(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const { id } = await ParamsSchema.parseAsync(resolvedParams);
    const backtest = await prisma.backtestTask.findUnique({
      where: { id: id },
    })

    if (!backtest) {
      return new NextResponse(null, { status: 404 })
    }

    return new NextResponse(null, { status: 200 })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return new NextResponse(null, { status: 400, statusText: 'Invalid request parameters' });
    }
    console.error('Failed to fetch backtest HEAD:', error);
    return new NextResponse(null, { status: 500, statusText: 'Internal Server Error' });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params;
    const { id } = await ParamsSchema.parseAsync(resolvedParams);
    await prisma.backtestTask.delete({
      where: { id: id },
    })
    return new NextResponse(null, { status: 204 })
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request parameters', details: error.issues }, { status: 400 });
    }
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Backtest not found', details: error.message },
        { status: 404 }
      )
    }
    console.error('Failed to delete backtest:', error);
    return NextResponse.json(
      { error: 'Failed to delete backtest', details: error.message || 'Unknown error' },
      { status: 500 }
    )
  }
}
