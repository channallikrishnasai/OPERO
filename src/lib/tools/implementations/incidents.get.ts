import { prisma } from '@/lib/prisma';
import { ToolDefinition, ToolPermission, ToolResult } from '../types';
import { logToolExecution } from '../logger';
import { ActionStatus } from '@prisma/client';

export interface IncidentsGetInput {
  incidentId: string;
}

export interface IncidentGetResult {
  id: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  createdAt: Date;
  resolvedAt: Date | null;
  machine: {
    id: string;
    name: string;
    location: string;
    status: string;
    lastMaintenance: Date | null;
  } | null;
}

async function execute(input: IncidentsGetInput): Promise<ToolResult<IncidentGetResult>> {
  try {
    const incident = await prisma.incident.findUnique({
      where: { id: input.incidentId },
      include: {
        machine: {
          select: {
            id: true,
            name: true,
            location: true,
            status: true,
            lastMaintenance: true,
          },
        },
      },
    });

    if (!incident) {
      await logToolExecution({
        toolName: 'incidents.get',
        entityType: 'Incident',
        entityId: input.incidentId,
        status: ActionStatus.FAILED,
        details: { error: 'Incident not found' },
      });

      return {
        success: false,
        data: null as unknown as IncidentGetResult,
        error: {
          code: 'INCIDENT_NOT_FOUND',
          message: `Incident with ID "${input.incidentId}" was not found.`,
        },
      };
    }

    const result: IncidentGetResult = {
      id: incident.id,
      title: incident.title,
      description: incident.description,
      severity: incident.severity,
      status: incident.status,
      createdAt: incident.createdAt,
      resolvedAt: incident.resolvedAt,
      machine: incident.machine,
    };

    await logToolExecution({
      toolName: 'incidents.get',
      entityType: 'Incident',
      entityId: incident.id,
      status: ActionStatus.COMPLETED,
      details: { title: incident.title, severity: incident.severity, status: incident.status },
    });

    return { success: true, data: result };
  } catch (error) {
    await logToolExecution({
      toolName: 'incidents.get',
      entityType: 'Incident',
      entityId: input.incidentId,
      status: ActionStatus.FAILED,
      details: { error: error instanceof Error ? error.message : 'Unknown error' },
    });

    return {
      success: false,
      data: null as unknown as IncidentGetResult,
      error: {
        code: 'INCIDENT_GET_FAILED',
        message: 'Failed to retrieve incident. Please try again.',
      },
    };
  }
}

export const incidentsGetTool: ToolDefinition<IncidentsGetInput, IncidentGetResult> = {
  name: 'incidents.get',
  description:
    'Get detailed information about a specific incident including severity, status, description, and associated machine information.',
  permission: ToolPermission.READ,
  inputSchema: {
    type: 'object',
    properties: {
      incidentId: {
        type: 'string',
        description: 'The unique identifier of the incident',
      },
    },
    required: ['incidentId'],
  },
  execute,
};
