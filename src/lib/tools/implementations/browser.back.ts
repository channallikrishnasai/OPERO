import { ToolDefinition, ToolPermission, ToolResult } from '../types';
import { logToolExecution } from '../logger';
import { ActionStatus } from '@prisma/client';
import session from '@/lib/browser/session';

export interface BrowserBackOutput {
  url: string;
  title: string;
  verification: {
    outcome: 'SUCCESS' | 'FAILED' | 'UNCERTAIN';
    reason: string;
  };
}

async function execute(): Promise<ToolResult<BrowserBackOutput>> {
  try {
    const result = await session.goBack();

    await logToolExecution({
      toolName: 'browser.back',
      entityType: 'Browser',
      status: ActionStatus.COMPLETED,
      details: { url: result.url, title: result.title, verification: result.verification.outcome },
    });

    return { success: true, data: result };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    await logToolExecution({
      toolName: 'browser.back',
      entityType: 'Browser',
      status: ActionStatus.FAILED,
      details: { error: message },
    });

    return {
      success: false,
      data: { url: '', title: '', verification: { outcome: 'FAILED', reason: message } },
      error: { code: 'BROWSER_BACK_FAILED', message: `Failed to go back: ${message}` },
    };
  }
}

export const browserBackTool: ToolDefinition<Record<string, never>, BrowserBackOutput> = {
  name: 'browser.back',
  description: 'Navigate the browser back one page in history.',
  permission: ToolPermission.SUGGEST,
  inputSchema: {
    type: 'object',
    properties: {},
  },
  execute,
};
