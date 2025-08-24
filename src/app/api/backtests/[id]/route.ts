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
    const {
      page = 1,
      limit = 10,
      sortBy = 'open_date',
      sortOrder = 'desc',
      pair,
      exitReason
    } = GetBacktestTradesSchema.parse(queryParams);

    // 1. Define where condition for filtering trades
    const whereCondition: any = { backtestTaskId: id };
    if (pair) {
      whereCondition.pair = { contains: pair, mode: 'insensitive' };
    }
    if (exitReason) {
      whereCondition.exit_reason = exitReason;
    }

    // 2. Fetch paginated and sorted trades and total count in parallel
    const [trades, totalCount] = await prisma.$transaction([
      prisma.trade.findMany({
        where: whereCondition,
        orderBy: {
          [sortBy]: sortOrder,
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.trade.count({ where: whereCondition }),
    ]);

    // 3. Fetch main backtest task details
    const backtest = await prisma.backtestTask.findUnique({
      where: { id: id },
      include: {
        strategy: true,
        config: true,
      },
    });

    if (!backtest) {
      return NextResponse.json({ error: 'Backtest not found' }, { status: 404 });
    }

    // 4. Get distinct exit reasons
    const exitReasonResults = await prisma.trade.findMany({
      where: { backtestTaskId: id },
      select: { exit_reason: true },
      distinct: ['exit_reason'],
    });
    const exitReasons = exitReasonResults.map(r => r.exit_reason);

    // 5. Construct the response
    const response = {
      ...backtest,
      trades: trades,
      tradesCount: totalCount,
      exitReasons,
      summary: backtest.resultsSummary, // Use summary from the database
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
