import { prisma } from '@/lib/prisma';
import { ToolDefinition, ToolPermission, ToolResult } from '../types';
import { logToolExecution } from '../logger';
import { ActionStatus, TaskPriority, TaskStatus } from '@prisma/client';

interface TasksCreateInput {
  title: string;
  description?: string;
  priority?: TaskPriority;
  assignedTo?: string;
  dueDate?: string;
}

interface TasksCreateOutput {
  taskId: string;
  title: string;
  description: string | null;
  priority: TaskPriority;
  status: TaskStatus;
  assignedTo: string | null;
  dueDate: Date | null;
  createdAt: Date;
}

export const tasksCreateTool: ToolDefinition<TasksCreateInput, TasksCreateOutput> = {
  name: 'tasks.create',
  description: 'Create a new task. Requires explicit user approval before execution.',
  permission: ToolPermission.APPROVE,
  inputSchema: {
    type: 'object',
    properties: {
      title: { type: 'string', description: 'Task title' },
      description: { type: 'string', description: 'Detailed task description' },
      priority: {
        type: 'string',
        enum: Object.values(TaskPriority),
        description: 'Task priority level',
      },
      assignedTo: { type: 'string', description: 'Person or team to assign the task to' },
      dueDate: { type: 'string', description: 'Due date in ISO format (YYYY-MM-DD)' },
    },
    required: ['title'],
  },
  async execute(input: TasksCreateInput): Promise<ToolResult<TasksCreateOutput>> {
    try {
      const { title, description, priority, assignedTo, dueDate } = input;

      const task = await prisma.task.create({
        data: {
          title,
          description: description ?? null,
          priority: priority ?? TaskPriority.MEDIUM,
          assignedTo: assignedTo ?? null,
          dueDate: dueDate ? new Date(dueDate) : null,
        },
      });

      await logToolExecution({
        toolName: 'tasks.create',
        entityType: 'Task',
        entityId: task.id,
        status: ActionStatus.COMPLETED,
        details: {
          action: 'task_created',
          title: task.title,
          priority: task.priority,
          assignedTo: task.assignedTo,
        },
      });

      return {
        success: true,
        data: {
          taskId: task.id,
          title: task.title,
          description: task.description,
          priority: task.priority,
          status: task.status,
          assignedTo: task.assignedTo,
          dueDate: task.dueDate,
          createdAt: task.createdAt,
        },
      };
    } catch (error) {
      await logToolExecution({
        toolName: 'tasks.create',
        entityType: 'Task',
        entityId: '',
        status: ActionStatus.FAILED,
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
      });

      return {
        success: false,
        data: null as unknown as TasksCreateOutput,
        error: {
          code: 'CREATE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to create task.',
        },
      };
    }
  },
};
