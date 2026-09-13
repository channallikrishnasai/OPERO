import { prisma } from '@/lib/prisma';
import { ToolDefinition, ToolPermission, ToolResult } from '../types';
import { logToolExecution } from '../logger';
import { ActionStatus } from '@prisma/client';

interface InventoryReserveInput {
  inventoryItemId: string;
  quantity: number;
}

interface InventoryReserveOutput {
  inventoryItemId: string;
  name: string;
  sku: string;
  previousQuantity: number;
  reservedQuantity: number;
  newQuantity: number;
  location: string;
}

export const inventoryReserveTool: ToolDefinition<InventoryReserveInput, InventoryReserveOutput> = {
  name: 'inventory.reserve',
  description: 'Reserve inventory items for use. Decreases available quantity. Requires explicit user approval before execution.',
  permission: ToolPermission.APPROVE,
  inputSchema: {
    type: 'object',
    properties: {
      inventoryItemId: { type: 'string', description: 'The ID of the inventory item to reserve' },
      quantity: { type: 'number', description: 'Number of units to reserve', minimum: 1 },
    },
    required: ['inventoryItemId', 'quantity'],
  },
  async execute(input: InventoryReserveInput): Promise<ToolResult<InventoryReserveOutput>> {
    try {
      const { inventoryItemId, quantity } = input;

      if (quantity <= 0) {
        return {
          success: false,
          data: null as unknown as InventoryReserveOutput,
          error: { code: 'INVALID_QUANTITY', message: 'Quantity must be greater than zero.' },
        };
      }

      const item = await prisma.inventoryItem.findUnique({
        where: { id: inventoryItemId },
      });

      if (!item) {
        return {
          success: false,
          data: null as unknown as InventoryReserveOutput,
          error: { code: 'ITEM_NOT_FOUND', message: `Inventory item "${inventoryItemId}" not found.` },
        };
      }

      if (item.quantity < quantity) {
        return {
          success: false,
          data: null as unknown as InventoryReserveOutput,
          error: {
            code: 'INSUFFICIENT_INVENTORY',
            message: `Insufficient inventory. Requested: ${quantity}, Available: ${item.quantity}.`,
          },
        };
      }

      const result = await prisma.$transaction(async (tx) => {
        const updated = await tx.inventoryItem.update({
          where: { id: inventoryItemId },
          data: { quantity: item.quantity - quantity },
        });

        await logToolExecution({
          toolName: 'inventory.reserve',
          entityType: 'InventoryItem',
          entityId: inventoryItemId,
          status: ActionStatus.COMPLETED,
          details: {
            action: 'inventory_reserved',
            itemName: item.name,
            sku: item.sku,
            previousQuantity: item.quantity,
            reservedQuantity: quantity,
            newQuantity: updated.quantity,
          },
        });

        return updated;
      }, { timeout: 10000 });

      return {
        success: true,
        data: {
          inventoryItemId: result.id,
          name: result.name,
          sku: result.sku,
          previousQuantity: item.quantity,
          reservedQuantity: quantity,
          newQuantity: result.quantity,
          location: result.location,
        },
      };
    } catch (error) {
      await logToolExecution({
        toolName: 'inventory.reserve',
        entityType: 'InventoryItem',
        entityId: input.inventoryItemId,
        status: ActionStatus.FAILED,
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
      });

      return {
        success: false,
        data: null as unknown as InventoryReserveOutput,
        error: {
          code: 'RESERVE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to reserve inventory.',
        },
      };
    }
  },
};
