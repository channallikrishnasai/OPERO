import { NextRequest, NextResponse } from 'next/server';
import { approveAction } from '@/lib/approvals/service';
import { getTool } from '@/lib/tools';
import { logToolExecution } from '@/lib/tools/logger';
import { ActionStatus } from '@prisma/client';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await approveAction(id);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: { code: 'APPROVAL_FAILED', message: result.error } },
        { status: 400 }
      );
    }

    const approval = result.approval!;
    const tool = getTool(approval.toolName);

    if (!tool) {
      await logToolExecution({
        toolName: approval.toolName,
        entityType: 'Approval',
        entityId: approval.id,
        status: ActionStatus.FAILED,
        details: { error: 'Tool not found during approval execution' },
      });

      return NextResponse.json(
        {
          success: false,
          error: { code: 'TOOL_NOT_FOUND', message: `Tool "${approval.toolName}" no longer exists.` },
        },
        { status: 404 }
      );
    }

    const toolInput = approval.toolInput as Record<string, unknown>;
    const toolResult = await tool.execute(toolInput);

    return NextResponse.json({
      success: true,
      data: {
        approval: {
          id: approval.id,
          status: approval.status,
          toolName: approval.toolName,
        },
        toolResult,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'EXECUTION_FAILED',
          message: error instanceof Error ? error.message : 'Failed to execute approved action.',
        },
      },
      { status: 500 }
    );
  }
}
