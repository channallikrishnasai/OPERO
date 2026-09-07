import { JsonValue } from '@prisma/client/runtime/library';

export interface DashboardSummary {
  totalOrders: number;
  delayedOrders: number;
  inventoryAlerts: number;
  activeIncidents: number;
  pendingTasks: number;
}

export interface OrderWithCustomer {
  id: string;
  status: string;
  priority: string;
  totalAmount: number;
  expectedDelivery: Date;
  actualDelivery: Date | null;
  createdAt: Date;
  customer: {
    name: string;
  };
}

export interface IncidentWithMachine {
  id: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  createdAt: Date;
  resolvedAt: Date | null;
  machine: {
    name: string;
    location: string;
  } | null;
}

export interface PriorityTask {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  assignedTo: string | null;
  dueDate: Date | null;
  createdAt: Date;
}

export interface ActionLogEntry {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  status: string;
  details: JsonValue | null;
  createdAt: Date;
}

export interface DashboardData {
  summary: DashboardSummary;
  recentOrders: OrderWithCustomer[];
  openIncidents: IncidentWithMachine[];
  priorityTasks: PriorityTask[];
  recentActions: ActionLogEntry[];
}
