import { prisma } from '@/lib/prisma';
import { ToolDefinition, ToolPermission, ToolResult } from '../types';
import { logToolExecution } from '../logger';
import { ActionStatus, OrderStatus, OrderPriority } from '@prisma/client';

export interface OrdersSearchInput {
  status?: OrderStatus;
  priority?: OrderPriority;
  customerId?: string;
  delayed?: boolean;
  limit?: number;
}

export interface OrderSearchResult {
  id: string;
  status: OrderStatus;
  priority: OrderPriority;
  totalAmount: number;
  expectedDelivery: Date;
  actualDelivery: Date | null;
  createdAt: Date;
  customer: {
    id: string;
    name: string;
    email: string;
  };
  isDelayed: boolean;
}

async function execute(input: OrdersSearchInput): Promise<ToolResult<OrderSearchResult[]>> {
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

    if (input.customerId) {
      where.customerId = input.customerId;
    }

    if (input.delayed) {
      where.expectedDelivery = { lt: now };
      where.status = { notIn: [OrderStatus.DELIVERED, OrderStatus.CANCELLED] };
    }

    const orders = await prisma.order.findMany({
      where,
      include: { customer: { select: { id: true, name: true, email: true } } },
      orderBy: [
        { priority: 'desc' },
        { expectedDelivery: 'asc' },
      ],
      take: limit,
    });

    const results: OrderSearchResult[] = orders.map((order) => ({
      id: order.id,
      status: order.status,
      priority: order.priority,
      totalAmount: order.totalAmount,
      expectedDelivery: order.expectedDelivery,
      actualDelivery: order.actualDelivery,
      createdAt: order.createdAt,
      customer: order.customer,
      isDelayed:
        order.expectedDelivery < now &&
        order.status !== OrderStatus.DELIVERED &&
        order.status !== OrderStatus.CANCELLED,
    }));

    await logToolExecution({
      toolName: 'orders.search',
      entityType: 'Order',
      status: ActionStatus.COMPLETED,
      details: {
        filters: {
          status: input.status,
          priority: input.priority,
          customerId: input.customerId,
          delayed: input.delayed,
          limit: input.limit,
        },
        resultCount: results.length,
      },
    });

    return { success: true, data: results };
  } catch (error) {
    await logToolExecution({
      toolName: 'orders.search',
      entityType: 'Order',
      status: ActionStatus.FAILED,
      details: { error: error instanceof Error ? error.message : 'Unknown error' },
    });

    return {
      success: false,
      data: [],
      error: {
        code: 'ORDERS_SEARCH_FAILED',
        message: 'Failed to search orders. Please try again.',
      },
    };
  }
}

export const ordersSearchTool: ToolDefinition<OrdersSearchInput, OrderSearchResult[]> = {
  name: 'orders.search',
  description:
    'Search and filter customer orders. Supports filtering by status, priority, customer, and delayed status. Useful for finding overdue orders, high-priority orders, or orders for a specific customer.',
  permission: ToolPermission.READ,
  inputSchema: {
    type: 'object',
    properties: {
      status: {
        type: 'string',
        enum: Object.values(OrderStatus),
        description: 'Filter by order status',
      },
      priority: {
        type: 'string',
        enum: Object.values(OrderPriority),
        description: 'Filter by order priority',
      },
      customerId: {
        type: 'string',
        description: 'Filter by customer ID',
      },
      delayed: {
        type: 'boolean',
        description: 'If true, only return orders past their expected delivery date',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of results (default 25, max 100)',
      },
    },
  },
  execute,
};
