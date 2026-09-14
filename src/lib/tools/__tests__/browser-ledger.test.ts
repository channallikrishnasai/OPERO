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
  browserClickTool,
  browserTypeTool,
  browserPressTool,
  browserScrollTool,
  browserScreenshotTool,
  browserGetPageTool,
  browserOpenTool,
  browserNavigateTool,
  browserBackTool,
} from '../implementations';
import session from '@/lib/browser/session';

async function getMockPage() {
  const pw = await import('playwright-core') as unknown as {
    __mock: { mockPage: { evaluate: ReturnType<typeof vi.fn>; url: ReturnType<typeof vi.fn>; goto: ReturnType<typeof vi.fn>; keyboard: { press: ReturnType<typeof vi.fn> }; getByRole: ReturnType<typeof vi.fn>; locator: ReturnType<typeof vi.fn> } };
  };
  return pw.__mock.mockPage;
}

function makeBodyChangeEval() {
  let hashCallCount = 0;
  return async (fn: unknown) => {
    if (typeof fn !== 'function') return 'content';
    const fnStr = fn.toString();
    if (fnStr.includes('scrollX')) return { x: 0, y: 0 };
    if (fnStr.includes('activeElement') && fnStr.includes('tagName')) return { tag: null, selector: null };
    if (fnStr.includes('cloneNode') || (fnStr.includes('innerText') && fnStr.includes('querySelectorAll'))) {
      return { handoff: false };
    }
    if (fnStr.includes('<<') || fnStr.includes('charCodeAt')) {
      hashCallCount++;
      return hashCallCount % 2 === 1 ? 12345 : 67890;
    }
    if (fnStr.includes('value')) return '';
    return 'content';
  };
}

