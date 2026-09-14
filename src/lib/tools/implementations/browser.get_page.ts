import { ToolDefinition, ToolPermission, ToolResult } from '../types';
import { logToolExecution } from '../logger';
import { ActionStatus } from '@prisma/client';
import session from '@/lib/browser/session';

export interface BrowserGetPageOutput {
  url: string;
  title: string;
  content: string;
}

async function execute(): Promise<ToolResult<BrowserGetPageOutput>> {
  try {
    const info = await session.getPageInfo();

    await logToolExecution({
      toolName: 'browser.get_page',
      entityType: 'Browser',
      status: ActionStatus.COMPLETED,
      details: { url: info.url, title: info.title, contentLength: info.content.length },
    });

    return { success: true, data: info };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    await logToolExecution({
      toolName: 'browser.get_page',
      entityType: 'Browser',
      status: ActionStatus.FAILED,
      details: { error: message },
    });

    return {
      success: false,
      data: { url: '', title: '', content: '' },
      error: { code: 'BROWSER_GET_PAGE_FAILED', message: `Failed to get page info: ${message}` },
    };
  }
}

export const browserGetPageTool: ToolDefinition<Record<string, never>, BrowserGetPageOutput> = {
  name: 'browser.get_page',
  description:
    'Return information about the current browser page: URL, title, and main text content. Use this to verify the current state of the browser or to read page content.',
  permission: ToolPermission.READ,
  inputSchema: {
    type: 'object',
    properties: {},
  },
  execute,
};
