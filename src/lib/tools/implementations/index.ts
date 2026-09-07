import { registerTool } from '../registry';
import { ordersSearchTool } from './orders.search';
import { ordersGetTool } from './orders.get';
import { inventorySearchTool } from './inventory.search';
import { machinesGetTool } from './machines.get';
import { incidentsSearchTool } from './incidents.search';
import { incidentsGetTool } from './incidents.get';
import { tasksSearchTool } from './tasks.search';

export function registerAllTools(): void {
  registerTool(ordersSearchTool);
  registerTool(ordersGetTool);
  registerTool(inventorySearchTool);
  registerTool(machinesGetTool);
  registerTool(incidentsSearchTool);
  registerTool(incidentsGetTool);
  registerTool(tasksSearchTool);
}

export {
  ordersSearchTool,
  ordersGetTool,
  inventorySearchTool,
  machinesGetTool,
  incidentsSearchTool,
  incidentsGetTool,
  tasksSearchTool,
};

export { getToolNames } from '../registry';
