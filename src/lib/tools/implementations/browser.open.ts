import { ToolDefinition, ToolPermission, ToolResult } from '../types';
import { logToolExecution } from '../logger';
import { ActionStatus } from '@prisma/client';
import session from '@/lib/browser/session';

export interface BrowserOpenInput {
  url: string;
}

export interface BrowserOpenOutput {
  url: string;
  title: string;
  verification: {
    outcome: 'SUCCESS' | 'FAILED' | 'UNCERTAIN';
    reason: string;
  };
}

async function execute(input: BrowserOpenInput): Promise<ToolResult<BrowserOpenOutput>> {
  try {
    const result = await session.openUrl(input.url);

    await logToolExecution({
      toolName: 'browser.open',
      entityType: 'Browser',
      status: ActionStatus.COMPLETED,
      details: { url: result.url, title: result.title, verification: result.verification.outcome },
    });

    return { success: true, data: result };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    await logToolExecution({
      toolName: 'browser.open',
      entityType: 'Browser',
      status: ActionStatus.FAILED,
      details: { error: message },
    });

    return {
      success: false,
      data: { url: '', title: '', verification: { outcome: 'FAILED', reason: message } },
      error: { code: 'BROWSER_OPEN_FAILED', message: `Failed to open URL: ${message}` },
    };
  }
}

export const browserOpenTool: ToolDefinition<BrowserOpenInput, BrowserOpenOutput> = {
  name: 'browser.open',
  description:
    'Open a URL in the controlled browser. Use this when the user asks to open a website. The browser will navigate to the URL and return the page title and final URL.',
  permission: ToolPermission.SUGGEST,
  inputSchema: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'The URL to open (e.g., "https://google.com" or "google.com")',
      },
    },
    required: ['url'],
  },
  execute,
};
