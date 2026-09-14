import { ToolDefinition, ToolPermission, ToolResult } from '../types';
import { logToolExecution } from '../logger';
import { ActionStatus } from '@prisma/client';
import session from '@/lib/browser/session';

export interface BrowserScrollInput {
  direction: 'up' | 'down' | 'left' | 'right';
  amount?: number;
}

export interface BrowserScrollOutput {
  success: boolean;
  description: string;
  verification: {
    outcome: 'SUCCESS' | 'FAILED' | 'UNCERTAIN';
    reason: string;
  };
}

async function execute(input: BrowserScrollInput): Promise<ToolResult<BrowserScrollOutput>> {
  try {
    const result = await session.scrollPage(input.direction, input.amount);

    await logToolExecution({
      toolName: 'browser.scroll',
      entityType: 'Browser',
      status: ActionStatus.COMPLETED,
      details: { direction: input.direction, amount: input.amount, verification: result.verification.outcome },
    });

    return { success: true, data: result };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    await logToolExecution({
      toolName: 'browser.scroll',
      entityType: 'Browser',
      status: ActionStatus.FAILED,
      details: { direction: input.direction, error: message },
    });

    return {
      success: false,
      data: { success: false, description: '', verification: { outcome: 'FAILED', reason: message } },
      error: { code: 'BROWSER_SCROLL_FAILED', message: `Failed to scroll: ${message}` },
    };
  }
}

export const browserScrollTool: ToolDefinition<BrowserScrollInput, BrowserScrollOutput> = {
  name: 'browser.scroll',
  description: 'Scroll the page in a given direction. Default scroll amount is 500 pixels.',
  permission: ToolPermission.SUGGEST,
  inputSchema: {
    type: 'object',
    properties: {
      direction: {
        type: 'string',
        enum: ['up', 'down', 'left', 'right'],
        description: 'Direction to scroll',
      },
      amount: {
        type: 'number',
        description: 'Number of pixels to scroll (default 500)',
      },
    },
    required: ['direction'],
  },
  execute,
};
