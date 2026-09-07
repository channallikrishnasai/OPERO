import { prisma } from '@/lib/prisma';
import { ToolDefinition, ToolPermission, ToolResult } from '../types';
import { logToolExecution } from '../logger';
import { ActionStatus, TaskPriority, TaskStatus } from '@prisma/client';

export interface TasksSearchInput {
  status?: TaskStatus;
  priority?: TaskPriority;
  assignedTo?: string;
  limit?: number;
}

export interface TaskSearchResult {
  id: string;
  title: string;
  description: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  assignedTo: string | null;
  dueDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
  isOverdue: boolean;
}

async function execute(input: TasksSearchInput): Promise<ToolResult<TaskSearchResult[]>> {
  const now = new Date();
  const limit = Math.min(input.limit ?? 25, 100);

  try {
    const where: Record<string, unknown> = {};

    if (input.status) {
      where.status = input.status;
    }

    if (input.priority) {
      where.priority = input.priority;
    }

    if (input.assignedTo) {
      where.assignedTo = { contains: input.assignedTo };
    }

    const tasks = await prisma.task.findMany({
      where,
      orderBy: [
        { priority: 'desc' },
        { dueDate: 'asc' },
      ],
      take: limit,
    });

    const results: TaskSearchResult[] = tasks.map((task) => ({
      id: task.id,
      title: task.title,
      description: task.description,
      priority: task.priority,
      status: task.status,
      assignedTo: task.assignedTo,
      dueDate: task.dueDate,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      isOverdue:
        task.dueDate !== null &&
        task.dueDate < now &&
        task.status !== TaskStatus.COMPLETED &&
        task.status !== TaskStatus.CANCELLED,
    }));

    await logToolExecution({
      toolName: 'tasks.search',
      entityType: 'Task',
      status: ActionStatus.COMPLETED,
      details: {
        filters: {
          status: input.status,
          priority: input.priority,
          assignedTo: input.assignedTo,
          limit: input.limit,
        },
        resultCount: results.length,
        overdueCount: results.filter((r) => r.isOverdue).length,
      },
    });

    return { success: true, data: results };
  } catch (error) {
    await logToolExecution({
      toolName: 'tasks.search',
      entityType: 'Task',
      status: ActionStatus.FAILED,
      details: { error: error instanceof Error ? error.message : 'Unknown error' },
    });

    return {
      success: false,
      data: [],
      error: {
        code: 'TASKS_SEARCH_FAILED',
        message: 'Failed to search tasks. Please try again.',
      },
    };
  }
}

export const tasksSearchTool: ToolDefinition<TasksSearchInput, TaskSearchResult[]> = {
  name: 'tasks.search',
  description:
    'Search and filter tasks. Supports filtering by status, priority, and assignee. Overdue tasks are automatically flagged.',
  permission: ToolPermission.READ,
  inputSchema: {
    type: 'object',
    properties: {
      status: {
        type: 'string',
        enum: Object.values(TaskStatus),
        description: 'Filter by task status',
      },
      priority: {
        type: 'string',
        enum: Object.values(TaskPriority),
        description: 'Filter by task priority',
      },
      assignedTo: {
        type: 'string',
        description: 'Filter by assignee (partial match)',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of results (default 25, max 100)',
      },
    },
  },
  execute,
};
