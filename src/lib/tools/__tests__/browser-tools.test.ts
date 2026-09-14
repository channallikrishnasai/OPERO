import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('playwright-core', () => {
  const mockPage = {
    goto: vi.fn().mockResolvedValue(undefined),
    url: vi.fn().mockReturnValue('https://example.com'),
    title: vi.fn().mockReturnValue('Example Page'),
    evaluate: vi.fn().mockResolvedValue('Page content here'),
    click: vi.fn().mockResolvedValue(undefined),
    fill: vi.fn().mockResolvedValue(undefined),
    keyboard: { press: vi.fn().mockResolvedValue(undefined) },
    mouse: { wheel: vi.fn().mockResolvedValue(undefined) },
    goBack: vi.fn().mockResolvedValue(undefined),
    screenshot: vi.fn().mockResolvedValue(undefined),
    isClosed: vi.fn().mockReturnValue(false),
    close: vi.fn().mockResolvedValue(undefined),
    getByRole: vi.fn().mockReturnValue({
      count: vi.fn().mockResolvedValue(1),
      first: vi.fn().mockReturnValue({
        click: vi.fn().mockResolvedValue(undefined),
        fill: vi.fn().mockResolvedValue(undefined),
        clear: vi.fn().mockResolvedValue(undefined),
        type: vi.fn().mockResolvedValue(undefined),
      }),
    }),
    getByLabel: vi.fn().mockReturnValue({ count: vi.fn().mockResolvedValue(0) }),
    getByText: vi.fn().mockReturnValue({ count: vi.fn().mockResolvedValue(0) }),
    getByPlaceholder: vi.fn().mockReturnValue({ count: vi.fn().mockResolvedValue(0) }),
    getByAltText: vi.fn().mockReturnValue({ count: vi.fn().mockResolvedValue(0) }),
    getByTitle: vi.fn().mockReturnValue({ count: vi.fn().mockResolvedValue(0) }),
    locator: vi.fn().mockReturnValue({ count: vi.fn().mockResolvedValue(0) }),
  };

  const mockContext = {
    newPage: vi.fn().mockResolvedValue(mockPage),
    close: vi.fn().mockResolvedValue(undefined),
  };

  const mockBrowser = {
    isConnected: vi.fn().mockReturnValue(true),
    newContext: vi.fn().mockResolvedValue(mockContext),
    close: vi.fn().mockResolvedValue(undefined),
  };

  return {
    chromium: {
      launch: vi.fn().mockResolvedValue(mockBrowser),
    },
    __mock: { mockPage, mockContext, mockBrowser },
  };
});

import {
  browserOpenTool,
  browserNavigateTool,
  browserGetPageTool,
  browserClickTool,
  browserTypeTool,
  browserPressTool,
  browserScrollTool,
  browserBackTool,
  browserScreenshotTool,
} from '../implementations';
import session from '@/lib/browser/session';

