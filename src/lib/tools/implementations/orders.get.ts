import { prisma } from '@/lib/prisma';
import { ToolDefinition, ToolPermission, ToolResult } from '../types';
import { logToolExecution } from '../logger';
import { ActionStatus } from '@prisma/client';

export interface OrdersGetInput {
  orderId: string;
}

export interface OrderGetResult {
  id: string;
  status: string;
  priority: string;
  totalAmount: number;
  expectedDelivery: Date;
  actualDelivery: Date | null;
  createdAt: Date;
  updatedAt: Date;
  customer: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
  };
  isDelayed: boolean;
}

async function execute(input: OrdersGetInput): Promise<ToolResult<OrderGetResult>> {
  const now = new Date();

  try {
    const order = await prisma.order.findUnique({
      where: { id: input.orderId },
      include: {
        customer: {
          select: { id: true, name: true, email: true, phone: true },
        },
      },
    });

    if (!order) {
      await logToolExecution({
        toolName: 'orders.get',
        entityType: 'Order',
        entityId: input.orderId,
        status: ActionStatus.FAILED,
        details: { error: 'Order not found' },
      });

      return {
        success: false,
        data: null as unknown as OrderGetResult,
        error: {
          code: 'ORDER_NOT_FOUND',
          message: `Order with ID "${input.orderId}" was not found.`,
        },
      };
    }

    const result: OrderGetResult = {
      id: order.id,
      status: order.status,
      priority: order.priority,
      totalAmount: order.totalAmount,
      expectedDelivery: order.expectedDelivery,
      actualDelivery: order.actualDelivery,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      customer: order.customer,
      isDelayed:
        order.expectedDelivery < now &&
        order.status !== 'DELIVERED' &&
        order.status !== 'CANCELLED',
    };

    await logToolExecution({
      toolName: 'orders.get',
      entityType: 'Order',
      entityId: order.id,
      status: ActionStatus.COMPLETED,
      details: { orderId: order.id, status: order.status },
    });

    return { success: true, data: result };
  } catch (error) {
    await logToolExecution({
      toolName: 'orders.get',
      entityType: 'Order',
      entityId: input.orderId,
      status: ActionStatus.FAILED,
      details: { error: error instanceof Error ? error.message : 'Unknown error' },
    });

    return {
      success: false,
      data: null as unknown as OrderGetResult,
      error: {
        code: 'ORDER_GET_FAILED',
        message: 'Failed to retrieve order. Please try again.',
      },
    };
  }
}

export const ordersGetTool: ToolDefinition<OrdersGetInput, OrderGetResult> = {
  name: 'orders.get',
  description:
    'Get detailed information about a specific order including customer details, status, priority, and delivery information.',
  permission: ToolPermission.READ,
  inputSchema: {
    type: 'object',
    properties: {
      orderId: {
        type: 'string',
        description: 'The unique identifier of the order',
      },
    },
    required: ['orderId'],
  },
  execute,
};
