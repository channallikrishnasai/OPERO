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
  browserOpenTool,
  browserNavigateTool,
} from '../implementations';
import session from '@/lib/browser/session';

let handoffEvalResult: { handoff: boolean; reason?: string } = { handoff: false };

async function getMockPage() {
  const pw = await import('playwright-core') as unknown as {
    __mock: {
      mockPage: {
        evaluate: ReturnType<typeof vi.fn>;
        url: ReturnType<typeof vi.fn>;
        title: ReturnType<typeof vi.fn>;
        goto: ReturnType<typeof vi.fn>;
        getByRole: ReturnType<typeof vi.fn>;
        locator: ReturnType<typeof vi.fn>;
        keyboard: { press: ReturnType<typeof vi.fn> };
      };
    };
  };
  return pw.__mock.mockPage;
}

function makeEvalWithHandoff() {
  let bodyCallCount = 0;
  return async (fn: unknown, _arg?: unknown) => {
    if (typeof fn !== 'function') return 'content';
    const fnStr = fn.toString();
    if (fnStr.includes('getVisibleText') || fnStr.includes('checkCaptcha')) {
      return handoffEvalResult;
    }
    if (fnStr.includes('scrollX')) return { x: 0, y: 0 };
    if (fnStr.includes('cloneNode') || fnStr.includes('innerText')) {
      bodyCallCount++;
      return bodyCallCount % 2 === 1 ? 'Before content' : 'After changed content';
    }
    if (fnStr.includes('querySelector') && fnStr.includes('value')) return '';
    if (fnStr.includes('activeElement')) return { tag: null, selector: null };
    return 'content';
  };
}

