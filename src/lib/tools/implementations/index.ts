import { registerTool } from '../registry';
import { ordersSearchTool } from './orders.search';
import { ordersGetTool } from './orders.get';
import { ordersUpdateTool } from './orders.update';
import { ordersReassignTool } from './orders.reassign';
import { inventorySearchTool } from './inventory.search';
import { inventoryReserveTool } from './inventory.reserve';
import { machinesGetTool } from './machines.get';
import { incidentsSearchTool } from './incidents.search';
import { incidentsGetTool } from './incidents.get';
import { tasksSearchTool } from './tasks.search';
import { tasksCreateTool } from './tasks.create';
import { tasksUpdateTool } from './tasks.update';

export function registerAllTools(): void {
  registerTool(ordersSearchTool);
  registerTool(ordersGetTool);
  registerTool(ordersUpdateTool);
  registerTool(ordersReassignTool);
  registerTool(inventorySearchTool);
  registerTool(inventoryReserveTool);
  registerTool(machinesGetTool);
  registerTool(incidentsSearchTool);
  registerTool(incidentsGetTool);
  registerTool(tasksSearchTool);
  registerTool(tasksCreateTool);
  registerTool(tasksUpdateTool);
}

export {
  ordersSearchTool,
  ordersGetTool,
  ordersUpdateTool,
  ordersReassignTool,
  inventorySearchTool,
  inventoryReserveTool,
  machinesGetTool,
  incidentsSearchTool,
  incidentsGetTool,
  tasksSearchTool,
  tasksCreateTool,
  tasksUpdateTool,
};

export { getToolNames } from '../registry';
