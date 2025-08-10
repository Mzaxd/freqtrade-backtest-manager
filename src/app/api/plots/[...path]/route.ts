import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';

const readFile = promisify(fs.readFile);

export async function GET(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const plotPath = params.path.join('/');
  const userDataPath = process.env.FREQTRADE_USER_DATA_PATH || './ft_user_data';
  const filePath = path.join(userDataPath, 'plots', plotPath);

  try {
    const data = await readFile(filePath);
    let contentType = 'text/html; charset=utf-8';
    if (plotPath.endsWith('.png')) {
      contentType = 'image/png';
    } else if (plotPath.endsWith('.json')) {
      contentType = 'application/json';
    }

    return new NextResponse(data, {
      headers: {
        'Content-Type': contentType,
      },
    });
  } catch (error) {
    console.error(`Error reading file: ${filePath}`, error);
    return new NextResponse('File not found', { status: 404 });
  }
}