describe('Browser Tools', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    session.resetLedger();
  });

  describe('browser.open', () => {
    it('has correct metadata', () => {
      expect(browserOpenTool.name).toBe('browser.open');
      expect(browserOpenTool.permission).toBe('SUGGEST');
      expect(browserOpenTool.inputSchema.required).toContain('url');
    });

    it('opens a URL successfully', async () => {
      const result = await browserOpenTool.execute({ url: 'https://example.com' });
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('url');
      expect(result.data).toHaveProperty('title');
    });

    it('handles errors gracefully', async () => {
      const pw = await import('playwright-core') as unknown as { __mock: { mockPage: { goto: ReturnType<typeof vi.fn> } } };
      pw.__mock.mockPage.goto.mockRejectedValueOnce(new Error('Navigation timeout'));

      const result = await browserOpenTool.execute({ url: 'https://bad-url' });
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.code).toBe('BROWSER_OPEN_FAILED');
    });
  });

  describe('browser.navigate', () => {
    it('has correct metadata', () => {
      expect(browserNavigateTool.name).toBe('browser.navigate');
      expect(browserNavigateTool.permission).toBe('SUGGEST');
    });

    it('navigates successfully', async () => {
      const result = await browserNavigateTool.execute({ url: 'https://example.com/page' });
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('url');
    });
  });

  describe('browser.get_page', () => {
    it('has correct metadata', () => {
      expect(browserGetPageTool.name).toBe('browser.get_page');
      expect(browserGetPageTool.permission).toBe('READ');
    });

    it('returns page info', async () => {
      const result = await browserGetPageTool.execute({});
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('url');
      expect(result.data).toHaveProperty('title');
      expect(result.data).toHaveProperty('content');
    });
  });

  describe('browser.click', () => {
    it('has correct metadata', () => {
      expect(browserClickTool.name).toBe('browser.click');
      expect(browserClickTool.permission).toBe('APPROVE');
      expect(browserClickTool.inputSchema.required).toContain('target');
    });

    it('clicks an element', async () => {
      const result = await browserClickTool.execute({ target: 'Sign In' });
      expect(result.success).toBe(true);
      expect(result.data.success).toBe(true);
    });
  });

  describe('browser.type', () => {
    it('has correct metadata', () => {
      expect(browserTypeTool.name).toBe('browser.type');
      expect(browserTypeTool.permission).toBe('APPROVE');
      expect(browserTypeTool.inputSchema.required).toContain('target');
      expect(browserTypeTool.inputSchema.required).toContain('text');
    });

    it('types into a field', async () => {
      const result = await browserTypeTool.execute({ target: 'Search', text: 'hello' });
      expect(result.success).toBe(true);
      expect(result.data.success).toBe(true);
    });
  });

  describe('browser.press', () => {
    it('has correct metadata', () => {
      expect(browserPressTool.name).toBe('browser.press');
      expect(browserPressTool.permission).toBe('SUGGEST');
      expect(browserPressTool.inputSchema.required).toContain('key');
    });

    it('presses a key', async () => {
      const result = await browserPressTool.execute({ key: 'Enter' });
      expect(result.success).toBe(true);
      expect(result.data.success).toBe(true);
    });
  });

  describe('browser.scroll', () => {
    it('has correct metadata', () => {
      expect(browserScrollTool.name).toBe('browser.scroll');
      expect(browserScrollTool.permission).toBe('SUGGEST');
      expect(browserScrollTool.inputSchema.required).toContain('direction');
    });

    it('scrolls the page', async () => {
      const result = await browserScrollTool.execute({ direction: 'down' });
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('verification');
      expect(['SUCCESS', 'FAILED', 'UNCERTAIN']).toContain(result.data.verification.outcome);
    });
  });

  describe('browser.back', () => {
    it('has correct metadata', () => {
      expect(browserBackTool.name).toBe('browser.back');
      expect(browserBackTool.permission).toBe('SUGGEST');
    });

    it('goes back', async () => {
      const result = await browserBackTool.execute({});
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('url');
    });
  });

  describe('browser.screenshot', () => {
    it('has correct metadata', () => {
      expect(browserScreenshotTool.name).toBe('browser.screenshot');
      expect(browserScreenshotTool.permission).toBe('READ');
    });

    it('takes a screenshot', async () => {
      const result = await browserScreenshotTool.execute({});
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('path');
    });
  });

  describe('permission levels', () => {
    it('READ tools are auto-executable', () => {
      expect(browserGetPageTool.permission).toBe('READ');
      expect(browserScreenshotTool.permission).toBe('READ');
    });

    it('SUGGEST tools need user confirmation', () => {
      expect(browserOpenTool.permission).toBe('SUGGEST');
      expect(browserNavigateTool.permission).toBe('SUGGEST');
      expect(browserPressTool.permission).toBe('SUGGEST');
      expect(browserScrollTool.permission).toBe('SUGGEST');
      expect(browserBackTool.permission).toBe('SUGGEST');
    });

    it('APPROVE tools need formal approval', () => {
      expect(browserClickTool.permission).toBe('APPROVE');
      expect(browserTypeTool.permission).toBe('APPROVE');
    });
  });
});
