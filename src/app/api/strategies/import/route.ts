import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { readdir, readFile, stat } from 'fs/promises'
import { join } from 'path'

const getStrategiesPath = () => {
  const userDataPath = process.env.FREQTRADE_USER_DATA_PATH || join(process.cwd(), 'ft_user_data');
  return join(userDataPath, 'strategies');
};

interface StrategyFile {
  filename: string;
  filepath: string;
  className?: string;
  content: string;
  size: number;
  lastModified: Date;
}

async function scanStrategyFiles(): Promise<StrategyFile[]> {
  const strategiesPath = getStrategiesPath();
  const strategyFiles: StrategyFile[] = [];

  try {
    const files = await readdir(strategiesPath);
    
    for (const file of files) {
      if (!file.endsWith('.py')) continue;
      
      const filepath = join(strategiesPath, file);
      const fileStat = await stat(filepath);
      
      const content = await readFile(filepath, 'utf-8');
      const match = content.match(/class\s+([a-zA-Z0-9_]+)\s*\(/);
      
      strategyFiles.push({
        filename: file,
        filepath,
        className: match ? match[1] : undefined,
        content,
        size: fileStat.size,
        lastModified: fileStat.mtime
      });
    }
  } catch (error) {
    console.error('Error scanning strategy files:', error);
  }

  return strategyFiles;
}

export async function GET() {
  try {
    console.log('[DEBUG] Scanning for strategy files to import...');
    
    // Get existing strategies from database
    const existingStrategies = await prisma.strategy.findMany({
      select: { filename: true }
    });
    const existingFilenames = new Set(existingStrategies.map(s => s.filename));
    
    // Scan for strategy files
    const strategyFiles = await scanStrategyFiles();
    
    // Filter out already imported files
    const availableFiles = strategyFiles.filter(file => !existingFilenames.has(file.filename));
    
    console.log(`[DEBUG] Found ${strategyFiles.length} strategy files, ${availableFiles.length} available for import`);
    
    return NextResponse.json({
      success: true,
      data: {
        total: strategyFiles.length,
        available: availableFiles.length,
        existing: existingFilenames.size,
        files: availableFiles.map(file => ({
          filename: file.filename,
          className: file.className,
          size: file.size,
          lastModified: file.lastModified
        }))
      },
      message: 'Strategy files scanned successfully'
    });
  } catch (error) {
    console.error('[DEBUG] Error scanning strategy files:', error);
    return NextResponse.json(
      {
        error: 'Failed to scan strategy files',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { filenames } = body;

    if (!filenames || !Array.isArray(filenames) || filenames.length === 0) {
      return NextResponse.json(
        { error: 'No filenames provided for import' },
        { status: 400 }
      );
    }

    console.log(`[DEBUG] Starting import of ${filenames.length} strategy files...`);
    
    const strategiesPath = getStrategiesPath();
    const importedStrategies: any[] = [];
    const errors: { filename: string; error: string }[] = [];

    await prisma.$transaction(async (tx) => {
      for (const filename of filenames) {
        try {
          const filepath = join(strategiesPath, filename);
          const content = await readFile(filepath, 'utf-8');
          
          // Extract class name
          const match = content.match(/class\s+([a-zA-Z0-9_]+)\s*\(/);
          if (!match || !match[1]) {
            errors.push({
              filename,
              error: 'Could not parse class name from strategy file'
            });
            continue;
          }
          const className = match[1];

          // Check if already exists using the transaction client
          const existingStrategy = await tx.strategy.findUnique({
            where: { filename }
          });

          if (existingStrategy) {
            errors.push({
              filename,
              error: 'Strategy already exists in database'
            });
            continue;
          }

          // Create strategy record using the transaction client
          const strategy = await tx.strategy.create({
            data: {
              filename,
              className,
              description: `Imported from user_data on ${new Date().toLocaleDateString()}`
            }
          });

          importedStrategies.push(strategy);
          console.log(`[DEBUG] Successfully imported strategy: ${filename}`);
          
        } catch (error) {
          console.error(`[DEBUG] Error importing strategy ${filename}:`, error);
          errors.push({
            filename,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
    }); // End of transaction

    return NextResponse.json({
      success: true,
      data: {
        imported: importedStrategies.length,
        total: filenames.length,
        strategies: importedStrategies,
        errors
      },
      message: `Successfully imported ${importedStrategies.length} of ${filenames.length} strategies`
    });
  } catch (error) {
    console.error('[DEBUG] Error importing strategies:', error);
    return NextResponse.json(
      {
        error: 'Failed to import strategies',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}