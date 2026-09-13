import { ToolPermission } from '@/lib/tools';

export type PermissionLevel = ToolPermission;

export interface PermissionCheck {
  allowed: boolean;
  requiresApproval: boolean;
  reason?: string;
}

export function checkPermission(
  permission: PermissionLevel,
  hasExistingApproval?: boolean
): PermissionCheck {
  switch (permission) {
    case ToolPermission.READ:
      return { allowed: true, requiresApproval: false };

    case ToolPermission.SUGGEST:
      return { allowed: false, requiresApproval: false, reason: 'SUGGEST tools require user confirmation but do not need formal approval.' };

    case ToolPermission.APPROVE:
      if (hasExistingApproval) {
        return { allowed: true, requiresApproval: false };
      }
      return { allowed: false, requiresApproval: true, reason: 'This action requires explicit user approval before execution.' };

    case ToolPermission.EXECUTE:
      return { allowed: true, requiresApproval: false };

    default:
      return { allowed: false, requiresApproval: false, reason: `Unknown permission level: ${permission}` };
  }
}

export function needsApproval(permission: PermissionLevel): boolean {
  return permission === ToolPermission.APPROVE;
}

export function canAutoExecute(permission: PermissionLevel): boolean {
  return permission === ToolPermission.READ || permission === ToolPermission.EXECUTE;
}
