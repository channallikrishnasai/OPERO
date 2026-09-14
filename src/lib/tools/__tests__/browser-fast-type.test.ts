import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('playwright-core', () => {
  const mockLocatorInner = {
    click: vi.fn().mockResolvedValue(undefined),
    fill: vi.fn().mockResolvedValue(undefined),
    clear: vi.fn().mockResolvedValue(undefined),
    type: vi.fn().mockResolvedValue(undefined),
    press: vi.fn().mockResolvedValue(undefined),
    count: vi.fn().mockResolvedValue(1),
    first: vi.fn(),
    getAttribute: vi.fn().mockResolvedValue(null),
  };
  mockLocatorInner.first.mockReturnValue(mockLocatorInner);

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
    waitForTimeout: vi.fn().mockResolvedValue(undefined),
    getByRole: vi.fn().mockReturnValue(mockLocatorInner),
    getByLabel: vi.fn().mockReturnValue({ count: vi.fn().mockResolvedValue(0) }),
    getByText: vi.fn().mockReturnValue({ count: vi.fn().mockResolvedValue(0) }),
    getByPlaceholder: vi.fn().mockReturnValue({ count: vi.fn().mockResolvedValue(0) }),
    getByAltText: vi.fn().mockReturnValue({ count: vi.fn().mockResolvedValue(0) }),
    getByTitle: vi.fn().mockReturnValue({ count: vi.fn().mockResolvedValue(0) }),
    locator: vi.fn().mockReturnValue(mockLocatorInner),
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
    __mock: { mockPage, mockContext, mockBrowser, mockLocatorInner },
  };
});

import { browserTypeTool } from '../implementations';
import session from '@/lib/browser/session';

async function getMockPage() {
  const pw = await import('playwright-core') as unknown as {
    __mock: {
      mockPage: {
        evaluate: ReturnType<typeof vi.fn>;
        url: ReturnType<typeof vi.fn>;
        title: ReturnType<typeof vi.fn>;
        goto: ReturnType<typeof vi.fn>;
        keyboard: { press: ReturnType<typeof vi.fn> };
        waitForTimeout: ReturnType<typeof vi.fn>;
        getByRole: ReturnType<typeof vi.fn>;
        locator: ReturnType<typeof vi.fn>;
      };
      mockLocatorInner: {
        click: ReturnType<typeof vi.fn>;
        fill: ReturnType<typeof vi.fn>;
        clear: ReturnType<typeof vi.fn>;
        type: ReturnType<typeof vi.fn>;
        press: ReturnType<typeof vi.fn>;
        first: ReturnType<typeof vi.fn>;
        count: ReturnType<typeof vi.fn>;
        getAttribute: ReturnType<typeof vi.fn>;
      };
    };
  };
  return { page: pw.__mock.mockPage, locator: pw.__mock.mockLocatorInner };
}

function makeEvalMock() {
  let bodyCallCount = 0;
  return async (fn: unknown, _arg?: unknown) => {
    if (typeof fn !== 'function') return 'content';
    const fnStr = fn.toString();
    if (fnStr.includes('getVisibleText') || fnStr.includes('checkCaptcha')) {
      return { handoff: false };
    }
    if (fnStr.includes('scrollX')) return { x: 0, y: 0 };
    if (fnStr.includes('cloneNode') || fnStr.includes('innerText')) {
      bodyCallCount++;
      return bodyCallCount % 2 === 1 ? 'Before content' : 'After changed content';
    }
    if (fnStr.includes('querySelector') && fnStr.includes('value')) return 'typed text here';
    if (fnStr.includes('contenteditable')) return false;
    if (fnStr.includes('activeElement')) return { tag: 'input', selector: 'input#q' };
    return 'content';
  };
}

