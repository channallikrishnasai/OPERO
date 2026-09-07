import { getTool, ToolResult, ToolPermission } from '@/lib/tools';
import { logToolExecution } from '@/lib/tools/logger';
import { ActionStatus } from '@prisma/client';

export interface AssemblyAIToolCall {
  call_id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface AssemblyAIToolResult {
  call_id: string;
  result: string;
}

export async function handleToolCall(
  toolCall: AssemblyAIToolCall
): Promise<AssemblyAIToolResult> {
  const { call_id, name, arguments: args } = toolCall;

  const tool = getTool(name);

  if (!tool) {
    await logToolExecution({
      toolName: name,
      entityType: 'Unknown',
      status: ActionStatus.FAILED,
      details: { error: 'Tool not found', call_id },
    });

    return {
      call_id,
      result: JSON.stringify({
        success: false,
        error: {
          code: 'TOOL_NOT_FOUND',
          message: `Tool "${name}" is not available.`,
        },
      }),
    };
  }

  if (tool.permission !== ToolPermission.READ) {
    await logToolExecution({
      toolName: name,
      entityType: 'Unknown',
      status: ActionStatus.FAILED,
      details: { error: 'Permission denied', call_id, permission: tool.permission },
    });

    return {
      call_id,
      result: JSON.stringify({
        success: false,
        error: {
          code: 'PERMISSION_DENIED',
          message: `Tool "${name}" requires ${tool.permission} permission.`,
        },
      }),
    };
  }

  try {
    const result: ToolResult = await tool.execute(args);

    return {
      call_id,
      result: JSON.stringify(result),
    };
  } catch (error) {
    await logToolExecution({
      toolName: name,
      entityType: 'Unknown',
      status: ActionStatus.FAILED,
      details: {
        error: error instanceof Error ? error.message : 'Unknown error',
        call_id,
      },
    });

    return {
      call_id,
      result: JSON.stringify({
        success: false,
        error: {
          code: 'TOOL_EXECUTION_FAILED',
          message: 'An error occurred while executing the tool.',
        },
      }),
    };
  }
}
