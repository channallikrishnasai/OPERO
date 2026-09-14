export const VOICE_AGENT_CONFIG = {
  name: 'OPERO',
  voice: { voice_id: 'george' },
  greeting: 'Hello, I am OPERO, your AI Work Operator. How can I help you today?',
  turn_detection: {
    min_silence_duration_ms: 500,
  },
} as const;

export const SYSTEM_PROMPT = `You are OPERO, an AI Work Operator.

Your role:
- You help users operate their browser and manage tasks using voice commands.
- You can browse the web, open websites, search, click, type, and verify results.
- You are concise, conversational, and professional.
- You investigate using available tools instead of guessing.
- Never claim an action happened unless the backend confirms it.

Rules:
- For READ tools (browser.get_page, browser.screenshot, browser.extract, orders.search, orders.get, inventory.search, machines.get, incidents.search, tasks.search), execute them directly.
- For browser interaction tools (browser.open, browser.navigate, browser.click, browser.type, browser.press, browser.scroll, browser.back), execute them directly.
- For action tools (orders.update, orders.reassign, inventory.reserve, tasks.create, tasks.update), investigate first, then propose the action to the user.
- Always wait for explicit user approval before executing action tools.
- If the user says "yes", "confirm", "approve", "proceed", or "do it", that is approval.
- Never execute action tools without explicit approval.
- Summarize tool results naturally instead of reading raw JSON.
- Ask clarifying questions when the user's request is ambiguous.
- Be concise. Don't ramble.

When the user asks to open a website or search the web:
1. Use browser.open to open the URL.
2. Use browser.get_page to read the page content.
3. Use browser.type to enter search queries.
4. Use browser.press to submit forms.
5. Use browser.get_page again to verify the results.
6. Report what you found.

When the user asks "What needs my attention right now?", investigate:
1. Critical and high-severity incidents
2. Delayed orders (past expected delivery)
3. Low inventory items
4. Urgent and high-priority tasks

Present findings in order of urgency.`;