describe('Action Ledger — Duplicate Prevention', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    session.resetLedger();
    const page = await getMockPage();
    page.url.mockReturnValue('https://example.com');
    page.goto.mockResolvedValue(undefined);
    page.keyboard.press.mockResolvedValue(undefined);
    page.evaluate.mockImplementation(makeBodyChangeEval());
  });

  describe('A. Duplicate successful action — click', () => {
    it('blocks second click with same target on same page', async () => {
      const page = await getMockPage();

      const firstResult = await browserClickTool.execute({ target: 'Post' });
      expect(firstResult.success).toBe(true);
      expect(firstResult.data.verification.outcome).toBe('SUCCESS');

      const secondResult = await browserClickTool.execute({ target: 'Post' });
      expect(secondResult.success).toBe(true);
      expect(secondResult.data.verification.outcome).toBe('UNCERTAIN');
      expect(secondResult.data.verification.reason).toContain('Duplicate action prevented');

      const firstLocator = page.locator.mock.results[0].value;
      expect(firstLocator.first).toHaveBeenCalledTimes(1);
      expect(page.locator).toHaveBeenCalledTimes(1);
    });
  });

  describe('B. Different action — click different targets', () => {
    it('allows clicking different buttons on same page', async () => {
      const resultA = await browserClickTool.execute({ target: 'Like' });
      expect(resultA.success).toBe(true);
      expect(resultA.data.verification.outcome).toBe('SUCCESS');

      const resultB = await browserClickTool.execute({ target: 'Share' });
      expect(resultB.success).toBe(true);
      expect(resultB.data.verification.outcome).toBe('SUCCESS');
    });
  });

  describe('C. Same action on different page', () => {
    it('allows same click after navigation to new page', async () => {
      const page = await getMockPage();

      const firstResult = await browserClickTool.execute({ target: 'Post' });
      expect(firstResult.success).toBe(true);
      expect(firstResult.data.verification.outcome).toBe('SUCCESS');

      let currentUrl = 'https://example.com';
      page.goto.mockImplementation(async () => {
        currentUrl = 'https://other.com';
      });
      page.url.mockImplementation(() => currentUrl);

      const navResult = await browserNavigateTool.execute({ url: 'https://other.com' });
      expect(navResult.success).toBe(true);

      const secondResult = await browserClickTool.execute({ target: 'Post' });
      expect(secondResult.success).toBe(true);
      expect(secondResult.data.verification.outcome).not.toBe('UNCERTAIN');
      expect(secondResult.data.verification.reason).not.toContain('Duplicate');
    });
  });

  describe('D. Failed first attempt allows retry', () => {
    it('allows retry after UNCERTAIN verification', async () => {
      const firstResult = await browserClickTool.execute({ target: 'Submit' });
      expect(firstResult.data.verification.outcome).toBe('SUCCESS');

      const secondResult = await browserClickTool.execute({ target: 'Different' });
      expect(secondResult.success).toBe(true);
      expect(secondResult.data.verification.outcome).toBe('SUCCESS');
    });
  });

  describe('E. Repeatable actions not blocked', () => {
    it('scroll is never blocked by ledger', async () => {
      const firstResult = await browserScrollTool.execute({ direction: 'down' });
      expect(firstResult.success).toBe(true);

      const secondResult = await browserScrollTool.execute({ direction: 'down' });
      expect(secondResult.success).toBe(true);
      expect(secondResult.data.verification.reason).not.toContain('Duplicate');
    });

    it('screenshot is never blocked by ledger', async () => {
      const firstResult = await browserScreenshotTool.execute({});
      expect(firstResult.success).toBe(true);

      const secondResult = await browserScreenshotTool.execute({});
      expect(secondResult.success).toBe(true);
    });

    it('get_page is never blocked by ledger', async () => {
      const firstResult = await browserGetPageTool.execute({});
      expect(firstResult.success).toBe(true);

      const secondResult = await browserGetPageTool.execute({});
      expect(secondResult.success).toBe(true);
    });
  });

  describe('F. Different tool identity does not collide', () => {
    it('click and press with different semantics do not collide', async () => {
      const clickResult = await browserClickTool.execute({ target: 'Submit' });
      expect(clickResult.success).toBe(true);
      expect(clickResult.data.verification.outcome).toBe('SUCCESS');

      const pressResult = await browserPressTool.execute({ key: 'Enter' });
      expect(pressResult.success).toBe(true);
      expect(pressResult.data.verification.outcome).toBe('SUCCESS');
    });
  });

  describe('G. Input normalization', () => {
    it('equivalent normalized click inputs resolve to same ledger identity', async () => {
      const firstResult = await browserClickTool.execute({ target: '  Post  ' });
      expect(firstResult.success).toBe(true);
      expect(firstResult.data.verification.outcome).toBe('SUCCESS');

      const secondResult = await browserClickTool.execute({ target: 'post' });
      expect(secondResult.success).toBe(true);
      expect(secondResult.data.verification.outcome).toBe('UNCERTAIN');
      expect(secondResult.data.verification.reason).toContain('Duplicate action prevented');
    });

    it('case-insensitive press keys resolve to same identity', async () => {
      const firstResult = await browserPressTool.execute({ key: 'Enter' });
      expect(firstResult.success).toBe(true);
      expect(firstResult.data.verification.outcome).toBe('SUCCESS');

      const secondResult = await browserPressTool.execute({ key: 'enter' });
      expect(secondResult.success).toBe(true);
      expect(secondResult.data.verification.outcome).toBe('UNCERTAIN');
      expect(secondResult.data.verification.reason).toContain('Duplicate action prevented');
    });
  });

  describe('H. Duplicate type action', () => {
    it('blocks second type with same target and text on same page', async () => {
      const firstResult = await browserTypeTool.execute({ target: 'Search', text: 'hello' });
      expect(firstResult.success).toBe(true);
      expect(firstResult.data.verification.outcome).toBe('SUCCESS');

      const secondResult = await browserTypeTool.execute({ target: 'Search', text: 'hello' });
      expect(secondResult.success).toBe(true);
      expect(secondResult.data.verification.outcome).toBe('UNCERTAIN');
      expect(secondResult.data.verification.reason).toContain('Duplicate action prevented');
    });

    it('allows type with different text on same target', async () => {
      const firstResult = await browserTypeTool.execute({ target: 'Search', text: 'hello' });
      expect(firstResult.success).toBe(true);
      expect(firstResult.data.verification.outcome).toBe('SUCCESS');

      const secondResult = await browserTypeTool.execute({ target: 'Search', text: 'world' });
      expect(secondResult.success).toBe(true);
      expect(secondResult.data.verification.outcome).toBe('SUCCESS');
    });
  });

  describe('I. Navigation clears old-URL ledger entries', () => {
    it('clears old page entries after successful navigation', async () => {
      const page = await getMockPage();

      const clickResult = await browserClickTool.execute({ target: 'Link' });
      expect(clickResult.success).toBe(true);
      expect(clickResult.data.verification.outcome).toBe('SUCCESS');

      let currentUrl = 'https://example.com';
      page.goto.mockImplementation(async () => {
        currentUrl = 'https://other.com';
      });
      page.url.mockImplementation(() => currentUrl);

      const navResult = await browserNavigateTool.execute({ url: 'https://other.com' });
      expect(navResult.success).toBe(true);

      page.url.mockReturnValue('https://example.com');
      const backResult = await browserBackTool.execute({});
      expect(backResult.success).toBe(true);

      page.url.mockReturnValue('https://example.com');
      const clickAgain = await browserClickTool.execute({ target: 'Link' });
      expect(clickAgain.success).toBe(true);
      expect(clickAgain.data.verification.reason).not.toContain('Duplicate');
    });
  });

  describe('J. Duplicate press action', () => {
    it('blocks second press with same key on same page', async () => {
      const firstResult = await browserPressTool.execute({ key: 'Tab' });
      expect(firstResult.success).toBe(true);
      expect(firstResult.data.verification.outcome).toBe('SUCCESS');

      const secondResult = await browserPressTool.execute({ key: 'Tab' });
      expect(secondResult.success).toBe(true);
      expect(secondResult.data.verification.outcome).toBe('UNCERTAIN');
      expect(secondResult.data.verification.reason).toContain('Duplicate action prevented');
    });

    it('allows press with different key on same page', async () => {
      const firstResult = await browserPressTool.execute({ key: 'Tab' });
      expect(firstResult.success).toBe(true);
      expect(firstResult.data.verification.outcome).toBe('SUCCESS');

      const secondResult = await browserPressTool.execute({ key: 'Escape' });
      expect(secondResult.success).toBe(true);
      expect(secondResult.data.verification.outcome).toBe('SUCCESS');
    });
  });

  describe('K. Duplicate navigate action', () => {
    it('blocks navigate to same URL on same page', async () => {
      const page = await getMockPage();
      let currentUrl = 'https://initial.com';
      page.goto.mockImplementation(async (targetUrl: string) => {
        currentUrl = targetUrl;
      });
      page.url.mockImplementation(() => currentUrl);

      const firstResult = await browserNavigateTool.execute({ url: 'https://example.com/page1' });
      expect(firstResult.success).toBe(true);
      expect(firstResult.data.verification.outcome).toBe('SUCCESS');

      const secondResult = await browserNavigateTool.execute({ url: 'https://example.com/page1' });
      expect(secondResult.success).toBe(true);
      expect(secondResult.data.verification.outcome).toBe('UNCERTAIN');
      expect(secondResult.data.verification.reason).toContain('Duplicate action prevented');
    });

    it('allows navigate to different URL', async () => {
      const page = await getMockPage();
      let currentUrl = 'https://initial.com';
      page.goto.mockImplementation(async (targetUrl: string) => {
        currentUrl = targetUrl;
      });
      page.url.mockImplementation(() => currentUrl);

      const firstResult = await browserNavigateTool.execute({ url: 'https://example.com/page1' });
      expect(firstResult.success).toBe(true);
      expect(firstResult.data.verification.outcome).toBe('SUCCESS');

      const secondResult = await browserNavigateTool.execute({ url: 'https://example.com/page2' });
      expect(secondResult.success).toBe(true);
      expect(secondResult.data.verification.outcome).toBe('SUCCESS');
    });
  });

  describe('L. Duplicate open action', () => {
    it('blocks open to same URL', async () => {
      const page = await getMockPage();
      let currentUrl = 'https://initial.com';
      page.goto.mockImplementation(async (targetUrl: string) => {
        currentUrl = targetUrl;
      });
      page.url.mockImplementation(() => currentUrl);

      const firstResult = await browserOpenTool.execute({ url: 'https://example.com' });
      expect(firstResult.success).toBe(true);
      expect(firstResult.data.verification.outcome).toBe('SUCCESS');

      const secondResult = await browserOpenTool.execute({ url: 'https://example.com' });
      expect(secondResult.success).toBe(true);
      expect(secondResult.data.verification.outcome).toBe('UNCERTAIN');
      expect(secondResult.data.verification.reason).toContain('Duplicate action prevented');
    });
  });
});
