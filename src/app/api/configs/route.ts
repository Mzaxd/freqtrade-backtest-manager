import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, data } = body;

    if (!name || !data) {
      return NextResponse.json(
        { error: 'Missing required fields: name and data are required' },
        { status: 400 }
      );
    }

    const newConfig = await prisma.config.create({
      data: {
        name,
        description,
        data,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: newConfig,
        message: 'Configuration created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating configuration:', error);
    //
    if (error instanceof Error && 'code' in error && error.code === 'P2002') {
       return NextResponse.json(
        {
          error: 'Failed to create configuration',
          details: 'A configuration with this name already exists.',
        },
        { status: 409 } // 409 Conflict
      );
    }
    
    return NextResponse.json(
      {
        error: 'Failed to create configuration',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      // 获取单个配置的详细信息
      const config = await prisma.config.findUnique({
        where: { id: parseInt(id, 10) },
      });

      if (!config) {
        return NextResponse.json(
          { error: 'Configuration not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: config,
        message: 'Configuration retrieved successfully',
      });
    } else {
      // 获取所有配置的列表（不包括详细的 data）
      const configs = await prisma.config.findMany({
        select: {
          id: true,
          name: true,
          description: true,
          createdAt: true,
          updatedAt: true,
        },
        orderBy: {
          updatedAt: 'desc',
        },
      });

      return NextResponse.json({
        success: true,
        data: configs,
        message: 'Configurations list retrieved successfully',
      });
    }
  } catch (error) {
    console.error('Error retrieving configuration(s):', error);
    return NextResponse.json(
      {
        error: 'Failed to retrieve configuration(s)',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
