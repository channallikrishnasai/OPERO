import { NextRequest, NextResponse } from 'next/server';
import { registerAllTools, getTool, getToolNames } from '@/lib/tools';
import { logToolExecution } from '@/lib/tools/logger';
import { ActionStatus } from '@prisma/client';
import { checkPermission, needsApproval } from '@/lib/permissions';
import { createApproval } from '@/lib/approvals/service';

registerAllTools();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('[API /tools] Received request:', JSON.stringify(body).slice(0, 500));

    if (!body || typeof body !== 'object') {
      console.log('[API /tools] Invalid request body');
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
      console.log('[API /tools] Missing tool field');
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
      console.log('[API /tools] Missing input field');
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

    console.log('[API /tools] Looking up tool:', tool);
    const toolDef = getTool(tool);

    if (!toolDef) {
      console.log('[API /tools] Tool not found:', tool, 'Available:', getToolNames());
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

    console.log('[API /tools] Tool found:', toolDef.name, 'Permission:', toolDef.permission);
    const permissionCheck = checkPermission(toolDef.permission);

    if (!permissionCheck.allowed && !permissionCheck.requiresApproval) {
      console.log('[API /tools] Permission denied for:', tool);
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'PERMISSION_DENIED',
            message: `Tool "${tool}" requires ${toolDef.permission} permission.`,
          },
        },
        { status: 403 }
      );
    }

    if (needsApproval(toolDef.permission)) {
      console.log('[API /tools] Approval required for:', tool);
      const approval = await createApproval({
        toolName: tool,
        toolInput: input,
        description: `Execute ${tool} with provided input`,
        riskLevel: 'Requires approval',
      });

      return NextResponse.json({
        success: false,
        requiresApproval: true,
        approvalId: approval.id,
        action: tool,
        description: approval.description,
        riskLevel: approval.riskLevel,
      });
    }

    console.log('[API /tools] Executing tool:', tool, 'with input:', JSON.stringify(input).slice(0, 200));
    const result = await toolDef.execute(input as Record<string, unknown>);
    console.log('[API /tools] Tool result:', JSON.stringify(result).slice(0, 500));

    return NextResponse.json(result, {
      status: result.success ? 200 : 422,
    });
  } catch (error) {
    console.error('[API /tools] Internal error:', error);
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
