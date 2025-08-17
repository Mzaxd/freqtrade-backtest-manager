import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { readdir, readFile, stat } from 'fs/promises'
import { join } from 'path'

const getDataPath = () => {
  const userDataPath = process.env.FREQTRADE_USER_DATA_PATH || join(process.cwd(), 'ft_user_data');
  return join(userDataPath, 'data');
};

interface DataFile {
  filename: string;
  filepath: string;
  exchange: string;
  pair: string;
  timeframe: string;
  format: string;
  size: number;
  lastModified: Date;
  marketType: string;
}

async function parseDataFilename(filename: string, exchange: string): Promise<Partial<DataFile>> {
  // Parse filename format: PAIR-TIMEFRAME.format (e.g., BTC_USDT-1h.json)
  const match = filename.match(/^(.+)-(\d+[mhdwM])\.(json|feather|parquet)$/i);
  if (!match) {
    return {};
  }

  const [, pair, timeframe, format] = match;
  
  return {
    pair: pair.replace('_', '/'), // Convert back to standard format
    timeframe: timeframe.toLowerCase(),
    format: format.toLowerCase()
  };
}

async function scanDataFiles(): Promise<DataFile[]> {
  const dataPath = getDataPath();
  const dataFiles: DataFile[] = [];

  try {
    const exchanges = await readdir(dataPath);
    
    for (const exchange of exchanges) {
      const exchangePath = join(dataPath, exchange);
      const exchangeStat = await stat(exchangePath);
      
      if (!exchangeStat.isDirectory()) continue;
      
      const files = await readdir(exchangePath);
      
      for (const file of files) {
        const filepath = join(exchangePath, file);
        const fileStat = await stat(filepath);
        
        if (!fileStat.isFile()) continue;
        
        // Parse filename to extract pair, timeframe, format
        const parsed = await parseDataFilename(file, exchange);
        
        if (!parsed.pair || !parsed.timeframe || !parsed.format) {
          console.warn(`Skipping file with invalid format: ${file}`);
          continue;
        }
        
        dataFiles.push({
          filename: file,
          filepath,
          exchange,
          pair: parsed.pair,
          timeframe: parsed.timeframe,
          format: parsed.format,
          size: fileStat.size,
          lastModified: fileStat.mtime,
          marketType: 'spot' // Default to spot, could be enhanced to detect from path
        });
      }
    }
  } catch (error) {
    console.error('Error scanning data files:', error);
  }

  return dataFiles;
}

async function getDataFileTimeRange(filepath: string, format: string): Promise<{ start?: Date; end?: Date }> {
  try {
    if (format === 'json') {
      const content = await readFile(filepath, 'utf-8');
      const data = JSON.parse(content);
      
      if (Array.isArray(data) && data.length > 0) {
        return {
          start: new Date(data[0].date || data[0].timestamp),
          end: new Date(data[data.length - 1].date || data[data.length - 1].timestamp)
        };
      }
    }
    // Note: For feather/parquet files, we would need additional libraries
    // For now, we'll just return undefined and rely on file modification time
  } catch (error) {
    console.warn(`Could not read time range from ${filepath}:`, error);
  }
  
  return {};
}

export async function GET() {
  try {
    console.log('[DEBUG] Scanning for data files to import...');
    
    // Get existing market data from database
    const existingMarketData = await prisma.marketData.findMany({
      select: {
        exchange: true,
        pair: true,
        timeframe: true,
        marketType: true
      }
    });
    
    // Create unique key for existing data
    const existingKeys = new Set(
      existingMarketData.map(d => `${d.exchange}:${d.pair}:${d.timeframe}:${d.marketType}`)
    );
    
    // Scan for data files
    const dataFiles = await scanDataFiles();
    
    // Filter out already imported files
    const availableFiles = dataFiles.filter(file => {
      const key = `${file.exchange}:${file.pair}:${file.timeframe}:${file.marketType}`;
      return !existingKeys.has(key);
    });
    
    console.log(`[DEBUG] Found ${dataFiles.length} data files, ${availableFiles.length} available for import`);
    
    return NextResponse.json({
      success: true,
      data: {
        total: dataFiles.length,
        available: availableFiles.length,
        existing: existingKeys.size,
        files: availableFiles.map(file => ({
          filename: file.filename,
          exchange: file.exchange,
          pair: file.pair,
          timeframe: file.timeframe,
          format: file.format,
          marketType: file.marketType,
          size: file.size,
          lastModified: file.lastModified
        }))
      },
      message: 'Data files scanned successfully'
    });
  } catch (error) {
    console.error('[DEBUG] Error scanning data files:', error);
    return NextResponse.json(
      {
        error: 'Failed to scan data files',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { files } = body;

    if (!files || !Array.isArray(files) || files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided for import' },
        { status: 400 }
      );
    }

    console.log(`[DEBUG] Starting import of ${files.length} data files...`);
    
    const importedData = [];
    const errors = [];

    for (const fileData of files) {
      try {
        const { filename, exchange, pair, timeframe, format, marketType = 'spot' } = fileData;
        
        // Validate required fields
        if (!exchange || !pair || !timeframe || !format) {
          errors.push({
            filename,
            error: 'Missing required fields: exchange, pair, timeframe, or format'
          });
          continue;
        }

        // Get file path
        const filepath = join(getDataPath(), exchange, filename);
        
        // Check if file exists
        try {
          await stat(filepath);
        } catch {
          errors.push({
            filename,
            error: 'File not found in data directory'
          });
          continue;
        }

        // Check if already exists
        const existingData = await prisma.marketData.findUnique({
          where: {
            exchange_pair_timeframe_marketType: {
              exchange,
              pair,
              timeframe,
              marketType
            }
          }
        });

        if (existingData) {
          errors.push({
            filename,
            error: 'Market data already exists in database'
          });
          continue;
        }

        // Get time range if possible
        const timeRange = await getDataFileTimeRange(filepath, format);
        
        // Create market data record
        const marketData = await prisma.marketData.create({
          data: {
            exchange,
            pair,
            timeframe,
            marketType,
            status: 'available',
            filePath: filepath,
            startTime: timeRange.start,
            endTime: timeRange.end
          }
        });

        importedData.push(marketData);
        console.log(`[DEBUG] Successfully imported market data: ${exchange}/${pair}/${timeframe}`);
        
      } catch (error) {
        console.error(`[DEBUG] Error importing data ${fileData.filename}:`, error);
        errors.push({
          filename: fileData.filename,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        imported: importedData.length,
        total: files.length,
        marketData: importedData,
        errors
      },
      message: `Successfully imported ${importedData.length} of ${files.length} market data entries`
    });
  } catch (error) {
    console.error('[DEBUG] Error importing data:', error);
    return NextResponse.json(
      {
        error: 'Failed to import market data',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}