import { prisma } from '@/lib/prisma';
import { ToolDefinition, ToolPermission, ToolResult } from '../types';
import { logToolExecution } from '../logger';
import { ActionStatus, IncidentSeverity, IncidentStatus } from '@prisma/client';

export interface IncidentsSearchInput {
  severity?: IncidentSeverity;
  status?: IncidentStatus;
  machineId?: string;
  limit?: number;
}

export interface IncidentSearchResult {
  id: string;
  title: string;
  description: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  createdAt: Date;
  resolvedAt: Date | null;
  machine: {
    id: string;
    name: string;
    location: string;
  } | null;
}

async function execute(input: IncidentsSearchInput): Promise<ToolResult<IncidentSearchResult[]>> {
  const limit = Math.min(input.limit ?? 25, 100);

  try {
    const where: Record<string, unknown> = {};

    if (input.severity) {
      where.severity = input.severity;
    }

    if (input.status) {
      where.status = input.status;
    }

    if (input.machineId) {
      where.machineId = input.machineId;
    }

    const incidents = await prisma.incident.findMany({
      where,
      include: {
        machine: {
          select: { id: true, name: true, location: true },
        },
      },
      orderBy: [
        { severity: 'desc' },
        { createdAt: 'desc' },
      ],
      take: limit,
    });

    const results: IncidentSearchResult[] = incidents.map((incident) => ({
      id: incident.id,
      title: incident.title,
      description: incident.description,
      severity: incident.severity,
      status: incident.status,
      createdAt: incident.createdAt,
      resolvedAt: incident.resolvedAt,
      machine: incident.machine,
    }));

    await logToolExecution({
      toolName: 'incidents.search',
      entityType: 'Incident',
      status: ActionStatus.COMPLETED,
      details: {
        filters: {
          severity: input.severity,
          status: input.status,
          machineId: input.machineId,
          limit: input.limit,
        },
        resultCount: results.length,
      },
    });

    return { success: true, data: results };
  } catch (error) {
    await logToolExecution({
      toolName: 'incidents.search',
      entityType: 'Incident',
      status: ActionStatus.FAILED,
      details: { error: error instanceof Error ? error.message : 'Unknown error' },
    });

    return {
      success: false,
      data: [],
      error: {
        code: 'INCIDENTS_SEARCH_FAILED',
        message: 'Failed to search incidents. Please try again.',
      },
    };
  }
}

export const incidentsSearchTool: ToolDefinition<IncidentsSearchInput, IncidentSearchResult[]> = {
  name: 'incidents.search',
  description:
    'Search and filter machine incidents. Supports filtering by severity, status, and machine. Useful for finding critical incidents, open incidents, or incidents for a specific machine.',
  permission: ToolPermission.READ,
  inputSchema: {
    type: 'object',
    properties: {
      severity: {
        type: 'string',
        enum: Object.values(IncidentSeverity),
        description: 'Filter by incident severity',
      },
      status: {
        type: 'string',
        enum: Object.values(IncidentStatus),
        description: 'Filter by incident status',
      },
      machineId: {
        type: 'string',
        description: 'Filter by machine ID',
      },
      limit: {
        type: 'number',
        description: 'Maximum number of results (default 25, max 100)',
      },
    },
  },
  execute,
};