describe('Human Handoff Detection', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    session.resetLedger();
    handoffEvalResult = { handoff: false };
    const page = await getMockPage();
    page.url.mockReturnValue('https://example.com');
    page.evaluate.mockImplementation(makeEvalWithHandoff());
  });

  describe('A. CAPTCHA detection', () => {
    it('detects reCAPTCHA iframe', async () => {
      handoffEvalResult = {
        handoff: true,
        reason: 'CAPTCHA iframe detected (reCAPTCHA/hCaptcha)',
      };

      const result = await browserClickTool.execute({ target: 'Submit' });
      expect(result.success).toBe(true);
      expect(result.data.success).toBe(false);
      expect(result.data.verification.outcome).toBe('UNCERTAIN');
      expect(result.data.verification.reason).toContain('CAPTCHA');
      expect(result.data.verification.reason).toContain('Human action required');
    });

    it('detects hCaptcha widget', async () => {
      handoffEvalResult = {
        handoff: true,
        reason: 'CAPTCHA widget detected',
      };

      const result = await browserClickTool.execute({ target: 'Submit' });
      expect(result.success).toBe(true);
      expect(result.data.success).toBe(false);
      expect(result.data.verification.outcome).toBe('UNCERTAIN');
      expect(result.data.verification.reason).toContain('CAPTCHA');
    });

    it('detects CAPTCHA element', async () => {
      handoffEvalResult = {
        handoff: true,
        reason: 'CAPTCHA element detected',
      };

      const result = await browserClickTool.execute({ target: 'Button' });
      expect(result.success).toBe(true);
      expect(result.data.success).toBe(false);
      expect(result.data.verification.outcome).toBe('UNCERTAIN');
      expect(result.data.verification.reason).toContain('CAPTCHA');
    });
  });

  describe('B. Two-factor / OTP detection', () => {
    it('detects two-factor authentication prompt', async () => {
      handoffEvalResult = {
        handoff: true,
        reason: 'Two-factor authentication prompt detected',
      };

      const result = await browserTypeTool.execute({ target: 'Code', text: '123456' });
      expect(result.success).toBe(true);
      expect(result.data.success).toBe(false);
      expect(result.data.verification.outcome).toBe('UNCERTAIN');
      expect(result.data.verification.reason).toContain('Two-factor');
    });

    it('detects OTP input field', async () => {
      handoffEvalResult = {
        handoff: true,
        reason: 'One-time password / verification code prompt detected',
      };

      const result = await browserTypeTool.execute({ target: 'Code', text: '999999' });
      expect(result.success).toBe(true);
      expect(result.data.success).toBe(false);
      expect(result.data.verification.outcome).toBe('UNCERTAIN');
      expect(result.data.verification.reason).toContain('One-time password');
    });

    it('detects authenticator code prompt', async () => {
      handoffEvalResult = {
        handoff: true,
        reason: 'One-time password / verification code prompt detected',
      };

      const result = await browserPressTool.execute({ key: 'Enter' });
      expect(result.success).toBe(true);
      expect(result.data.success).toBe(false);
      expect(result.data.verification.outcome).toBe('UNCERTAIN');
      expect(result.data.verification.reason).toContain('Human action required');
    });
  });

  describe('C. Login / password detection', () => {
    it('detects login form with password input', async () => {
      handoffEvalResult = {
        handoff: true,
        reason: 'Login/password input detected',
      };

      const result = await browserTypeTool.execute({ target: 'Password', text: 'secret' });
      expect(result.success).toBe(true);
      expect(result.data.success).toBe(false);
      expect(result.data.verification.outcome).toBe('UNCERTAIN');
      expect(result.data.verification.reason).toContain('Login/password');
    });
  });

  describe('D. False positives — should NOT trigger handoff', () => {
    it('ordinary page with no captcha indicators does not trigger', async () => {
      handoffEvalResult = { handoff: false };

      const result = await browserClickTool.execute({ target: 'Button' });
      expect(result.success).toBe(true);
      expect(result.data.verification.outcome).not.toBe('UNCERTAIN');
      expect(result.data.verification.reason).not.toContain('Human action');
    });

    it('page with normal text does not trigger', async () => {
      handoffEvalResult = { handoff: false };

      const result = await browserTypeTool.execute({ target: 'Search', text: 'hello' });
      expect(result.success).toBe(true);
      expect(result.data.verification.reason).not.toContain('Human action');
    });

    it('search page does not trigger', async () => {
      handoffEvalResult = { handoff: false };

      const result = await browserPressTool.execute({ key: 'Enter' });
      expect(result.success).toBe(true);
      expect(result.data.verification.reason).not.toContain('Human action');
    });
  });

  describe('E. Execution protection — action not executed when handoff detected', () => {
    it('click is NOT executed when CAPTCHA detected', async () => {
      const page = await getMockPage();
      handoffEvalResult = {
        handoff: true,
        reason: 'CAPTCHA widget detected',
      };

      await browserClickTool.execute({ target: 'Submit' });

      expect(page.locator).not.toHaveBeenCalled();
    });

    it('type is NOT executed when 2FA detected', async () => {
      const page = await getMockPage();
      handoffEvalResult = {
        handoff: true,
        reason: 'Two-factor authentication prompt detected',
      };

      await browserTypeTool.execute({ target: 'Code', text: '123456' });

      expect(page.locator).not.toHaveBeenCalled();
    });

    it('press is NOT executed when login detected', async () => {
      const page = await getMockPage();
      handoffEvalResult = {
        handoff: true,
        reason: 'Login/password input detected',
      };

      await browserPressTool.execute({ key: 'Enter' });

      expect(page.keyboard.press).not.toHaveBeenCalled();
    });
  });

  describe('F. Ledger interaction — handoff-blocked action does not create SUCCESS entry', () => {
    it('click blocked by handoff does not create a SUCCESS ledger entry', async () => {
      handoffEvalResult = {
        handoff: true,
        reason: 'CAPTCHA widget detected',
      };

      const firstResult = await browserClickTool.execute({ target: 'Submit' });
      expect(firstResult.data.verification.outcome).toBe('UNCERTAIN');

      handoffEvalResult = { handoff: false };
      const secondResult = await browserClickTool.execute({ target: 'Submit' });
      expect(secondResult.data.verification.outcome).not.toBe('UNCERTAIN');
      expect(secondResult.data.verification.reason).not.toContain('Duplicate');
    });

    it('type blocked by handoff allows retry after handoff resolves', async () => {
      handoffEvalResult = {
        handoff: true,
        reason: 'Two-factor authentication prompt detected',
      };

      const firstResult = await browserTypeTool.execute({ target: 'Code', text: '123456' });
      expect(firstResult.data.verification.outcome).toBe('UNCERTAIN');
      expect(firstResult.data.verification.reason).toContain('Human action required');

      handoffEvalResult = { handoff: false };
      const secondResult = await browserTypeTool.execute({ target: 'Code', text: '123456' });
      expect(secondResult.data.verification.outcome).toBe('SUCCESS');
      expect(secondResult.data.verification.reason).not.toContain('Duplicate');
    });

    it('navigate blocked by handoff records UNCERTAIN but allows retry', async () => {
      const page = await getMockPage();
      let currentUrl = 'https://initial.com';
      page.goto.mockImplementation(async (targetUrl: string) => {
        currentUrl = targetUrl;
      });
      page.url.mockImplementation(() => currentUrl);

      handoffEvalResult = {
        handoff: true,
        reason: 'Login/password input detected',
      };

      const firstResult = await browserNavigateTool.execute({ url: 'https://login.com' });
      expect(firstResult.data.verification.outcome).toBe('UNCERTAIN');
      expect(firstResult.data.verification.reason).toContain('Human action required');

      handoffEvalResult = { handoff: false };
      const secondResult = await browserNavigateTool.execute({ url: 'https://other.com' });
      expect(secondResult.data.verification.outcome).not.toBe('UNCERTAIN');
      expect(secondResult.data.verification.reason).not.toContain('Duplicate');
    });
  });

  describe('G. Existing behavior preserved — normal actions work', () => {
    it('click still works on normal pages', async () => {
      handoffEvalResult = { handoff: false };
      const result = await browserClickTool.execute({ target: 'Button' });
      expect(result.success).toBe(true);
    });

    it('type still works on normal pages', async () => {
      handoffEvalResult = { handoff: false };
      const result = await browserTypeTool.execute({ target: 'Search', text: 'test' });
      expect(result.success).toBe(true);
    });

    it('press still works on normal pages', async () => {
      handoffEvalResult = { handoff: false };
      const result = await browserPressTool.execute({ key: 'Enter' });
      expect(result.success).toBe(true);
    });

    it('open still works when no handoff', async () => {
      handoffEvalResult = { handoff: false };
      const result = await browserOpenTool.execute({ url: 'https://example.com' });
      expect(result.success).toBe(true);
    });

    it('navigate still works when no handoff', async () => {
      const page = await getMockPage();
      let currentUrl = 'https://initial.com';
      page.goto.mockImplementation(async (targetUrl: string) => {
        currentUrl = targetUrl;
      });
      page.url.mockImplementation(() => currentUrl);
      handoffEvalResult = { handoff: false };

      const result = await browserNavigateTool.execute({ url: 'https://example.com' });
      expect(result.success).toBe(true);
    });
  });

  describe('H. Handoff reason messaging', () => {
    it('returns actionable message for CAPTCHA', async () => {
      handoffEvalResult = {
        handoff: true,
        reason: 'CAPTCHA widget detected',
      };

      const result = await browserClickTool.execute({ target: 'Submit' });
      expect(result.data.description).toContain('Human action required');
      expect(result.data.description).toContain('manually');
      expect(result.data.description).toContain('ask OPERO to continue');
    });

    it('returns actionable message for 2FA', async () => {
      handoffEvalResult = {
        handoff: true,
        reason: 'Two-factor authentication prompt detected',
      };

      const result = await browserTypeTool.execute({ target: 'Code', text: '123' });
      expect(result.data.description).toContain('Human action required');
      expect(result.data.description).toContain('manually');
    });
  });
});
