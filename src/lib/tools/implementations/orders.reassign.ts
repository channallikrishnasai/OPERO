import { prisma } from '@/lib/prisma';
import { ToolDefinition, ToolPermission, ToolResult } from '../types';
import { logToolExecution } from '../logger';
import { ActionStatus } from '@prisma/client';

interface OrdersReassignInput {
  orderId: string;
  assignedTo: string;
}

interface OrdersReassignOutput {
  orderId: string;
  assignedTo: string;
  updatedAt: Date;
}

export const ordersReassignTool: ToolDefinition<OrdersReassignInput, OrdersReassignOutput> = {
  name: 'orders.reassign',
  description: 'Reassign an order to a different team member. Requires explicit user approval before execution.',
  permission: ToolPermission.APPROVE,
  inputSchema: {
    type: 'object',
    properties: {
      orderId: { type: 'string', description: 'The ID of the order to reassign' },
      assignedTo: { type: 'string', description: 'Name or ID of the person to assign the order to' },
    },
    required: ['orderId', 'assignedTo'],
  },
  async execute(input: OrdersReassignInput): Promise<ToolResult<OrdersReassignOutput>> {
    try {
      const { orderId, assignedTo } = input;

      const order = await prisma.order.findUnique({
        where: { id: orderId },
        include: { customer: true },
      });

      if (!order) {
        return {
          success: false,
          data: null as unknown as OrdersReassignOutput,
          error: { code: 'ORDER_NOT_FOUND', message: `Order "${orderId}" not found.` },
        };
      }

      const updated = await prisma.order.update({
        where: { id: orderId },
        data: { assignedTo },
      });

      await logToolExecution({
        toolName: 'orders.reassign',
        entityType: 'Order',
        entityId: orderId,
        status: ActionStatus.COMPLETED,
        details: {
          action: 'order_reassigned',
          previousAssignee: order.assignedTo,
          newAssignee: assignedTo,
          customerName: order.customer.name,
        },
      });

      return {
        success: true,
        data: {
          orderId: updated.id,
          assignedTo: updated.assignedTo ?? '',
          updatedAt: updated.updatedAt,
        },
      };
    } catch (error) {
      await logToolExecution({
        toolName: 'orders.reassign',
        entityType: 'Order',
        entityId: input.orderId,
        status: ActionStatus.FAILED,
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
      });

      return {
        success: false,
        data: null as unknown as OrdersReassignOutput,
        error: {
          code: 'REASSIGN_FAILED',
          message: error instanceof Error ? error.message : 'Failed to reassign order.',
        },
      };
    }
  },
};
