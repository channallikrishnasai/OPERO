import { getTool, ToolResult } from '@/lib/tools';
import { logToolExecution } from '@/lib/tools/logger';
import { ActionStatus } from '@prisma/client';
import { checkPermission, needsApproval } from '@/lib/permissions';
import { createApproval } from '@/lib/approvals/service';

export interface AssemblyAIToolCall {
  call_id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface AssemblyAIToolResult {
  call_id: string;
  result: string;
}

function generateApprovalDescription(toolName: string, args: Record<string, unknown>): string {
  switch (toolName) {
    case 'orders.reassign':
      return `Reassign order ${args.orderId || 'unknown'} to ${args.assignedTo || 'unknown'}`;
    case 'inventory.reserve':
      return `Reserve ${args.quantity || 0} units of inventory item ${args.inventoryItemId || 'unknown'}`;
    case 'tasks.create':
      return `Create task: ${args.title || 'Untitled'}`;
    case 'tasks.update':
      return `Update task ${args.taskId || 'unknown'}`;
    default:
      return `Execute ${toolName}`;
  }
}

function generateRiskLevel(toolName: string, args: Record<string, unknown>): string {
  switch (toolName) {
    case 'inventory.reserve':
      return `Consumes ${args.quantity || 0} units from inventory`;
    case 'orders.reassign':
      return 'Changes order assignment';
    case 'tasks.create':
      return 'Creates a new task';
    case 'tasks.update':
      return 'Modifies existing task';
    default:
      return 'Requires approval';
  }
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

  const permissionCheck = checkPermission(tool.permission);

  if (!permissionCheck.allowed && !permissionCheck.requiresApproval) {
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

  if (needsApproval(tool.permission)) {
    const approval = await createApproval({
      toolName: name,
      toolInput: args,
      description: generateApprovalDescription(name, args),
      riskLevel: generateRiskLevel(name, args),
      callId: call_id,
    });

    await logToolExecution({
      toolName: name,
      entityType: 'Approval',
      entityId: approval.id,
      status: ActionStatus.PENDING,
      details: {
        action: 'approval_required',
        approvalId: approval.id,
        description: approval.description,
        call_id,
      },
    });

    return {
      call_id,
      result: JSON.stringify({
        success: false,
        requiresApproval: true,
        approvalId: approval.id,
        action: name,
        description: approval.description,
        riskLevel: approval.riskLevel,
        message: `I need your approval before I can ${name.replace('.', ' ')}.`,
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
