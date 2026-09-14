import { ToolDefinition, ToolPermission, ToolResult } from '../types';
import { logToolExecution } from '../logger';
import { ActionStatus } from '@prisma/client';
import session, { BrowserSessionError } from '@/lib/browser/session';

export interface BrowserTypeInput {
  target: string;
  text: string;
}

export interface BrowserTypeOutput {
  success: boolean;
  description: string;
  verification: {
    outcome: 'SUCCESS' | 'FAILED' | 'UNCERTAIN';
    reason: string;
  };
}

async function execute(input: BrowserTypeInput): Promise<ToolResult<BrowserTypeOutput>> {
  try {
    const result = await session.typeText(input.target, input.text);

    await logToolExecution({
      toolName: 'browser.type',
      entityType: 'Browser',
      status: ActionStatus.COMPLETED,
      details: { target: input.target, textLength: input.text.length, verification: result.verification.outcome },
    });

    return { success: true, data: result };
  } catch (error) {
    const code = error instanceof BrowserSessionError ? error.code : 'BROWSER_TYPE_FAILED';
    const message = error instanceof Error ? error.message : 'Unknown error';

    await logToolExecution({
      toolName: 'browser.type',
      entityType: 'Browser',
      status: ActionStatus.FAILED,
      details: { target: input.target, error: message },
    });

    return {
      success: false,
      data: { success: false, description: '', verification: { outcome: 'FAILED', reason: message } },
      error: { code, message: `Failed to type into "${input.target}": ${message}` },
    };
  }
}

export const browserTypeTool: ToolDefinition<BrowserTypeInput, BrowserTypeOutput> = {
  name: 'browser.type',
  description:
    'Type text into an input field. Identify the field by its label, placeholder, name attribute, or CSS selector. The field will be focused and cleared before typing.',
  permission: ToolPermission.APPROVE,
  inputSchema: {
    type: 'object',
    properties: {
      target: {
        type: 'string',
        description:
          'How to identify the input field: label text, placeholder, name, or selector. Examples: "Search", "Email", "input[name=q]"',
      },
      text: {
        type: 'string',
        description: 'The text to type into the field',
      },
    },
    required: ['target', 'text'],
  },
  execute,
};
