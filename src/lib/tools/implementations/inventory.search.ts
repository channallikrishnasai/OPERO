import { prisma } from '@/lib/prisma';
import { ToolDefinition, ToolPermission, ToolResult } from '../types';
import { logToolExecution } from '../logger';
import { ActionStatus } from '@prisma/client';

export interface InventorySearchInput {
  sku?: string;
  name?: string;
  lowStock?: boolean;
  location?: string;
  limit?: number;
}

export interface InventorySearchResult {
  id: string;
  name: string;
  sku: string;
  quantity: number;
  reorderLevel: number;
  location: string;
  isLowStock: boolean;
  createdAt: Date;
  updatedAt: Date;
}

async function execute(input: InventorySearchInput): Promise<ToolResult<InventorySearchResult[]>> {
  const limit = Math.min(input.limit ?? 25, 100);

  try {
    const where: Record<string, unknown> = {};

    if (input.sku) {
      where.sku = { contains: input.sku };
    }

    if (input.name) {
      where.name = { contains: input.name };
    }

    if (input.location) {
      where.location = { contains: input.location };
    }

    let items = await prisma.inventoryItem.findMany({
      where,
      orderBy: [
        { quantity: 'asc' },
        { name: 'asc' },
      ],
      take: limit,
    });

    if (input.lowStock) {
      items = items.filter((item) => item.quantity <= item.reorderLevel);
    }

    const results: InventorySearchResult[] = items.map((item) => ({
      id: item.id,
      name: item.name,
      sku: item.sku,
      quantity: item.quantity,
      reorderLevel: item.reorderLevel,
      location: item.location,
      isLowStock: item.quantity <= item.reorderLevel,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }));

    await logToolExecution({
      toolName: 'inventory.search',
      entityType: 'InventoryItem',
      status: ActionStatus.COMPLETED,
      details: {
        filters: {
          sku: input.sku,
          name: input.name,
          lowStock: input.lowStock,
          location: input.location,
          limit: input.limit,
        },
        resultCount: results.length,
        lowStockCount: results.filter((r) => r.isLowStock).length,
      },
    });

    return { success: true, data: results };
  } catch (error) {
    await logToolExecution({
      toolName: 'inventory.search',
      entityType: 'InventoryItem',
      status: ActionStatus.FAILED,
      details: { error: error instanceof Error ? error.message : 'Unknown error' },
    });

    return {
      success: false,
      data: [],
      error: {
        code: 'INVENTORY_SEARCH_FAILED',
        message: 'Failed to search inventory. Please try again.',
      },
    };
  }
}

export const inventorySearchTool: ToolDefinition<InventorySearchInput, InventorySearchResult[]> = {
  name: 'inventory.search',
  description:
    'Search inventory items. Supports filtering by SKU, name, location, and low stock status. Items at or below reorder level are flagged as low stock.',
  permission: ToolPermission.READ,
  inputSchema: {
    type: 'object',
    properties: {
      sku: {
        type: 'string',
        description: 'Filter by SKU (partial match)',
      },
      name: {
        type: 'string',
        description: 'Filter by item name (partial match)',
      },
      lowStock: {
        type: 'boolean',
        description: 'If true, only return items at or below reorder level',
      },
      location: {
        type: 'string',
        description: 'Filter by storage location (partial match)',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of results (default 25, max 100)',
      },
    },
  },
  execute,
};
