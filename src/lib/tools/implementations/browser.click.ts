import { ToolDefinition, ToolPermission, ToolResult } from '../types';
import { logToolExecution } from '../logger';
import { ActionStatus } from '@prisma/client';
import session, { BrowserSessionError } from '@/lib/browser/session';

export interface BrowserClickInput {
  target: string;
}

export interface BrowserClickOutput {
  success: boolean;
  description: string;
  verification: {
    outcome: 'SUCCESS' | 'FAILED' | 'UNCERTAIN';
    reason: string;
  };
}

async function execute(input: BrowserClickInput): Promise<ToolResult<BrowserClickOutput>> {
  try {
    const result = await session.clickElement(input.target);

    await logToolExecution({
      toolName: 'browser.click',
      entityType: 'Browser',
      status: ActionStatus.COMPLETED,
      details: { target: input.target, verification: result.verification.outcome },
    });

    return { success: true, data: result };
  } catch (error) {
    const code = error instanceof BrowserSessionError ? error.code : 'BROWSER_CLICK_FAILED';
    const message = error instanceof Error ? error.message : 'Unknown error';

    await logToolExecution({
      toolName: 'browser.click',
      entityType: 'Browser',
      status: ActionStatus.FAILED,
      details: { target: input.target, error: message },
    });

    return {
      success: false,
      data: { success: false, description: '', verification: { outcome: 'FAILED', reason: message } },
      error: { code, message: `Failed to click "${input.target}": ${message}` },
    };
  }
}

export const browserClickTool: ToolDefinition<BrowserClickInput, BrowserClickOutput> = {
  name: 'browser.click',
  description:
    'Click an element on the current page. Identify the element by accessible name (button text, link text, label), visible text, placeholder, or CSS selector. Prefer accessible names over selectors.',
  permission: ToolPermission.APPROVE,
  inputSchema: {
    type: 'object',
    properties: {
      target: {
        type: 'string',
        description:
          'How to identify the element: button/link text, label text, placeholder text, or CSS selector. Examples: "Sign In", "Search", "input[name=q]", "#submit-btn"',
      },
    },
    required: ['target'],
  },
  execute,
};
