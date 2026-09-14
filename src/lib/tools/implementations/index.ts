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
import { browserOpenTool } from './browser.open';
import { browserNavigateTool } from './browser.navigate';
import { browserGetPageTool } from './browser.get_page';
import { browserClickTool } from './browser.click';
import { browserTypeTool } from './browser.type';
import { browserPressTool } from './browser.press';
import { browserScrollTool } from './browser.scroll';
import { browserBackTool } from './browser.back';
import { browserScreenshotTool } from './browser.screenshot';
import { browserExtractTool } from './browser.extract';

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
  registerTool(browserOpenTool);
  registerTool(browserNavigateTool);
  registerTool(browserGetPageTool);
  registerTool(browserClickTool);
  registerTool(browserTypeTool);
  registerTool(browserPressTool);
  registerTool(browserScrollTool);
  registerTool(browserBackTool);
  registerTool(browserScreenshotTool);
  registerTool(browserExtractTool);
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
  browserOpenTool,
  browserNavigateTool,
  browserGetPageTool,
  browserClickTool,
  browserTypeTool,
  browserPressTool,
  browserScrollTool,
  browserBackTool,
  browserScreenshotTool,
  browserExtractTool,
};

export { getToolNames } from '../registry';
