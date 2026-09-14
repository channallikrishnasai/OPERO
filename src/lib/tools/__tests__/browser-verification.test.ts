import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('playwright-core', () => {
  const mockPage = {
    goto: vi.fn().mockResolvedValue(undefined),
    url: vi.fn().mockReturnValue('https://example.com'),
    title: vi.fn().mockReturnValue('Example Page'),
    evaluate: vi.fn().mockResolvedValue(undefined),
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
    locator: vi.fn().mockReturnValue({
      count: vi.fn().mockResolvedValue(1),
      first: vi.fn().mockReturnValue({
        click: vi.fn().mockResolvedValue(undefined),
        fill: vi.fn().mockResolvedValue(undefined),
        clear: vi.fn().mockResolvedValue(undefined),
        type: vi.fn().mockResolvedValue(undefined),
      }),
    }),
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
  browserScrollTool,
  browserClickTool,
  browserTypeTool,
  browserPressTool,
  browserBackTool,
} from '../implementations';
import session from '@/lib/browser/session';

async function getMockPage() {
  const pw = await import('playwright-core') as unknown as {
    __mock: { mockPage: { evaluate: ReturnType<typeof vi.fn>; url: ReturnType<typeof vi.fn>; title: ReturnType<typeof vi.fn>; goto: ReturnType<typeof vi.fn>; getByRole: ReturnType<typeof vi.fn>; goBack: ReturnType<typeof vi.fn> } };
  };
  return pw.__mock.mockPage;
}

function defaultEvalMock() {
  return async (fn: unknown, _arg?: unknown) => {
    if (typeof fn !== 'function') return 'Page content here';
    const fnStr = fn.toString();
    if (fnStr.includes('getVisibleText') || fnStr.includes('checkCaptcha')) {
      return { handoff: false };
    }
    if (fnStr.includes('scrollX')) return { x: 0, y: 0 };
    if (fnStr.includes('cloneNode') || fnStr.includes('innerText')) return 'Page content here';
    if (fnStr.includes('querySelector') && fnStr.includes('value')) return '';
    if (fnStr.includes('activeElement')) return { tag: null, selector: null };
    return 'Page content here';
  };
}

describe('Browser Verification', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    session.resetLedger();
    const page = await getMockPage();
    page.evaluate.mockImplementation(defaultEvalMock());
  });

  describe('browser.open — navigation verification', () => {
    it('returns verification field in output', async () => {
      const result = await browserOpenTool.execute({ url: 'https://example.com' });
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('verification');
      expect(result.data.verification).toHaveProperty('outcome');
      expect(result.data.verification).toHaveProperty('reason');
      expect(['SUCCESS', 'FAILED', 'UNCERTAIN']).toContain(result.data.verification.outcome);
    });

    it('returns SUCCESS when URL changes', async () => {
      const page = await getMockPage();
      let currentUrl = 'https://old.com';
      page.goto.mockImplementation(async () => {
        currentUrl = 'https://new.com';
      });
      page.url.mockImplementation(() => currentUrl);

      const result = await browserOpenTool.execute({ url: 'https://new.com' });
      expect(result.success).toBe(true);
      expect(result.data.verification.outcome).toBe('SUCCESS');
      expect(result.data.verification.reason).toContain('URL changed');
    });

    it('returns SUCCESS when title changes', async () => {
      const page = await getMockPage();
      let callCount = 0;
      page.title.mockImplementation(async () => {
        callCount++;
        return callCount <= 1 ? 'Old' : 'New';
      });

      const result = await browserOpenTool.execute({ url: 'https://example.com' });
      expect(result.success).toBe(true);
      expect(result.data.verification.outcome).toBe('SUCCESS');
      expect(result.data.verification.reason).toContain('title changed');
    });

    it('returns UNCERTAIN when nothing changes', async () => {
      const result = await browserOpenTool.execute({ url: 'https://example.com' });
      expect(result.success).toBe(true);
      expect(result.data.verification.outcome).toBe('UNCERTAIN');
    });
  });

  describe('browser.scroll — scroll position verification', () => {
    it('returns SUCCESS when scroll position changes', async () => {
      const page = await getMockPage();
      let scrollCallCount = 0;
      page.evaluate.mockImplementation(async (fn: unknown) => {
        if (typeof fn !== 'function') return 'content';
        const fnStr = fn.toString();
        if (fnStr.includes('scrollX')) {
          scrollCallCount++;
          return scrollCallCount <= 1 ? { x: 0, y: 0 } : { x: 0, y: 500 };
        }
        if (fnStr.includes('cloneNode') || fnStr.includes('innerText')) return 'content';
        if (fnStr.includes('activeElement')) return { tag: null, selector: null };
        return 'content';
      });

      const result = await browserScrollTool.execute({ direction: 'down' });
      expect(result.success).toBe(true);
      expect(result.data.verification.outcome).toBe('SUCCESS');
      expect(result.data.verification.reason).toContain('Scrolled');
    });

    it('returns FAILED when scroll position unchanged', async () => {
      const result = await browserScrollTool.execute({ direction: 'down' });
      expect(result.data.success).toBe(false);
      expect(result.data.verification.outcome).toBe('FAILED');
      expect(result.data.verification.reason).toContain('unchanged');
    });
  });

  describe('browser.click — multi-signal verification', () => {
    it('returns SUCCESS when navigation occurs', async () => {
      const page = await getMockPage();
      let currentUrl = 'https://page1.com';
      page.url.mockImplementation(() => currentUrl);

      const mockClick = vi.fn().mockImplementation(async () => {
        currentUrl = 'https://page2.com';
      });
      page.getByRole.mockReturnValue({
        count: vi.fn().mockResolvedValue(1),
        first: vi.fn().mockReturnValue({
          click: mockClick,
          fill: vi.fn().mockResolvedValue(undefined),
          clear: vi.fn().mockResolvedValue(undefined),
          type: vi.fn().mockResolvedValue(undefined),
        }),
      });

      const result = await browserClickTool.execute({ target: 'Sign In' });
      expect(result.success).toBe(true);
      expect(result.data.verification.outcome).toBe('SUCCESS');
      expect(result.data.verification.reason).toContain('Navigation');
    });

    it('returns SUCCESS when DOM content changes', async () => {
      const page = await getMockPage();
      let bodyCount = 0;
      page.evaluate.mockImplementation(async (fn: unknown) => {
        if (typeof fn !== 'function') return 'same';
        const fnStr = fn.toString();
        if (fnStr.includes('getVisibleText') || fnStr.includes('checkCaptcha')) return { handoff: false };
        if (fnStr.includes('scrollX')) return { x: 0, y: 0 };
        if (fnStr.includes('activeElement')) return { tag: null, selector: null };
        if (fnStr.includes('cloneNode') || fnStr.includes('innerText')) {
          bodyCount++;
          return bodyCount <= 1 ? 'Before' : 'After changed';
        }
        return 'same';
      });

      const result = await browserClickTool.execute({ target: 'Button' });
      expect(result.success).toBe(true);
      expect(result.data.verification.outcome).toBe('SUCCESS');
      expect(result.data.verification.reason).toContain('content changed');
    });

    it('returns SUCCESS when focus moves', async () => {
      const page = await getMockPage();
      let focusCount = 0;
      page.evaluate.mockImplementation(async (fn: unknown) => {
        if (typeof fn !== 'function') return 'same';
        const fnStr = fn.toString();
        if (fnStr.includes('getVisibleText') || fnStr.includes('checkCaptcha')) return { handoff: false };
        if (fnStr.includes('scrollX')) return { x: 0, y: 0 };
        if (fnStr.includes('cloneNode') || fnStr.includes('innerText')) return 'same';
        if (fnStr.includes('activeElement')) {
          focusCount++;
          return focusCount <= 1
            ? { tag: null, selector: null }
            : { tag: 'input', selector: 'input#q' };
        }
        return 'same';
      });

      const result = await browserClickTool.execute({ target: 'Search' });
      expect(result.success).toBe(true);
      expect(result.data.verification.outcome).toBe('SUCCESS');
      expect(result.data.verification.reason).toContain('Focus moved');
    });

    it('returns UNCERTAIN when no observable effect', async () => {
      const result = await browserClickTool.execute({ target: 'Button' });
      expect(result.success).toBe(true);
      expect(result.data.verification.outcome).toBe('UNCERTAIN');
    });
  });

  describe('browser.type — input value verification', () => {
    it('returns SUCCESS when body content changes after typing', async () => {
      const page = await getMockPage();
      let bodyCount = 0;
      page.evaluate.mockImplementation(async (fn: unknown) => {
        if (typeof fn !== 'function') return 'content';
        const fnStr = fn.toString();
        if (fnStr.includes('getVisibleText') || fnStr.includes('checkCaptcha')) return { handoff: false };
        if (fnStr.includes('scrollX')) return { x: 0, y: 0 };
        if (fnStr.includes('cloneNode') || fnStr.includes('innerText')) {
          bodyCount++;
          return bodyCount <= 1 ? 'Before content' : 'After typed content changed';
        }
        if (fnStr.includes('querySelector') && fnStr.includes('value')) return '';
        if (fnStr.includes('activeElement')) return { tag: 'input', selector: 'input#q' };
        return '';
      });

      const result = await browserTypeTool.execute({ target: 'Search', text: 'hello' });
      expect(result.success).toBe(true);
      expect(result.data.verification.outcome).toBe('SUCCESS');
    });

    it('returns UNCERTAIN when value cannot be confirmed', async () => {
      const result = await browserTypeTool.execute({ target: 'Search', text: 'test' });
      expect(result.success).toBe(true);
      expect(result.data.verification.outcome).toBe('UNCERTAIN');
    });
  });

  describe('browser.back — URL change verification', () => {
    it('returns SUCCESS when URL changes', async () => {
      const page = await getMockPage();
      let currentUrl = 'https://page2.com';
      page.goBack.mockImplementation(async () => {
        currentUrl = 'https://page1.com';
      });
      page.url.mockImplementation(() => currentUrl);

      const result = await browserBackTool.execute({});
      expect(result.success).toBe(true);
      expect(result.data.verification.outcome).toBe('SUCCESS');
      expect(result.data.verification.reason).toContain('URL changed');
    });

    it('returns UNCERTAIN when URL unchanged', async () => {
      const result = await browserBackTool.execute({});
      expect(result.success).toBe(true);
      expect(result.data.verification.outcome).toBe('UNCERTAIN');
    });
  });

  describe('browser.press — context-dependent verification', () => {
    it('returns SUCCESS when content changes', async () => {
      const page = await getMockPage();
      let bodyCount = 0;
      page.evaluate.mockImplementation(async (fn: unknown) => {
        if (typeof fn !== 'function') return 'same';
        const fnStr = fn.toString();
        if (fnStr.includes('getVisibleText') || fnStr.includes('checkCaptcha')) return { handoff: false };
        if (fnStr.includes('scrollX')) return { x: 0, y: 0 };
        if (fnStr.includes('activeElement')) return { tag: null, selector: null };
        if (fnStr.includes('cloneNode') || fnStr.includes('innerText')) {
          bodyCount++;
          return bodyCount <= 1 ? 'Before' : 'After content';
        }
        return 'same';
      });

      const result = await browserPressTool.execute({ key: 'Enter' });
      expect(result.success).toBe(true);
      expect(result.data.verification.outcome).toBe('SUCCESS');
      expect(result.data.verification.reason).toContain('content changed');
    });

    it('returns SUCCESS when focus changes', async () => {
      const page = await getMockPage();
      let focusCount = 0;
      page.evaluate.mockImplementation(async (fn: unknown) => {
        if (typeof fn !== 'function') return 'same';
        const fnStr = fn.toString();
        if (fnStr.includes('getVisibleText') || fnStr.includes('checkCaptcha')) return { handoff: false };
        if (fnStr.includes('scrollX')) return { x: 0, y: 0 };
        if (fnStr.includes('cloneNode') || fnStr.includes('innerText')) return 'same';
        if (fnStr.includes('activeElement')) {
          focusCount++;
          return focusCount <= 1
            ? { tag: 'input', selector: 'input#a' }
            : { tag: 'input', selector: 'input#b' };
        }
        return 'same';
      });

      const result = await browserPressTool.execute({ key: 'Tab' });
      expect(result.success).toBe(true);
      expect(result.data.verification.outcome).toBe('SUCCESS');
      expect(result.data.verification.reason).toContain('Focus moved');
    });

    it('returns UNCERTAIN when no observable effect', async () => {
      const result = await browserPressTool.execute({ key: 'Shift' });
      expect(result.success).toBe(true);
      expect(result.data.verification.outcome).toBe('UNCERTAIN');
    });
  });
});
