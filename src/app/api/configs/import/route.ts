import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { readdir, readFile, stat } from 'fs/promises'
import { join } from 'path'
import { z } from 'zod'
import { APIErrorResponse } from '@/types/chart'
import { Prisma } from '@prisma/client' // Import Prisma namespace

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

// Zod schema for a single config file entry in the GET response
const ConfigFileSchema = z.object({
  filename: z.string(),
  name: z.string(),
  timeframe: z.string(),
  exchange: z.string(),
  size: z.number(),
  lastModified: z.date(),
});

// Zod schema for the GET response data
const GetImportConfigsResponseDataSchema = z.object({
  total: z.number(),
  available: z.number(),
  existing: z.number(),
  files: z.array(ConfigFileSchema),
});

// Zod schema for the POST request body
const ImportConfigsRequestSchema = z.object({
  filenames: z.array(z.string().min(1, 'Filename cannot be empty')).min(1, 'At least one filename is required for import'),
});

// Zod schema for the POST response data (for a single imported config)
const ImportedConfigSchema = z.object({
  id: z.number(),
  name: z.string(),
  filename: z.string(),
  description: z.string().optional(),
  data: z.record(z.string(), z.any()), // Assuming data can be any JSON structure
  createdAt: z.date(),
  updatedAt: z.date(),
});

// Zod schema for the POST response data (for errors)
const ImportErrorSchema = z.object({
  filename: z.string(),
  error: z.string(),
});

// Zod schema for the POST response data
const PostImportConfigsResponseDataSchema = z.object({
  imported: z.number(),
  total: z.number(),
  configs: z.array(ImportedConfigSchema),
  errors: z.array(ImportErrorSchema),
});

// Basic schema for freqtrade config files (partial, focus on relevant fields)
const FreqtradeConfigSchema = z.object({
  timeframe: z.string().min(1, 'Timeframe is required in config file'),
  bot_name: z.string().optional(),
  exchange: z.object({
    name: z.string().optional(),
  }).optional(),
  // Add other fields you expect in the config file if needed for validation
}).passthrough(); // Allow other fields not defined in the schema

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
    
    const responseData = {
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
    };
    
    // Validate the response data against the schema
    const validatedResponseData = GetImportConfigsResponseDataSchema.parse(responseData);

    return NextResponse.json({
      success: true,
      data: validatedResponseData,
      message: 'Configuration files scanned successfully'
    });
  } catch (error: any) {
    console.error('[DEBUG] Error scanning config files:', error);
    const errorResponse: APIErrorResponse = {
      error: 'Failed to scan config files',
      details: error instanceof z.ZodError ? error.issues : (error.message || 'Unknown error'),
      type: error instanceof z.ZodError ? 'VALIDATION_ERROR' : 'INTERNAL_ERROR',
      timestamp: new Date(),
    };
    return NextResponse.json(errorResponse, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedBody = ImportConfigsRequestSchema.parse(body);
    const { filenames } = validatedBody;

    console.log(`[DEBUG] Starting import of ${filenames.length} config files...`);
    
    const configsPath = getConfigsPath();
    const importedConfigs = [];
    const errors = [];

    for (const filename of filenames) {
      try {
        const filepath = join(configsPath, filename);
        const content = await readFile(filepath, 'utf-8');
        
        // Parse and validate JSON config
        let parsedConfig;
        try {
          parsedConfig = FreqtradeConfigSchema.parse(JSON.parse(content));
        } catch (parseError: any) {
          errors.push({
            filename,
            error: parseError instanceof z.ZodError ? `Invalid config format: ${parseError.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}` : 'Invalid JSON format in config file'
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
            data: cleanConfig as Prisma.InputJsonValue // Type assertion to satisfy Prisma's Json type
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

    const responseData = {
      imported: importedConfigs.length,
      total: filenames.length,
      configs: importedConfigs,
      errors
    };

    const validatedResponseData = PostImportConfigsResponseDataSchema.parse(responseData);

    return NextResponse.json({
      success: true,
      data: validatedResponseData,
      message: `Successfully imported ${importedConfigs.length} of ${filenames.length} configurations`
    });
  } catch (error: any) {
    console.error('[DEBUG] Error importing configs:', error);
    const errorResponse: APIErrorResponse = {
      error: 'Failed to import configurations',
      details: error instanceof z.ZodError ? error.issues : (error.message || 'Unknown error'),
      type: error instanceof z.ZodError ? 'VALIDATION_ERROR' : 'INTERNAL_ERROR',
      timestamp: new Date(),
    };
    return NextResponse.json(errorResponse, { status: 500 });
  }
}