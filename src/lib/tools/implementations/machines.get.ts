import { prisma } from '@/lib/prisma';
import { ToolDefinition, ToolPermission, ToolResult } from '../types';
import { logToolExecution } from '../logger';
import { ActionStatus } from '@prisma/client';

export interface MachinesGetInput {
  machineId: string;
}

export interface MachineGetResult {
  id: string;
  name: string;
  location: string;
  status: string;
  lastMaintenance: Date | null;
  createdAt: Date;
  updatedAt: Date;
  incidents: Array<{
    id: string;
    title: string;
    description: string;
    severity: string;
    status: string;
    createdAt: Date;
    resolvedAt: Date | null;
  }>;
  openIncidentCount: number;
}

async function execute(input: MachinesGetInput): Promise<ToolResult<MachineGetResult>> {
  try {
    const machine = await prisma.machine.findUnique({
      where: { id: input.machineId },
      include: {
        incidents: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!machine) {
      await logToolExecution({
        toolName: 'machines.get',
        entityType: 'Machine',
        entityId: input.machineId,
        status: ActionStatus.FAILED,
        details: { error: 'Machine not found' },
      });

      return {
        success: false,
        data: null as unknown as MachineGetResult,
        error: {
          code: 'MACHINE_NOT_FOUND',
          message: `Machine with ID "${input.machineId}" was not found.`,
        },
      };
    }

    const openIncidentCount = machine.incidents.filter(
      (i) => i.status === 'OPEN' || i.status === 'IN_PROGRESS'
    ).length;

    const result: MachineGetResult = {
      id: machine.id,
      name: machine.name,
      location: machine.location,
      status: machine.status,
      lastMaintenance: machine.lastMaintenance,
      createdAt: machine.createdAt,
      updatedAt: machine.updatedAt,
      incidents: machine.incidents.map((i) => ({
        id: i.id,
        title: i.title,
        description: i.description,
        severity: i.severity,
        status: i.status,
        createdAt: i.createdAt,
        resolvedAt: i.resolvedAt,
      })),
      openIncidentCount,
    };

    await logToolExecution({
      toolName: 'machines.get',
      entityType: 'Machine',
      entityId: machine.id,
      status: ActionStatus.COMPLETED,
      details: { machineName: machine.name, status: machine.status, openIncidentCount },
    });

    return { success: true, data: result };
  } catch (error) {
    await logToolExecution({
      toolName: 'machines.get',
      entityType: 'Machine',
      entityId: input.machineId,
      status: ActionStatus.FAILED,
      details: { error: error instanceof Error ? error.message : 'Unknown error' },
    });

    return {
      success: false,
      data: null as unknown as MachineGetResult,
      error: {
        code: 'MACHINE_GET_FAILED',
        message: 'Failed to retrieve machine. Please try again.',
      },
    };
  }
}

export const machinesGetTool: ToolDefinition<MachinesGetInput, MachineGetResult> = {
  name: 'machines.get',
  description:
    'Get detailed information about a specific machine including its current status, location, maintenance history, and associated incidents.',
  permission: ToolPermission.READ,
  inputSchema: {
    type: 'object',
    properties: {
      machineId: {
        type: 'string',
        description: 'The unique identifier of the machine',
      },
    },
    required: ['machineId'],
  },
  execute,
};
