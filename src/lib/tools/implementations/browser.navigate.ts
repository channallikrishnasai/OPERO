import { ToolDefinition, ToolPermission, ToolResult } from '../types';
import { logToolExecution } from '../logger';
import { ActionStatus } from '@prisma/client';
import session from '@/lib/browser/session';

export interface BrowserNavigateInput {
  url: string;
}

export interface BrowserNavigateOutput {
  url: string;
  title: string;
  verification: {
    outcome: 'SUCCESS' | 'FAILED' | 'UNCERTAIN';
    reason: string;
  };
}

async function execute(input: BrowserNavigateInput): Promise<ToolResult<BrowserNavigateOutput>> {
  try {
    const result = await session.navigateTo(input.url);

    await logToolExecution({
      toolName: 'browser.navigate',
      entityType: 'Browser',
      status: ActionStatus.COMPLETED,
      details: { url: result.url, title: result.title, verification: result.verification.outcome },
    });

    return { success: true, data: result };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    await logToolExecution({
      toolName: 'browser.navigate',
      entityType: 'Browser',
      status: ActionStatus.FAILED,
      details: { error: message },
    });

    return {
      success: false,
      data: { url: '', title: '', verification: { outcome: 'FAILED', reason: message } },
      error: { code: 'BROWSER_NAVIGATE_FAILED', message: `Failed to navigate: ${message}` },
    };
  }
}

export const browserNavigateTool: ToolDefinition<BrowserNavigateInput, BrowserNavigateOutput> = {
  name: 'browser.navigate',
  description:
    'Navigate the current browser tab to a URL. Use this when the user wants to go to a specific page within the current browser session.',
  permission: ToolPermission.SUGGEST,
  inputSchema: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'The URL to navigate to',
      },
    },
    required: ['url'],
  },
  execute,
};
