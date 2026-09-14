import { ToolDefinition, ToolPermission, ToolResult } from '../types';
import { logToolExecution } from '../logger';
import { ActionStatus } from '@prisma/client';
import session from '@/lib/browser/session';

export interface BrowserScreenshotOutput {
  path: string;
  description: string;
}

async function execute(): Promise<ToolResult<BrowserScreenshotOutput>> {
  try {
    const result = await session.takeScreenshot();

    await logToolExecution({
      toolName: 'browser.screenshot',
      entityType: 'Browser',
      status: ActionStatus.COMPLETED,
      details: { path: result.path },
    });

    return { success: true, data: result };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    await logToolExecution({
      toolName: 'browser.screenshot',
      entityType: 'Browser',
      status: ActionStatus.FAILED,
      details: { error: message },
    });

    return {
      success: false,
      data: { path: '', description: '' },
      error: { code: 'BROWSER_SCREENSHOT_FAILED', message: `Failed to take screenshot: ${message}` },
    };
  }
}

export const browserScreenshotTool: ToolDefinition<Record<string, never>, BrowserScreenshotOutput> = {
  name: 'browser.screenshot',
  description:
    'Capture a screenshot of the current browser page. Useful for verification and debugging. Returns the file path.',
  permission: ToolPermission.READ,
  inputSchema: {
    type: 'object',
    properties: {},
  },
  execute,
};
