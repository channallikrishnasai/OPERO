import { prisma } from '@/lib/prisma';
import { ApprovalStatus, Prisma } from '@prisma/client';
import { logToolExecution } from '@/lib/tools/logger';
import { ActionStatus } from '@prisma/client';

export interface CreateApprovalRequest {
  toolName: string;
  toolInput: Record<string, unknown>;
  description: string;
  riskLevel: string;
  callId?: string;
}

export interface ApprovalResponse {
  id: string;
  toolName: string;
  toolInput: Record<string, unknown>;
  description: string;
  riskLevel: string;
  status: ApprovalStatus;
  callId: string | null;
  createdAt: Date;
  resolvedAt: Date | null;
}

const APPROVAL_EXPIRY_MS = 5 * 60 * 1000;

function mapApproval(approval: { id: string; toolName: string; toolInput: Prisma.JsonValue; description: string; riskLevel: string; status: ApprovalStatus; callId: string | null; createdAt: Date; resolvedAt: Date | null }): ApprovalResponse {
  return {
    id: approval.id,
    toolName: approval.toolName,
    toolInput: (approval.toolInput as Record<string, unknown>) ?? {},
    description: approval.description,
    riskLevel: approval.riskLevel,
    status: approval.status,
    callId: approval.callId,
    createdAt: approval.createdAt,
    resolvedAt: approval.resolvedAt,
  };
}

export async function createApproval(request: CreateApprovalRequest): Promise<ApprovalResponse> {
  const approval = await prisma.approval.create({
    data: {
      toolName: request.toolName,
      toolInput: request.toolInput as unknown as Prisma.InputJsonValue,
      description: request.description,
      riskLevel: request.riskLevel,
      callId: request.callId ?? null,
    },
  });

  await logToolExecution({
    toolName: request.toolName,
    entityType: 'Approval',
    entityId: approval.id,
    status: ActionStatus.PENDING,
    details: {
      action: 'approval_requested',
      description: request.description,
      riskLevel: request.riskLevel,
    },
  });

  return mapApproval(approval);
}

export async function getApproval(id: string): Promise<ApprovalResponse | null> {
  const approval = await prisma.approval.findUnique({
    where: { id },
  });

  if (!approval) return null;

  if (approval.status === ApprovalStatus.PENDING) {
    const elapsed = Date.now() - approval.createdAt.getTime();
    if (elapsed > APPROVAL_EXPIRY_MS) {
      const updated = await prisma.approval.update({
        where: { id },
        data: {
          status: ApprovalStatus.EXPIRED,
          resolvedAt: new Date(),
        },
      });

      await logToolExecution({
        toolName: approval.toolName,
        entityType: 'Approval',
        entityId: approval.id,
        status: ActionStatus.FAILED,
        details: {
          action: 'approval_expired',
          description: approval.description,
        },
      });

      return mapApproval(updated);
    }
  }

  return mapApproval(approval);
}

export async function getPendingApprovals(): Promise<ApprovalResponse[]> {
  const approvals = await prisma.approval.findMany({
    where: { status: ApprovalStatus.PENDING },
    orderBy: { createdAt: 'desc' },
  });

  const now = Date.now();
  const validApprovals: ApprovalResponse[] = [];

  for (const approval of approvals) {
    const elapsed = now - approval.createdAt.getTime();
    if (elapsed > APPROVAL_EXPIRY_MS) {
      await prisma.approval.update({
        where: { id: approval.id },
        data: {
          status: ApprovalStatus.EXPIRED,
          resolvedAt: new Date(),
        },
      });

      await logToolExecution({
        toolName: approval.toolName,
        entityType: 'Approval',
        entityId: approval.id,
        status: ActionStatus.FAILED,
        details: {
          action: 'approval_expired',
          description: approval.description,
        },
      });
    } else {
      validApprovals.push(mapApproval(approval));
    }
  }

  return validApprovals;
}

export async function approveAction(id: string): Promise<{ success: boolean; approval?: ApprovalResponse; error?: string }> {
  const approval = await prisma.approval.findUnique({
    where: { id },
  });

  if (!approval) {
    return { success: false, error: 'Approval request not found.' };
  }

  if (approval.status !== ApprovalStatus.PENDING) {
    return { success: false, error: `Approval is already ${approval.status.toLowerCase()}.` };
  }

  const elapsed = Date.now() - approval.createdAt.getTime();
  if (elapsed > APPROVAL_EXPIRY_MS) {
    await prisma.approval.update({
      where: { id },
      data: {
        status: ApprovalStatus.EXPIRED,
        resolvedAt: new Date(),
      },
    });

    return { success: false, error: 'Approval request has expired.' };
  }

  const updated = await prisma.approval.update({
    where: { id },
    data: {
      status: ApprovalStatus.APPROVED,
      resolvedAt: new Date(),
    },
  });

  await logToolExecution({
    toolName: approval.toolName,
    entityType: 'Approval',
    entityId: approval.id,
    status: ActionStatus.COMPLETED,
    details: {
      action: 'approval_approved',
      description: approval.description,
    },
  });

  return { success: true, approval: mapApproval(updated) };
}

export async function rejectAction(id: string): Promise<{ success: boolean; approval?: ApprovalResponse; error?: string }> {
  const approval = await prisma.approval.findUnique({
    where: { id },
  });

  if (!approval) {
    return { success: false, error: 'Approval request not found.' };
  }

  if (approval.status !== ApprovalStatus.PENDING) {
    return { success: false, error: `Approval is already ${approval.status.toLowerCase()}.` };
  }

  const updated = await prisma.approval.update({
    where: { id },
    data: {
      status: ApprovalStatus.REJECTED,
      resolvedAt: new Date(),
    },
  });

  await logToolExecution({
    toolName: approval.toolName,
    entityType: 'Approval',
    entityId: approval.id,
    status: ActionStatus.FAILED,
    details: {
      action: 'approval_rejected',
      description: approval.description,
    },
  });

  return { success: true, approval: mapApproval(updated) };
}

export function isApprovalExpired(approval: ApprovalResponse): boolean {
  if (approval.status !== ApprovalStatus.PENDING) return true;
  const elapsed = Date.now() - approval.createdAt.getTime();
  return elapsed > APPROVAL_EXPIRY_MS;
}

export function getApprovalTimeRemaining(approval: ApprovalResponse): number {
  if (approval.status !== ApprovalStatus.PENDING) return 0;
  const elapsed = Date.now() - approval.createdAt.getTime();
  return Math.max(0, APPROVAL_EXPIRY_MS - elapsed);
}
