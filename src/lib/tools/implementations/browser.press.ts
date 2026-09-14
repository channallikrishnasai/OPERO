import { ToolDefinition, ToolPermission, ToolResult } from '../types';
import { logToolExecution } from '../logger';
import { ActionStatus } from '@prisma/client';
import session from '@/lib/browser/session';

export interface BrowserPressInput {
  key: string;
}

export interface BrowserPressOutput {
  success: boolean;
  description: string;
  verification: {
    outcome: 'SUCCESS' | 'FAILED' | 'UNCERTAIN';
    reason: string;
  };
}

async function execute(input: BrowserPressInput): Promise<ToolResult<BrowserPressOutput>> {
  try {
    const result = await session.pressKey(input.key);

    await logToolExecution({
      toolName: 'browser.press',
      entityType: 'Browser',
      status: ActionStatus.COMPLETED,
      details: { key: input.key, verification: result.verification.outcome },
    });

    return { success: true, data: result };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    await logToolExecution({
      toolName: 'browser.press',
      entityType: 'Browser',
      status: ActionStatus.FAILED,
      details: { key: input.key, error: message },
    });

    return {
      success: false,
      data: { success: false, description: '', verification: { outcome: 'FAILED', reason: message } },
      error: { code: 'BROWSER_PRESS_FAILED', message: `Failed to press key "${input.key}": ${message}` },
    };
  }
}

export const browserPressTool: ToolDefinition<BrowserPressInput, BrowserPressOutput> = {
  name: 'browser.press',
  description:
    'Press a keyboard key. Use standard key names: Enter, Tab, Escape, ArrowDown, ArrowUp, Backspace, Delete, Home, End, PageUp, PageDown, or single characters like "a".',
  permission: ToolPermission.SUGGEST,
  inputSchema: {
    type: 'object',
    properties: {
      key: {
        type: 'string',
        description: 'The key to press (e.g., "Enter", "Tab", "Escape", "a")',
      },
    },
    required: ['key'],
  },
  execute,
};
