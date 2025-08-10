import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import path from 'path';
import { promises as fs } from 'fs';
import AdmZip from 'adm-zip';
import os from 'os';

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

interface Trade {
  pair: string;
  open_date: string;
  close_date: string;
  profit_abs: number;
  profit_pct: number;
  open_rate: number;
  close_rate: number;
  amount: number;
  stake_amount: number;
  trade_duration: number;
  exit_reason: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const sortBy = searchParams.get('sortBy') || 'open_date';
    const sortOrder = searchParams.get('sortOrder') || 'desc';
    const pair = searchParams.get('pair');
    const exitReason = searchParams.get('exitReason');

    const backtest = await prisma.backtestTask.findUnique({
      where: { id: params.id },
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

    let allTrades: Trade[] = [];

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
          if (parsedResult.strategy && parsedResult.strategy[backtest.strategy.className] && parsedResult.strategy[backtest.strategy.className].trades) {
            allTrades = parsedResult.strategy[backtest.strategy.className].trades;
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
    let filteredTrades = allTrades;
    if (pair) {
      filteredTrades = filteredTrades.filter(trade => trade.pair.toLowerCase().includes(pair.toLowerCase()));
    }
    if (exitReason) {
      filteredTrades = filteredTrades.filter(trade => trade.exit_reason === exitReason);
    }

    const exitReasons = Array.from(new Set(allTrades.map(t => t.exit_reason)));

    // Apply sorting
    filteredTrades.sort((a, b) => {
      const aValue = (a as any)[sortBy];
      const bValue = (b as any)[sortBy];

      if (aValue < bValue) {
        return sortOrder === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortOrder === 'asc' ? 1 : -1;
      }
      return 0;
    });

    const totalCount = filteredTrades.length;

    // Apply pagination
    const paginatedTrades = filteredTrades.slice((page - 1) * limit, page * limit);

    const response = {
      ...backtest,
      trades: paginatedTrades,
      tradesCount: totalCount,
      exitReasons,
    };

    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch backtest' },
      { status: 500 }
    )
  }
}

export async function HEAD(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const backtest = await prisma.backtestTask.findUnique({
      where: { id: params.id },
    })

    if (!backtest) {
      return new NextResponse(null, { status: 404 })
    }

    return new NextResponse(null, { status: 200 })
  } catch (error) {
    return new NextResponse(null, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.backtestTask.delete({
      where: { id: params.id },
    })
    return new NextResponse(null, { status: 204 })
  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json(
        { error: 'Backtest not found' },
        { status: 404 }
      )
    }
    return NextResponse.json(
      { error: 'Failed to delete backtest' },
      { status: 500 }
    )
  }
}