const ASSEMBLYAI_TOOL_DEFINITIONS = [
  {
    type: 'function' as const,
    name: 'browser.open',
    description: 'Open a URL in the browser. Takes a URL parameter.',
    parameters: {
      type: 'object' as const,
      properties: {
        url: { type: 'string', description: 'The URL to open' },
      },
      required: ['url'],
    },
    execution_mode: 'interactive' as const,
  },
  {
    type: 'function' as const,
    name: 'browser.navigate',
    description: 'Navigate to a URL in the current browser tab. Takes a URL parameter.',
    parameters: {
      type: 'object' as const,
      properties: {
        url: { type: 'string', description: 'The URL to navigate to' },
      },
      required: ['url'],
    },
    execution_mode: 'interactive' as const,
  },
  {
    type: 'function' as const,
    name: 'browser.get_page',
    description: 'Get the current page URL, title, and text content. No parameters required.',
    parameters: {
      type: 'object' as const,
      properties: {},
    },
    execution_mode: 'interactive' as const,
  },
  {
    type: 'function' as const,
    name: 'browser.click',
    description: 'Click an element on the page. Takes a target parameter (text, label, or CSS selector).',
    parameters: {
      type: 'object' as const,
      properties: {
        target: { type: 'string', description: 'The element to click (text, label, or CSS selector)' },
      },
      required: ['target'],
    },
    execution_mode: 'interactive' as const,
  },
  {
    type: 'function' as const,
    name: 'browser.type',
    description: 'Type text into an input field. Takes target and text parameters.',
    parameters: {
      type: 'object' as const,
      properties: {
        target: { type: 'string', description: 'The input field to type into (text, label, or CSS selector)' },
        text: { type: 'string', description: 'The text to type' },
      },
      required: ['target', 'text'],
    },
    execution_mode: 'interactive' as const,
  },
  {
    type: 'function' as const,
    name: 'browser.press',
    description: 'Press a keyboard key. Takes a key parameter (e.g., "Enter", "Tab", "Escape").',
    parameters: {
      type: 'object' as const,
      properties: {
        key: { type: 'string', description: 'The key to press' },
      },
      required: ['key'],
    },
    execution_mode: 'interactive' as const,
  },
  {
    type: 'function' as const,
    name: 'browser.scroll',
    description: 'Scroll the page. Takes a direction parameter (up, down, left, right).',
    parameters: {
      type: 'object' as const,
      properties: {
        direction: { type: 'string', description: 'The direction to scroll (up, down, left, right)' },
        amount: { type: 'number', description: 'Optional scroll amount in pixels' },
      },
      required: ['direction'],
    },
    execution_mode: 'interactive' as const,
  },
  {
    type: 'function' as const,
    name: 'browser.back',
    description: 'Go back to the previous page. No parameters required.',
    parameters: {
      type: 'object' as const,
      properties: {},
    },
    execution_mode: 'interactive' as const,
  },
  {
    type: 'function' as const,
    name: 'browser.screenshot',
    description: 'Take a screenshot of the current page. No parameters required.',
    parameters: {
      type: 'object' as const,
      properties: {},
    },
    execution_mode: 'interactive' as const,
  },
  {
    type: 'function' as const,
    name: 'browser.extract',
    description: 'Extract structured page information: headings, links, buttons, form fields, and visible text. Read-only. No parameters required.',
    parameters: {
      type: 'object' as const,
      properties: {},
    },
    execution_mode: 'interactive' as const,
  },
  {
    type: 'function' as const,
    name: 'orders.search',
    description: 'Search customer orders by status, priority, customer, or delayed status.',
    parameters: {
      type: 'object' as const,
      properties: {
        status: { type: 'string', description: 'Filter by order status' },
        priority: { type: 'string', description: 'Filter by priority' },
        customer: { type: 'string', description: 'Filter by customer name' },
        delayed: { type: 'boolean', description: 'Filter for delayed orders only' },
      },
    },
    execution_mode: 'interactive' as const,
  },
  {
    type: 'function' as const,
    name: 'orders.get',
    description: 'Get detailed info about a specific order by ID.',
    parameters: {
      type: 'object' as const,
      properties: {
        orderId: { type: 'string', description: 'The order ID' },
      },
      required: ['orderId'],
    },
    execution_mode: 'interactive' as const,
  },
  {
    type: 'function' as const,
    name: 'orders.update',
    description: 'Update an order status or priority.',
    parameters: {
      type: 'object' as const,
      properties: {
        orderId: { type: 'string', description: 'The order ID' },
        status: { type: 'string', description: 'New status' },
        priority: { type: 'string', description: 'New priority' },
      },
      required: ['orderId'],
    },
    execution_mode: 'interactive' as const,
  },
  {
    type: 'function' as const,
    name: 'orders.reassign',
    description: 'Reassign an order to a different team member.',
    parameters: {
      type: 'object' as const,
      properties: {
        orderId: { type: 'string', description: 'The order ID' },
        assignee: { type: 'string', description: 'New assignee name' },
      },
      required: ['orderId', 'assignee'],
    },
    execution_mode: 'interactive' as const,
  },
  {
    type: 'function' as const,
    name: 'inventory.search',
    description: 'Search inventory items by SKU, name, location, or low stock status.',
    parameters: {
      type: 'object' as const,
      properties: {
        sku: { type: 'string', description: 'Filter by SKU' },
        name: { type: 'string', description: 'Filter by name' },
        location: { type: 'string', description: 'Filter by location' },
        lowStock: { type: 'boolean', description: 'Filter for low stock items only' },
      },
    },
    execution_mode: 'interactive' as const,
  },
  {
    type: 'function' as const,
    name: 'inventory.reserve',
    description: 'Reserve inventory items for use. Decreases available quantity.',
    parameters: {
      type: 'object' as const,
      properties: {
        itemId: { type: 'string', description: 'The inventory item ID' },
        quantity: { type: 'number', description: 'Quantity to reserve' },
      },
      required: ['itemId', 'quantity'],
    },
    execution_mode: 'interactive' as const,
  },
  {
    type: 'function' as const,
    name: 'machines.get',
    description: 'Get machine info including status, location, and associated incidents.',
    parameters: {
      type: 'object' as const,
      properties: {
        machineId: { type: 'string', description: 'The machine ID' },
      },
      required: ['machineId'],
    },
    execution_mode: 'interactive' as const,
  },
  {
    type: 'function' as const,
    name: 'incidents.search',
    description: 'Search incidents by severity, status, or machine.',
    parameters: {
      type: 'object' as const,
      properties: {
        severity: { type: 'string', description: 'Filter by severity' },
        status: { type: 'string', description: 'Filter by status' },
        machine: { type: 'string', description: 'Filter by machine name' },
      },
    },
    execution_mode: 'interactive' as const,
  },
  {
    type: 'function' as const,
    name: 'tasks.search',
    description: 'Search tasks by status, priority, or assignee.',
    parameters: {
      type: 'object' as const,
      properties: {
        status: { type: 'string', description: 'Filter by status' },
        priority: { type: 'string', description: 'Filter by priority' },
        assignee: { type: 'string', description: 'Filter by assignee' },
      },
    },
    execution_mode: 'interactive' as const,
  },
  {
    type: 'function' as const,
    name: 'tasks.create',
    description: 'Create a new task.',
    parameters: {
      type: 'object' as const,
      properties: {
        title: { type: 'string', description: 'Task title' },
        description: { type: 'string', description: 'Task description' },
        priority: { type: 'string', description: 'Task priority' },
        assignee: { type: 'string', description: 'Task assignee' },
      },
      required: ['title'],
    },
    execution_mode: 'interactive' as const,
  },
  {
    type: 'function' as const,
    name: 'tasks.update',
    description: 'Update a task status, priority, or assignment.',
    parameters: {
      type: 'object' as const,
      properties: {
        taskId: { type: 'string', description: 'The task ID' },
        status: { type: 'string', description: 'New status' },
        priority: { type: 'string', description: 'New priority' },
        assignee: { type: 'string', description: 'New assignee' },
      },
      required: ['taskId'],
    },
    execution_mode: 'interactive' as const,
  },
];

export function getAssemblyAITools() {
  return ASSEMBLYAI_TOOL_DEFINITIONS;
}
