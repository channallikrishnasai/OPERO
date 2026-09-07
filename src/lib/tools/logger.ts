import { prisma } from '@/lib/prisma';
import { ActionStatus, Prisma } from '@prisma/client';

export interface ToolLogParams {
  toolName: string;
  entityType: string;
  entityId?: string;
  status: ActionStatus;
  details?: Record<string, unknown>;
}

export async function logToolExecution(params: ToolLogParams): Promise<void> {
  try {
    await prisma.actionLog.create({
      data: {
        action: params.toolName,
        entityType: params.entityType,
        entityId: params.entityId ?? '',
        status: params.status,
        details: params.details
          ? (params.details as unknown as Prisma.InputJsonValue)
          : undefined,
      },
    });
  } catch (error) {
    console.error('Failed to log tool execution:', error);
  }
}
