import { prisma } from '@/lib/prisma';
import { ToolDefinition, ToolPermission, ToolResult } from '../types';
import { logToolExecution } from '../logger';
import { ActionStatus, OrderStatus, OrderPriority } from '@prisma/client';

interface OrdersUpdateInput {
  orderId: string;
  status?: OrderStatus;
  priority?: OrderPriority;
}

interface OrdersUpdateOutput {
  orderId: string;
  status: OrderStatus;
  priority: OrderPriority;
  updatedAt: Date;
}

export const ordersUpdateTool: ToolDefinition<OrdersUpdateInput, OrdersUpdateOutput> = {
  name: 'orders.update',
  description: 'Update an order status or priority. Use for legitimate order state changes.',
  permission: ToolPermission.EXECUTE,
  inputSchema: {
    type: 'object',
    properties: {
      orderId: { type: 'string', description: 'The ID of the order to update' },
      status: {
        type: 'string',
        enum: Object.values(OrderStatus),
        description: 'New status for the order',
      },
      priority: {
        type: 'string',
        enum: Object.values(OrderPriority),
        description: 'New priority for the order',
      },
    },
    required: ['orderId'],
  },
  async execute(input: OrdersUpdateInput): Promise<ToolResult<OrdersUpdateOutput>> {
    try {
      const { orderId, status, priority } = input;

      if (!status && !priority) {
        return {
          success: false,
          data: null as unknown as OrdersUpdateOutput,
          error: { code: 'INVALID_INPUT', message: 'At least one of status or priority must be provided.' },
        };
      }

      const order = await prisma.order.findUnique({ where: { id: orderId } });
      if (!order) {
        return {
          success: false,
          data: null as unknown as OrdersUpdateOutput,
          error: { code: 'ORDER_NOT_FOUND', message: `Order "${orderId}" not found.` },
        };
      }

      const updateData: { status?: OrderStatus; priority?: OrderPriority } = {};
      if (status) updateData.status = status;
      if (priority) updateData.priority = priority;

      const updated = await prisma.order.update({
        where: { id: orderId },
        data: updateData,
      });

      await logToolExecution({
        toolName: 'orders.update',
        entityType: 'Order',
        entityId: orderId,
        status: ActionStatus.COMPLETED,
        details: {
          action: 'order_updated',
          changes: updateData,
          previousStatus: order.status,
          previousPriority: order.priority,
        },
      });

      return {
        success: true,
        data: {
          orderId: updated.id,
          status: updated.status,
          priority: updated.priority,
          updatedAt: updated.updatedAt,
        },
      };
    } catch (error) {
      await logToolExecution({
        toolName: 'orders.update',
        entityType: 'Order',
        entityId: input.orderId,
        status: ActionStatus.FAILED,
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
      });

      return {
        success: false,
        data: null as unknown as OrdersUpdateOutput,
        error: {
          code: 'UPDATE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to update order.',
        },
      };
    }
  },
};
