import { prisma } from '@/lib/prisma';
import { ToolDefinition, ToolPermission, ToolResult } from '../types';
import { logToolExecution } from '../logger';
import { ActionStatus, TaskPriority, TaskStatus } from '@prisma/client';

interface TasksUpdateInput {
  taskId: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assignedTo?: string;
}

interface TasksUpdateOutput {
  taskId: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignedTo: string | null;
  updatedAt: Date;
}

export const tasksUpdateTool: ToolDefinition<TasksUpdateInput, TasksUpdateOutput> = {
  name: 'tasks.update',
  description: 'Update a task status, priority, or assignment. Requires explicit user approval before execution.',
  permission: ToolPermission.APPROVE,
  inputSchema: {
    type: 'object',
    properties: {
      taskId: { type: 'string', description: 'The ID of the task to update' },
      status: {
        type: 'string',
        enum: Object.values(TaskStatus),
        description: 'New status for the task',
      },
      priority: {
        type: 'string',
        enum: Object.values(TaskPriority),
        description: 'New priority for the task',
      },
      assignedTo: { type: 'string', description: 'New assignee for the task' },
    },
    required: ['taskId'],
  },
  async execute(input: TasksUpdateInput): Promise<ToolResult<TasksUpdateOutput>> {
    try {
      const { taskId, status, priority, assignedTo } = input;

      if (!status && !priority && assignedTo === undefined) {
        return {
          success: false,
          data: null as unknown as TasksUpdateOutput,
          error: { code: 'INVALID_INPUT', message: 'At least one of status, priority, or assignedTo must be provided.' },
        };
      }

      const task = await prisma.task.findUnique({ where: { id: taskId } });
      if (!task) {
        return {
          success: false,
          data: null as unknown as TasksUpdateOutput,
          error: { code: 'TASK_NOT_FOUND', message: `Task "${taskId}" not found.` },
        };
      }

      const updateData: { status?: TaskStatus; priority?: TaskPriority; assignedTo?: string | null } = {};
      if (status) updateData.status = status;
      if (priority) updateData.priority = priority;
      if (assignedTo !== undefined) updateData.assignedTo = assignedTo;

      const updated = await prisma.task.update({
        where: { id: taskId },
        data: updateData,
      });

      await logToolExecution({
        toolName: 'tasks.update',
        entityType: 'Task',
        entityId: taskId,
        status: ActionStatus.COMPLETED,
        details: {
          action: 'task_updated',
          changes: updateData,
          previousStatus: task.status,
          previousPriority: task.priority,
        },
      });

      return {
        success: true,
        data: {
          taskId: updated.id,
          title: updated.title,
          status: updated.status,
          priority: updated.priority,
          assignedTo: updated.assignedTo,
          updatedAt: updated.updatedAt,
        },
      };
    } catch (error) {
      await logToolExecution({
        toolName: 'tasks.update',
        entityType: 'Task',
        entityId: input.taskId,
        status: ActionStatus.FAILED,
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
      });

      return {
        success: false,
        data: null as unknown as TasksUpdateOutput,
        error: {
          code: 'UPDATE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to update task.',
        },
      };
    }
  },
};
