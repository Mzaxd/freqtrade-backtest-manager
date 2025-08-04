import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface Params {
  id: string;
}

export async function GET(request: NextRequest, { params }: { params: Params }) {
  try {
    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }

    const config = await prisma.config.findUnique({
      where: { id },
    });

    if (!config) {
      return NextResponse.json({ error: 'Configuration not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: config,
      message: 'Configuration retrieved successfully',
    });
  } catch (error) {
    console.error(`Error retrieving configuration ${params.id}:`, error);
    return NextResponse.json(
      {
        error: 'Failed to retrieve configuration',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: { params: Params }) {
  try {
    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }
    
    const body = await request.json();
    const { name, description, data } = body;

    // 验证，确保至少有一个字段用于更新
    if (!name && !description && !data) {
      return NextResponse.json(
        { error: 'No fields to update. Provide name, description, or data.' },
        { status: 400 }
      );
    }
    
    // 检查配置是否存在
    const existingConfig = await prisma.config.findUnique({ where: { id } });
    if (!existingConfig) {
        return NextResponse.json({ error: 'Configuration not found' }, { status: 404 });
    }

    const updatedConfig = await prisma.config.update({
      where: { id },
      data: {
        name: name || existingConfig.name,
        description: description || existingConfig.description,
        data: data || existingConfig.data,
      },
    });

    return NextResponse.json({
      success: true,
      data: updatedConfig,
      message: 'Configuration updated successfully',
    });
  } catch (error) {
    console.error(`Error updating configuration ${params.id}:`, error);
    if (error instanceof Error && 'code' in error && error.code === 'P2002') {
       return NextResponse.json(
        {
          error: 'Failed to update configuration',
          details: 'A configuration with this name already exists.',
        },
        { status: 409 } // 409 Conflict
      );
    }
    return NextResponse.json(
      {
        error: 'Failed to update configuration',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}


export async function DELETE(request: NextRequest, { params }: { params: Params }) {
  try {
    const id = parseInt(params.id, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
    }

    // 检查配置是否存在
    const existingConfig = await prisma.config.findUnique({ where: { id } });
    if (!existingConfig) {
        return NextResponse.json({ error: 'Configuration not found' }, { status: 404 });
    }

    await prisma.config.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Configuration deleted successfully',
    }, { status: 200 }); // 或 204 No Content
  } catch (error) {
    console.error(`Error deleting configuration ${params.id}:`, error);
    return NextResponse.json(
      {
        error: 'Failed to delete configuration',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}