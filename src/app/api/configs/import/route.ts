import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { readdir, readFile, stat } from 'fs/promises'
import { join } from 'path'

const getConfigsPath = () => {
  const userDataPath = process.env.FREQTRADE_USER_DATA_PATH || join(process.cwd(), 'ft_user_data');
  return join(userDataPath, 'configs');
};

interface ConfigFile {
  filename: string;
  filepath: string;
  content: string;
  size: number;
  lastModified: Date;
  parsedConfig?: any;
}

async function scanConfigFiles(): Promise<ConfigFile[]> {
  const configsPath = getConfigsPath();
  const configFiles: ConfigFile[] = [];

  try {
    const files = await readdir(configsPath);
    
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      
      const filepath = join(configsPath, file);
      const fileStat = await stat(filepath);
      
      const content = await readFile(filepath, 'utf-8');
      let parsedConfig;
      
      try {
        parsedConfig = JSON.parse(content);
      } catch (parseError) {
        console.warn(`Warning: Could not parse JSON from ${file}:`, parseError);
        continue;
      }
      
      configFiles.push({
        filename: file,
        filepath,
        content,
        size: fileStat.size,
        lastModified: fileStat.mtime,
        parsedConfig
      });
    }
  } catch (error) {
    console.error('Error scanning config files:', error);
  }

  return configFiles;
}

export async function GET() {
  try {
    console.log('[DEBUG] Scanning for config files to import...');
    
    // Get existing configs from database
    const existingConfigs = await prisma.config.findMany({
      select: { filename: true }
    });
    const existingFilenames = new Set(existingConfigs.map(c => c.filename));
    
    // Scan for config files
    const configFiles = await scanConfigFiles();
    
    // Filter out already imported files
    const availableFiles = configFiles.filter(file => !existingFilenames.has(file.filename));
    
    console.log(`[DEBUG] Found ${configFiles.length} config files, ${availableFiles.length} available for import`);
    
    return NextResponse.json({
      success: true,
      data: {
        total: configFiles.length,
        available: availableFiles.length,
        existing: existingFilenames.size,
        files: availableFiles.map(file => ({
          filename: file.filename,
          name: file.parsedConfig?.bot_name || file.filename.replace('.json', ''),
          timeframe: file.parsedConfig?.timeframe || 'N/A',
          exchange: file.parsedConfig?.exchange?.name || 'N/A',
          size: file.size,
          lastModified: file.lastModified
        }))
      },
      message: 'Configuration files scanned successfully'
    });
  } catch (error) {
    console.error('[DEBUG] Error scanning config files:', error);
    return NextResponse.json(
      {
        error: 'Failed to scan config files',
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

    console.log(`[DEBUG] Starting import of ${filenames.length} config files...`);
    
    const configsPath = getConfigsPath();
    const importedConfigs = [];
    const errors = [];

    for (const filename of filenames) {
      try {
        const filepath = join(configsPath, filename);
        const content = await readFile(filepath, 'utf-8');
        
        // Parse JSON config
        let parsedConfig;
        try {
          parsedConfig = JSON.parse(content);
        } catch (parseError) {
          errors.push({
            filename,
            error: 'Invalid JSON format in config file'
          });
          continue;
        }

        // Validate required fields
        if (!parsedConfig.timeframe) {
          errors.push({
            filename,
            error: 'Missing required field: timeframe'
          });
          continue;
        }

        // Check if already exists
        const existingConfig = await prisma.config.findUnique({
          where: { filename }
        });

        if (existingConfig) {
          errors.push({
            filename,
            error: 'Configuration already exists in database'
          });
          continue;
        }

        // Clean config data (remove sensitive or problematic fields)
        const cleanConfig = { ...parsedConfig };
        delete cleanConfig.log_config;
        delete cleanConfig.logfile;
        delete cleanConfig.forcebuy_enable;

        // Generate config name
        const configName = parsedConfig.bot_name || filename.replace('.json', '');

        // Create config record
        const config = await prisma.config.create({
          data: {
            name: configName,
            filename,
            description: `Imported from user_data on ${new Date().toLocaleDateString()}`,
            data: cleanConfig
          }
        });

        importedConfigs.push(config);
        console.log(`[DEBUG] Successfully imported config: ${filename}`);
        
      } catch (error) {
        console.error(`[DEBUG] Error importing config ${filename}:`, error);
        errors.push({
          filename,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        imported: importedConfigs.length,
        total: filenames.length,
        configs: importedConfigs,
        errors
      },
      message: `Successfully imported ${importedConfigs.length} of ${filenames.length} configurations`
    });
  } catch (error) {
    console.error('[DEBUG] Error importing configs:', error);
    return NextResponse.json(
      {
        error: 'Failed to import configurations',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}