describe('Fast Text Input', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    session.resetLedger();
    const { page, locator } = await getMockPage();
    page.url.mockReturnValue('https://example.com');
    page.evaluate.mockImplementation(makeEvalMock());
    locator.fill.mockResolvedValue(undefined);
    locator.type.mockResolvedValue(undefined);
    locator.press.mockResolvedValue(undefined);
    locator.getAttribute.mockResolvedValue(null);
    page.keyboard.press.mockResolvedValue(undefined);
  });

  describe('A. Short text — existing typing path', () => {
    it('uses locator.type for text shorter than 10 chars', async () => {
      const { locator } = await getMockPage();
      const result = await browserTypeTool.execute({ target: 'Search', text: 'hello' });
      expect(result.success).toBe(true);
      expect(locator.type).toHaveBeenCalledWith('hello', { delay: 30 });
    });

    it('uses locator.type for exactly 9 chars', async () => {
      const { locator } = await getMockPage();
      const result = await browserTypeTool.execute({ target: 'Search', text: '123456789' });
      expect(result.success).toBe(true);
      expect(locator.type).toHaveBeenCalledWith('123456789', { delay: 30 });
    });
  });

  describe('B. Long text — fast path', () => {
    it('uses fill for regular inputs when available', async () => {
      const { locator } = await getMockPage();
      const longText = 'This is a longer text that should use the fast path';
      const result = await browserTypeTool.execute({ target: 'Search', text: longText });
      expect(result.success).toBe(true);
      expect(locator.fill).toHaveBeenCalledWith(longText, { timeout: 5000 });
      expect(locator.type).not.toHaveBeenCalled();
    });

    it('target receives the complete text', async () => {
      const { locator } = await getMockPage();
      const longText = 'Complete text verification for fast input path';
      const result = await browserTypeTool.execute({ target: 'Input', text: longText });
      expect(result.success).toBe(true);
      expect(locator.fill).toHaveBeenCalledWith(longText, { timeout: 5000 });
    });

    it('uses locator.type with short delay when fill fails and clipboard fails', async () => {
      const { page, locator } = await getMockPage();
      locator.fill.mockRejectedValue(new Error('fill not supported'));
      page.evaluate.mockImplementation(async (fn: unknown) => {
        if (typeof fn !== 'function') return 'content';
        const fnStr = fn.toString();
        if (fnStr.includes('getVisibleText') || fnStr.includes('checkCaptcha')) return { handoff: false };
        if (fnStr.includes('scrollX')) return { x: 0, y: 0 };
        if (fnStr.includes('cloneNode') || fnStr.includes('innerText')) return 'content';
        if (fnStr.includes('querySelector') && fnStr.includes('value')) return '';
        if (fnStr.includes('contenteditable')) return false;
        if (fnStr.includes('activeElement')) return { tag: null, selector: null };
        if (fnStr.includes('navigator.clipboard')) return false;
        return 'content';
      });

      const longText = 'text that will trigger fallback typing path';
      const result = await browserTypeTool.execute({ target: 'Search', text: longText });
      expect(result.success).toBe(true);
      expect(locator.type).toHaveBeenCalledWith(longText, { delay: 5 });
    });
  });

  describe('C. Contenteditable input', () => {
    it('uses Ctrl+A and clipboard paste for contenteditable elements', async () => {
      const { page, locator } = await getMockPage();
      locator.getAttribute.mockResolvedValue('true');
      page.evaluate.mockImplementation(async (fn: unknown) => {
        if (typeof fn !== 'function') return 'content';
        const fnStr = fn.toString();
        if (fnStr.includes('getVisibleText') || fnStr.includes('checkCaptcha')) return { handoff: false };
        if (fnStr.includes('scrollX')) return { x: 0, y: 0 };
        if (fnStr.includes('cloneNode') || fnStr.includes('innerText')) return 'content';
        if (fnStr.includes('querySelector') && fnStr.includes('value')) return '';
        if (fnStr.includes('activeElement')) return { tag: 'div', selector: 'div.editor' };
        if (fnStr.includes('navigator.clipboard')) return true;
        return 'content';
      });

      const longText = 'Contenteditable text for fast clipboard paste';
      const result = await browserTypeTool.execute({ target: 'Editor', text: longText });
      expect(result.success).toBe(true);
      expect(locator.getAttribute).toHaveBeenCalledWith('contenteditable');
      expect(locator.press).toHaveBeenCalledWith('Control+A');
      expect(page.keyboard.press).toHaveBeenCalledWith('Control+V');
      expect(locator.type).not.toHaveBeenCalled();
    });
  });

  describe('D. Fast-path failure — fallback executes', () => {
    it('falls back to typing when fill throws and clipboard write fails', async () => {
      const { page, locator } = await getMockPage();
      locator.fill.mockRejectedValue(new Error('Not supported'));
      page.evaluate.mockImplementation(async (fn: unknown) => {
        if (typeof fn !== 'function') return 'content';
        const fnStr = fn.toString();
        if (fnStr.includes('getVisibleText') || fnStr.includes('checkCaptcha')) return { handoff: false };
        if (fnStr.includes('scrollX')) return { x: 0, y: 0 };
        if (fnStr.includes('cloneNode') || fnStr.includes('innerText')) return 'content';
        if (fnStr.includes('querySelector') && fnStr.includes('value')) return '';
        if (fnStr.includes('contenteditable')) return false;
        if (fnStr.includes('activeElement')) return { tag: null, selector: null };
        if (fnStr.includes('navigator.clipboard')) return false;
        return 'content';
      });

      const longText = 'fallback typing path when fast methods fail';
      const result = await browserTypeTool.execute({ target: 'Search', text: longText });
      expect(result.success).toBe(true);
      expect(locator.type).toHaveBeenCalledWith(longText, { delay: 5 });
    });

    it('returns correct ToolResult even with fallback', async () => {
      const { page, locator } = await getMockPage();
      locator.fill.mockRejectedValue(new Error('fail'));
      page.evaluate.mockImplementation(async (fn: unknown) => {
        if (typeof fn !== 'function') return 'content';
        const fnStr = fn.toString();
        if (fnStr.includes('getVisibleText') || fnStr.includes('checkCaptcha')) return { handoff: false };
        if (fnStr.includes('scrollX')) return { x: 0, y: 0 };
        if (fnStr.includes('cloneNode') || fnStr.includes('innerText')) return 'content';
        if (fnStr.includes('querySelector') && fnStr.includes('value')) return '';
        if (fnStr.includes('contenteditable')) return false;
        if (fnStr.includes('activeElement')) return { tag: null, selector: null };
        if (fnStr.includes('navigator.clipboard')) return false;
        return 'content';
      });

      const result = await browserTypeTool.execute({ target: 'Search', text: 'long text that triggers fallback path' });
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('verification');
      expect(result.data.verification).toHaveProperty('outcome');
    });
  });

  describe('E. Empty text', () => {
    it('handles empty string correctly', async () => {
      const { locator } = await getMockPage();
      const result = await browserTypeTool.execute({ target: 'Search', text: '' });
      expect(result.success).toBe(true);
      expect(locator.clear).toHaveBeenCalled();
    });
  });

  describe('F. Existing verification — SUCCESS / FAILED / UNCERTAIN', () => {
    it('returns SUCCESS when body content changes', async () => {
      const { page } = await getMockPage();
      let bodyCount = 0;
      page.evaluate.mockImplementation(async (fn: unknown) => {
        if (typeof fn !== 'function') return 'content';
        const fnStr = fn.toString();
        if (fnStr.includes('getVisibleText') || fnStr.includes('checkCaptcha')) return { handoff: false };
        if (fnStr.includes('scrollX')) return { x: 0, y: 0 };
        if (fnStr.includes('cloneNode') || fnStr.includes('innerText')) {
          bodyCount++;
          return bodyCount <= 1 ? 'Before content' : 'After changed content';
        }
        if (fnStr.includes('querySelector') && fnStr.includes('value')) return 'typed value';
        if (fnStr.includes('contenteditable')) return false;
        if (fnStr.includes('activeElement')) return { tag: 'input', selector: 'input#q' };
        return 'content';
      });

      const result = await browserTypeTool.execute({ target: 'Search', text: 'hello' });
      expect(result.success).toBe(true);
      expect(result.data.verification.outcome).toBe('SUCCESS');
    });

    it('returns UNCERTAIN when value cannot be confirmed', async () => {
      const { page } = await getMockPage();
      page.evaluate.mockImplementation(async (fn: unknown) => {
        if (typeof fn !== 'function') return 'content';
        const fnStr = fn.toString();
        if (fnStr.includes('getVisibleText') || fnStr.includes('checkCaptcha')) return { handoff: false };
        if (fnStr.includes('scrollX')) return { x: 0, y: 0 };
        if (fnStr.includes('cloneNode') || fnStr.includes('innerText')) return 'same content';
        if (fnStr.includes('querySelector') && fnStr.includes('value')) return '';
        if (fnStr.includes('contenteditable')) return false;
        if (fnStr.includes('activeElement')) return { tag: null, selector: null };
        return 'content';
      });

      const result = await browserTypeTool.execute({ target: 'Search', text: 'test' });
      expect(result.success).toBe(true);
      expect(result.data.verification.outcome).toBe('UNCERTAIN');
    });
  });

  describe('G. Action Ledger — fast typing does not bypass ledger', () => {
    it('successful type creates ledger identity', async () => {
      const firstResult = await browserTypeTool.execute({ target: 'Search', text: 'hello world test' });
      expect(firstResult.success).toBe(true);
      expect(firstResult.data.verification.outcome).toBe('SUCCESS');

      const secondResult = await browserTypeTool.execute({ target: 'Search', text: 'hello world test' });
      expect(secondResult.success).toBe(true);
      expect(secondResult.data.verification.outcome).toBe('UNCERTAIN');
      expect(secondResult.data.verification.reason).toContain('Duplicate action prevented');
    });

    it('fast-typed text is still blocked by ledger on duplicate', async () => {
      const longText = 'This is a long text that triggers the fast clipboard path';
      const firstResult = await browserTypeTool.execute({ target: 'Search', text: longText });
      expect(firstResult.success).toBe(true);
      expect(firstResult.data.verification.outcome).toBe('SUCCESS');

      const secondResult = await browserTypeTool.execute({ target: 'Search', text: longText });
      expect(secondResult.success).toBe(true);
      expect(secondResult.data.verification.outcome).toBe('UNCERTAIN');
      expect(secondResult.data.verification.reason).toContain('Duplicate');
    });
  });

  describe('H. Intermediate fallback — fill fails, clipboard succeeds', () => {
    it('uses clipboard paste when fill throws and writeText succeeds, skipping type()', async () => {
      const { page, locator } = await getMockPage();
      locator.fill.mockRejectedValue(new Error('fill not supported'));
      locator.getAttribute.mockResolvedValue(null);
      page.evaluate.mockImplementation(async (fn: unknown) => {
        if (typeof fn !== 'function') return 'content';
        const fnStr = fn.toString();
        if (fnStr.includes('getVisibleText') || fnStr.includes('checkCaptcha')) return { handoff: false };
        if (fnStr.includes('scrollX')) return { x: 0, y: 0 };
        if (fnStr.includes('cloneNode') || fnStr.includes('innerText')) return 'content';
        if (fnStr.includes('querySelector') && fnStr.includes('value')) return '';
        if (fnStr.includes('activeElement')) return { tag: null, selector: null };
        if (fnStr.includes('navigator.clipboard')) return true;
        return 'content';
      });

      const longText = 'text that triggers intermediate fallback';
      const result = await browserTypeTool.execute({ target: 'Search', text: longText });
      expect(result.success).toBe(true);
      expect(page.keyboard.press).toHaveBeenCalledWith('Control+V');
      expect(locator.type).not.toHaveBeenCalled();
    });

    it('returns expected verification outcome after clipboard fallback', async () => {
      const { page, locator } = await getMockPage();
      locator.fill.mockRejectedValue(new Error('fill not supported'));
      locator.getAttribute.mockResolvedValue(null);
      let bodyCount = 0;
      page.evaluate.mockImplementation(async (fn: unknown) => {
        if (typeof fn !== 'function') return 'content';
        const fnStr = fn.toString();
        if (fnStr.includes('getVisibleText') || fnStr.includes('checkCaptcha')) return { handoff: false };
        if (fnStr.includes('scrollX')) return { x: 0, y: 0 };
        if (fnStr.includes('cloneNode') || fnStr.includes('innerText')) {
          bodyCount++;
          return bodyCount <= 1 ? 'Before content' : 'After changed content';
        }
        if (fnStr.includes('querySelector') && fnStr.includes('value')) return '';
        if (fnStr.includes('activeElement')) return { tag: null, selector: null };
        if (fnStr.includes('navigator.clipboard')) return true;
        return 'content';
      });

      const longText = 'clipboard fallback with verification';
      const result = await browserTypeTool.execute({ target: 'Search', text: longText });
      expect(result.success).toBe(true);
      expect(result.data.verification.outcome).toBe('SUCCESS');
    });
  });

  describe('I. Contenteditable target-specific detection', () => {
    it('detects target as contenteditable even when a regular input exists earlier in DOM', async () => {
      const { page, locator } = await getMockPage();
      locator.getAttribute.mockResolvedValue('true');
      page.evaluate.mockImplementation(async (fn: unknown) => {
        if (typeof fn !== 'function') return 'content';
        const fnStr = fn.toString();
        if (fnStr.includes('getVisibleText') || fnStr.includes('checkCaptcha')) return { handoff: false };
        if (fnStr.includes('scrollX')) return { x: 0, y: 0 };
        if (fnStr.includes('cloneNode') || fnStr.includes('innerText')) return 'content';
        if (fnStr.includes('querySelector') && fnStr.includes('value')) return '';
        if (fnStr.includes('activeElement')) return { tag: 'div', selector: 'div.editor' };
        if (fnStr.includes('navigator.clipboard')) return true;
        return 'content';
      });

      const longText = 'target-specific contenteditable text';
      const result = await browserTypeTool.execute({ target: 'Editor', text: longText });
      expect(result.success).toBe(true);
      expect(locator.getAttribute).toHaveBeenCalledWith('contenteditable');
      expect(locator.press).toHaveBeenCalledWith('Control+A');
      expect(page.keyboard.press).toHaveBeenCalledWith('Control+V');
      expect(locator.fill).not.toHaveBeenCalled();
      expect(locator.type).not.toHaveBeenCalled();
    });

    it('takes fill path when target is not contenteditable regardless of other page elements', async () => {
      const { page, locator } = await getMockPage();
      locator.getAttribute.mockResolvedValue(null);
      page.evaluate.mockImplementation(async (fn: unknown) => {
        if (typeof fn !== 'function') return 'content';
        const fnStr = fn.toString();
        if (fnStr.includes('getVisibleText') || fnStr.includes('checkCaptcha')) return { handoff: false };
        if (fnStr.includes('scrollX')) return { x: 0, y: 0 };
        if (fnStr.includes('cloneNode') || fnStr.includes('innerText')) return 'content';
        if (fnStr.includes('querySelector') && fnStr.includes('value')) return '';
        if (fnStr.includes('activeElement')) return { tag: null, selector: null };
        return 'content';
      });

      const longText = 'regular input gets fill path';
      const result = await browserTypeTool.execute({ target: 'Search', text: longText });
      expect(result.success).toBe(true);
      expect(locator.getAttribute).toHaveBeenCalledWith('contenteditable');
      expect(locator.fill).toHaveBeenCalledWith(longText, { timeout: 5000 });
      expect(locator.press).not.toHaveBeenCalled();
    });
  });

  describe('J. execCommand fallback — clipboard API unavailable', () => {
    it('uses execCommand fallback then Ctrl+V when navigator.clipboard throws', async () => {
      const { page, locator } = await getMockPage();
      locator.fill.mockRejectedValue(new Error('fill not supported'));
      locator.getAttribute.mockResolvedValue(null);
      page.evaluate.mockImplementation(async (fn: unknown) => {
        if (typeof fn !== 'function') return 'content';
        const fnStr = fn.toString();
        if (fnStr.includes('getVisibleText') || fnStr.includes('checkCaptcha')) return { handoff: false };
        if (fnStr.includes('scrollX')) return { x: 0, y: 0 };
        if (fnStr.includes('cloneNode') || fnStr.includes('innerText')) return 'content';
        if (fnStr.includes('querySelector') && fnStr.includes('value')) return '';
        if (fnStr.includes('activeElement')) return { tag: null, selector: null };
        if (fnStr.includes('navigator.clipboard') && fnStr.includes('execCommand')) {
          return true;
        }
        return 'content';
      });

      const longText = 'text using execCommand fallback';
      const result = await browserTypeTool.execute({ target: 'Search', text: longText });
      expect(result.success).toBe(true);
      expect(page.keyboard.press).toHaveBeenCalledWith('Control+V');
      expect(locator.type).not.toHaveBeenCalled();
    });

    it('falls back to type() when both clipboard API and execCommand fail', async () => {
      const { page, locator } = await getMockPage();
      locator.fill.mockRejectedValue(new Error('fill not supported'));
      locator.getAttribute.mockResolvedValue(null);
      page.evaluate.mockImplementation(async (fn: unknown) => {
        if (typeof fn !== 'function') return 'content';
        const fnStr = fn.toString();
        if (fnStr.includes('getVisibleText') || fnStr.includes('checkCaptcha')) return { handoff: false };
        if (fnStr.includes('scrollX')) return { x: 0, y: 0 };
        if (fnStr.includes('cloneNode') || fnStr.includes('innerText')) return 'content';
        if (fnStr.includes('querySelector') && fnStr.includes('value')) return '';
        if (fnStr.includes('activeElement')) return { tag: null, selector: null };
        if (fnStr.includes('navigator.clipboard') && fnStr.includes('execCommand')) {
          return false;
        }
        return 'content';
      });

      const longText = 'text when all clipboard methods fail';
      const result = await browserTypeTool.execute({ target: 'Search', text: longText });
      expect(result.success).toBe(true);
      expect(locator.type).toHaveBeenCalledWith(longText, { delay: 5 });
    });
  });

  describe('K. Fallback verification coverage', () => {
    it('fill fallback via clipboard produces SUCCESS when body content changes', async () => {
      const { page, locator } = await getMockPage();
      locator.fill.mockRejectedValue(new Error('fill broken'));
      locator.getAttribute.mockResolvedValue(null);
      let bodyCount = 0;
      page.evaluate.mockImplementation(async (fn: unknown) => {
        if (typeof fn !== 'function') return 'content';
        const fnStr = fn.toString();
        if (fnStr.includes('getVisibleText') || fnStr.includes('checkCaptcha')) return { handoff: false };
        if (fnStr.includes('scrollX')) return { x: 0, y: 0 };
        if (fnStr.includes('cloneNode') || fnStr.includes('innerText')) {
          bodyCount++;
          return bodyCount <= 1 ? 'Before' : 'After changed';
        }
        if (fnStr.includes('querySelector') && fnStr.includes('value')) return '';
        if (fnStr.includes('activeElement')) return { tag: null, selector: null };
        if (fnStr.includes('navigator.clipboard')) return true;
        return 'content';
      });

      const longText = 'verification after clipboard fallback';
      const result = await browserTypeTool.execute({ target: 'Search', text: longText });
      expect(result.success).toBe(true);
      expect(result.data.verification.outcome).toBe('SUCCESS');
    });

    it('character-by-character fallback produces SUCCESS when body content changes', async () => {
      const { page, locator } = await getMockPage();
      locator.fill.mockRejectedValue(new Error('fill broken'));
      locator.getAttribute.mockResolvedValue(null);
      let bodyCount = 0;
      page.evaluate.mockImplementation(async (fn: unknown) => {
        if (typeof fn !== 'function') return 'content';
        const fnStr = fn.toString();
        if (fnStr.includes('getVisibleText') || fnStr.includes('checkCaptcha')) return { handoff: false };
        if (fnStr.includes('scrollX')) return { x: 0, y: 0 };
        if (fnStr.includes('cloneNode') || fnStr.includes('innerText')) {
          bodyCount++;
          return bodyCount <= 1 ? 'Before' : 'After changed';
        }
        if (fnStr.includes('querySelector') && fnStr.includes('value')) return '';
        if (fnStr.includes('activeElement')) return { tag: null, selector: null };
        if (fnStr.includes('navigator.clipboard')) {
          throw new Error('clipboard unavailable');
        }
        if (fnStr.includes('execCommand')) return false;
        return 'content';
      });

      const longText = 'verification after type fallback';
      const result = await browserTypeTool.execute({ target: 'Search', text: longText });
      expect(result.success).toBe(true);
      expect(result.data.verification.outcome).toBe('SUCCESS');
    });
  });
});
