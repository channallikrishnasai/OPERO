import { NextRequest, NextResponse } from 'next/server';
import { registerAllTools, getTool, getToolNames, ToolPermission } from '@/lib/tools';
import { logToolExecution } from '@/lib/tools/logger';
import { ActionStatus } from '@prisma/client';

registerAllTools();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    if (!body || typeof body !== 'object') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Request body must be a JSON object.',
          },
        },
        { status: 400 }
      );
    }

    const { tool, input } = body;

    if (!tool || typeof tool !== 'string') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'MISSING_TOOL',
            message: 'The "tool" field is required and must be a string.',
          },
        },
        { status: 400 }
      );
    }

    if (!input || typeof input !== 'object') {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'MISSING_INPUT',
            message: 'The "input" field is required and must be an object.',
          },
        },
        { status: 400 }
      );
    }

    const toolDef = getTool(tool);

    if (!toolDef) {
      await logToolExecution({
        toolName: tool,
        entityType: 'Unknown',
        status: ActionStatus.FAILED,
        details: { error: 'Tool not found', availableTools: getToolNames() },
      });

      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'TOOL_NOT_FOUND',
            message: `Tool "${tool}" is not registered. Available tools: ${getToolNames().join(', ')}`,
          },
        },
        { status: 404 }
      );
    }

    if (toolDef.permission !== ToolPermission.READ) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'PERMISSION_DENIED',
            message: `Tool "${tool}" requires ${toolDef.permission} permission. Only READ tools are currently enabled.`,
          },
        },
        { status: 403 }
      );
    }

    const result = await toolDef.execute(input as Record<string, unknown>);

    return NextResponse.json(result, {
      status: result.success ? 200 : 422,
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'An unexpected error occurred while processing your request.',
        },
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  registerAllTools();
  const tools = getToolNames();
  return NextResponse.json({ tools });
}
