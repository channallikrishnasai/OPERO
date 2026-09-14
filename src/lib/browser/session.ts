import type { Browser, BrowserContext, Page } from 'playwright-core';

export interface PageInfo {
  url: string;
  title: string;
  content: string;
}

export interface BrowserError {
  code: string;
  message: string;
}

export type VerificationOutcome = 'SUCCESS' | 'FAILED' | 'UNCERTAIN';

export interface VerificationResult {
  outcome: VerificationOutcome;
  reason: string;
}

export interface PageSnapshot {
  url: string;
  title: string;
  scrollY: number;
  scrollX: number;
  activeElementTag: string | null;
  activeElementSelector: string | null;
  bodyTextHash: number;
}

export interface ActionLedgerEntry {
  toolName: string;
  normalizedInput: string;
  pageUrl: string;
  outcome: VerificationOutcome;
  timestamp: number;
}

export interface HandoffResult {
  handoff: boolean;
  reason?: string;
}

class BrowserSession {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private launching = false;
  private actionLedger = new Map<string, ActionLedgerEntry>();

  private normalizeInput(toolName: string, input?: string): string {
    if (!input) return '';
    const trimmed = input.trim();
    switch (toolName) {
      case 'click':
        return trimmed.toLowerCase();
      case 'type': {
        const parts = trimmed.split('::');
        return parts.length === 2
          ? `${parts[0].toLowerCase()}::${parts[1]}`
          : trimmed.toLowerCase();
      }
      case 'press':
        return trimmed.toLowerCase();
      case 'open':
      case 'navigate':
        return this.normalizeUrl(trimmed);
      default:
        return trimmed;
    }
  }

  private normalizeUrl(raw: string): string {
    try {
      const u = new URL(raw.startsWith('http') ? raw : `https://${raw}`);
      return `${u.protocol}//${u.hostname}${u.pathname}`.replace(/\/+$/, '');
    } catch {
      return raw.toLowerCase().replace(/\/+$/, '');
    }
  }

  private ledgerKey(toolName: string, normalizedInput: string, pageUrl: string): string {
    return `${toolName}::${normalizedInput}::${pageUrl}`;
  }

  private isDuplicate(toolName: string, normalizedInput: string, currentUrl: string): boolean {
    const key = this.ledgerKey(toolName, normalizedInput, currentUrl);
    const entry = this.actionLedger.get(key);
    if (!entry) return false;
    return entry.outcome === 'SUCCESS';
  }

  private recordAction(toolName: string, normalizedInput: string, currentUrl: string, outcome: VerificationOutcome): void {
    const key = this.ledgerKey(toolName, normalizedInput, currentUrl);
    this.actionLedger.set(key, {
      toolName,
      normalizedInput,
      pageUrl: currentUrl,
      outcome,
      timestamp: Date.now(),
    });
  }

  private clearLedgerForUrl(url: string): void {
    const normalized = this.normalizeUrl(url);
    for (const [key, entry] of this.actionLedger) {
      if (entry.pageUrl === normalized) {
        this.actionLedger.delete(key);
      }
    }
  }

  async ensureBrowser(): Promise<Browser> {
    if (this.browser?.isConnected()) return this.browser;
    if (this.launching) {
      while (this.launching) {
        await new Promise((r) => setTimeout(r, 100));
      }
      if (this.browser?.isConnected()) return this.browser;
    }

    this.launching = true;
    try {
      const pw = await import('playwright-core');
      this.browser = await pw.chromium.launch({
        headless: false,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu',
        ],
      });

      this.context = await this.browser.newContext({
        userAgent:
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1280, height: 720 },
      });

      this.page = await this.context.newPage();
      return this.browser;
    } finally {
      this.launching = false;
    }
  }

  async getPage(): Promise<Page> {
    if (this.page && !this.page.isClosed()) return this.page;

    await this.ensureBrowser();
    if (!this.context) throw new BrowserSessionError('CONTEXT_NOT_AVAILABLE', 'Browser context not available');
    this.page = await this.context.newPage();
    return this.page;
  }

  async openUrl(url: Promise<string> | string): Promise<{ url: string; title: string; verification: VerificationResult }> {
    const resolvedUrl = await url;
    const normalized = resolvedUrl.startsWith('http') ? resolvedUrl : `https://${resolvedUrl}`;
    const page = await this.getPage();
    const oldUrl = this.normalizeUrl(page.url());
    const normalizedInput = this.normalizeInput('open', resolvedUrl);

    if (this.isDuplicate('open', normalizedInput, page.url())) {
      return {
        url: page.url(),
        title: await page.title(),
        verification: { outcome: 'UNCERTAIN', reason: `Duplicate action prevented: this action was already attempted on this page.` },
      };
    }

    const before = await this.captureSnapshot();
    await page.goto(normalized, { waitUntil: 'domcontentloaded', timeout: 30000 });

    const handoff = await this.detectHumanHandoff(page);
    if (handoff.handoff) {
      this.recordAction('open', normalizedInput, page.url(), 'UNCERTAIN');
      return {
        url: page.url(),
        title: await page.title(),
        verification: { outcome: 'UNCERTAIN', reason: `Human action required: ${handoff.reason}. Please complete it manually and ask OPERO to continue.` },
      };
    }

    const verification = await this.verifyAction(before, 'navigate');
    const newUrl = this.normalizeUrl(page.url());
    if (verification.outcome === 'SUCCESS' && oldUrl !== newUrl) {
      this.clearLedgerForUrl(oldUrl);
    }
    this.recordAction('open', normalizedInput, page.url(), verification.outcome);
    return { url: page.url(), title: await page.title(), verification };
  }

  async navigateTo(url: Promise<string> | string): Promise<{ url: string; title: string; verification: VerificationResult }> {
    const resolvedUrl = await url;
    const normalized = resolvedUrl.startsWith('http') ? resolvedUrl : `https://${resolvedUrl}`;
    const page = await this.getPage();
    const oldUrl = this.normalizeUrl(page.url());
    const normalizedInput = this.normalizeInput('navigate', resolvedUrl);

    if (this.isDuplicate('navigate', normalizedInput, page.url())) {
      return {
        url: page.url(),
        title: await page.title(),
        verification: { outcome: 'UNCERTAIN', reason: `Duplicate action prevented: this action was already attempted on this page.` },
      };
    }

    const before = await this.captureSnapshot();
    await page.goto(normalized, { waitUntil: 'domcontentloaded', timeout: 30000 });

    const handoff = await this.detectHumanHandoff(page);
    if (handoff.handoff) {
      this.recordAction('navigate', normalizedInput, page.url(), 'UNCERTAIN');
      return {
        url: page.url(),
        title: await page.title(),
        verification: { outcome: 'UNCERTAIN', reason: `Human action required: ${handoff.reason}. Please complete it manually and ask OPERO to continue.` },
      };
    }

    const verification = await this.verifyAction(before, 'navigate');
    const newUrl = this.normalizeUrl(page.url());
    if (verification.outcome === 'SUCCESS' && oldUrl !== newUrl) {
      this.clearLedgerForUrl(oldUrl);
    }
    this.recordAction('navigate', normalizedInput, page.url(), verification.outcome);
    return { url: page.url(), title: await page.title(), verification };
  }

  async getPageInfo(): Promise<PageInfo> {
    const page = await this.getPage();
    const url = page.url();
    const title = await page.title();

    let content = '';
    try {
      content = await page.evaluate(() => {
        const main = document.querySelector('main') || document.querySelector('[role="main"]') || document.body;
        const clone = main.cloneNode(true) as HTMLElement;
        clone.querySelectorAll('script, style, noscript, svg').forEach((el) => el.remove());
        return clone.innerText?.trim().slice(0, 8000) ?? '';
      });
    } catch {
      content = '(unable to extract page content)';
    }

    return { url, title, content };
  }

  async clickElement(target: string): Promise<{ success: boolean; description: string; verification: VerificationResult }> {
    const page = await this.getPage();
    const currentUrl = page.url();
    const normalizedInput = this.normalizeInput('click', target);

    if (this.isDuplicate('click', normalizedInput, currentUrl)) {
      return {
        success: true,
        description: `Duplicate action prevented: click "${target}" was already attempted on this page.`,
        verification: { outcome: 'UNCERTAIN', reason: `Duplicate action prevented: this action was already attempted on this page.` },
      };
    }

    const handoff = await this.detectHumanHandoff(page);
    if (handoff.handoff) {
      return {
        success: false,
        description: `Human action required: ${handoff.reason}. Please complete it manually and ask OPERO to continue.`,
        verification: { outcome: 'UNCERTAIN', reason: `Human action required: ${handoff.reason}. Please complete it manually and ask OPERO to continue.` },
      };
    }

    const before = await this.captureSnapshot();
    const locator = await this.findLocator(page, target);
    const count = await locator.count();
    if (count === 0) {
      throw new BrowserSessionError('ELEMENT_NOT_FOUND', `No element found matching "${target}"`);
    }
    await locator.first().click({ timeout: 10000 });
    const verification = await this.verifyAction(before, 'click');
    this.recordAction('click', normalizedInput, currentUrl, verification.outcome);
    return { success: verification.outcome !== 'FAILED', description: `Clicked element matching "${target}"`, verification };
  }

  async typeText(target: string, text: string): Promise<{ success: boolean; description: string; verification: VerificationResult }> {
    const page = await this.getPage();
    const currentUrl = page.url();
    const normalizedInput = this.normalizeInput('type', `${target}::${text}`);

    if (this.isDuplicate('type', normalizedInput, currentUrl)) {
      return {
        success: true,
        description: `Duplicate action prevented: type "${text}" into "${target}" was already attempted on this page.`,
        verification: { outcome: 'UNCERTAIN', reason: `Duplicate action prevented: this action was already attempted on this page.` },
      };
    }

    const handoff = await this.detectHumanHandoff(page);
    if (handoff.handoff) {
      return {
        success: false,
        description: `Human action required: ${handoff.reason}. Please complete it manually and ask OPERO to continue.`,
        verification: { outcome: 'UNCERTAIN', reason: `Human action required: ${handoff.reason}. Please complete it manually and ask OPERO to continue.` },
      };
    }

    const before = await this.captureSnapshot();
    const locator = await this.findLocator(page, target);
    const count = await locator.count();
    if (count === 0) {
      throw new BrowserSessionError('ELEMENT_NOT_FOUND', `No element found matching "${target}"`);
    }
    await locator.first().click({ timeout: 10000 });
    await locator.first().clear();

    if (text.length >= 10) {
      await this.fastTypeText(locator.first(), page, text);
    } else {
      await locator.first().type(text, { delay: 30 });
    }

    const verification = await this.verifyAction(before, 'type', target);
    this.recordAction('type', normalizedInput, currentUrl, verification.outcome);
    return { success: verification.outcome !== 'FAILED', description: `Typed "${text}" into "${target}"`, verification };
  }

  private async fastTypeText(
    target: ReturnType<ReturnType<Page['locator']>['first']>,
    page: Page,
    text: string,
  ): Promise<void> {
    const attr = await target.getAttribute('contenteditable').catch(() => null);
    if (attr === 'true') {
      await target.press('Control+A');
      await this.clipboardPaste(page, text);
      return;
    }

    try {
      // Timeout controls Playwright's actionability wait (element visible/stable/enabled),
      // not a hard deadline on the fill operation itself.
      await target.fill(text, { timeout: 5000 });
      return;
    } catch {
      // fill() doesn't fire input events on some React-controlled inputs
    }

    const clipboardOk = await this.clipboardPaste(page, text);
    if (!clipboardOk) {
      await target.type(text, { delay: 5 });
    }
  }

  private async clipboardPaste(page: Page, text: string): Promise<boolean> {
    try {
      const written = await page.evaluate(async (t) => {
        try {
          await navigator.clipboard.writeText(t);
          return true;
        } catch {
          const ta = document.createElement('textarea');
          ta.value = t;
          ta.style.position = 'fixed';
          ta.style.opacity = '0';
          document.body.appendChild(ta);
          ta.select();
          const ok = document.execCommand('copy');
          document.body.removeChild(ta);
          return ok;
        }
      }, text);
      if (!written) return false;

      await page.keyboard.press('Control+V');
      await page.waitForTimeout(50);
      return true;
    } catch {
      return false;
    }
  }

  async pressKey(key: string): Promise<{ success: boolean; description: string; verification: VerificationResult }> {
    const page = await this.getPage();
    const currentUrl = page.url();
    const normalizedInput = this.normalizeInput('press', key);

    if (this.isDuplicate('press', normalizedInput, currentUrl)) {
      return {
        success: true,
        description: `Duplicate action prevented: press "${key}" was already attempted on this page.`,
        verification: { outcome: 'UNCERTAIN', reason: `Duplicate action prevented: this action was already attempted on this page.` },
      };
    }

    const handoff = await this.detectHumanHandoff(page);
    if (handoff.handoff) {
      return {
        success: false,
        description: `Human action required: ${handoff.reason}. Please complete it manually and ask OPERO to continue.`,
        verification: { outcome: 'UNCERTAIN', reason: `Human action required: ${handoff.reason}. Please complete it manually and ask OPERO to continue.` },
      };
    }

    const before = await this.captureSnapshot();
    await page.keyboard.press(key);
    const verification = await this.verifyAction(before, 'press', key);
    this.recordAction('press', normalizedInput, currentUrl, verification.outcome);
    return { success: verification.outcome !== 'FAILED', description: `Pressed key "${key}"`, verification };
  }

  async scrollPage(direction: 'up' | 'down' | 'left' | 'right', amount?: number): Promise<{ success: boolean; description: string; verification: VerificationResult }> {
    const page = await this.getPage();
    const before = await this.captureSnapshot();
    const delta = amount ?? 500;
    const deltas: Record<string, { x: number; y: number }> = {
      up: { x: 0, y: -delta },
      down: { x: 0, y: delta },
      left: { x: -delta, y: 0 },
      right: { x: delta, y: 0 },
    };
    const d = deltas[direction] ?? deltas.down;
    await page.mouse.wheel(d.x, d.y);
    const verification = await this.verifyAction(before, 'scroll');
    return { success: verification.outcome !== 'FAILED', description: `Scrolled ${direction}${amount ? ` ${amount}px` : ''}`, verification };
  }

  async goBack(): Promise<{ url: string; title: string; verification: VerificationResult }> {
    const page = await this.getPage();
    const before = await this.captureSnapshot();
    await page.goBack({ waitUntil: 'domcontentloaded', timeout: 15000 });
    const verification = await this.verifyAction(before, 'back');
    return { url: page.url(), title: await page.title(), verification };
  }

  async takeScreenshot(): Promise<{ path: string; description: string }> {
    const page = await this.getPage();
    const filename = `screenshot-${Date.now()}.png`;
    const path = `/tmp/${filename}`;
    await page.screenshot({ path, fullPage: false });
    return { path, description: `Screenshot saved to ${path}` };
  }

  async captureSnapshot(): Promise<PageSnapshot> {
    const page = await this.getPage();
    const url = page.url();
    const title = await page.title();
    const scroll = await page.evaluate(() => ({ x: window.scrollX, y: window.scrollY }));
    const active = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return { tag: null, selector: null };
      const tag = el.tagName.toLowerCase();
      const id = el.id ? `#${el.id}` : '';
      const cls = el.className && typeof el.className === 'string'
        ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.')
        : '';
      return { tag, selector: tag + id + cls };
    });
    const bodyTextHash = await page.evaluate(() => {
      const text = document.body?.innerText ?? '';
      let hash = 0;
      for (let i = 0; i < Math.min(text.length, 3000); i++) {
        hash = ((hash << 5) - hash + text.charCodeAt(i)) | 0;
      }
      return hash;
    });
    return {
      url,
      title,
      scrollY: scroll.y,
      scrollX: scroll.x,
      activeElementTag: active.tag,
      activeElementSelector: active.selector,
      bodyTextHash,
    };
  }

  async detectHumanHandoff(page?: Page): Promise<HandoffResult> {
    const targetPage = page ?? await this.getPage();
    const url = targetPage.url();

    const urlHandoff = this.checkUrlForHandoff(url);
    if (urlHandoff) return urlHandoff;

    const domHandoff = await this.checkDomForHandoff(targetPage);
    if (domHandoff) return domHandoff;

    return { handoff: false };
  }

  private checkUrlForHandoff(url: string): HandoffResult | null {
    const lower = url.toLowerCase();
    if (/(?:login|signin|sign-in|auth)(?:\/|$|\?)/i.test(lower) && !lower.includes('blog')) {
      return null;
    }
    if (/\b(captcha|challenge|verify|recaptcha|hcaptcha)\b/i.test(lower)) {
      return { handoff: true, reason: 'CAPTCHA or verification challenge detected in URL' };
    }
    return null;
  }

  private async checkDomForHandoff(page: Page): Promise<HandoffResult | null> {
    try {
      const result = await page.evaluate(() => {
        const getVisibleText = (): string => {
          const body = document.body;
          if (!body) return '';
          const clone = body.cloneNode(true) as HTMLElement;
          clone.querySelectorAll('script, style, noscript, svg, code, pre').forEach((el) => el.remove());
          return clone.innerText ?? '';
        };

        const checkCaptcha = (): string | null => {
          const captchaIframe = document.querySelector(
            'iframe[src*="captcha"], iframe[src*="recaptcha"], iframe[src*="hcaptcha"]'
          );
          if (captchaIframe) return 'CAPTCHA iframe detected (reCAPTCHA/hCaptcha)';

          if (document.querySelector('.g-recaptcha, .h-captcha, [data-sitekey]')) {
            return 'CAPTCHA widget detected';
          }

          const captchaElements = document.querySelectorAll('[class*="captcha"], [id*="captcha"]');
          for (const el of captchaElements) {
            if (el instanceof HTMLElement && el.offsetHeight > 0 && el.offsetWidth > 0) {
              return 'CAPTCHA element detected';
            }
          }

          return null;
        };

        const checkTwoFactor = (visibleText: string): string | null => {
          const lower = visibleText.toLowerCase();
          const twoFactorPatterns = [
            /\btwo[- ]?factor\b/i,
            /\b2fa\b/i,
            /\bmulti[- ]?factor\b/i,
            /\bmfa\b/i,
          ];
          for (const p of twoFactorPatterns) {
            if (p.test(lower)) return 'Two-factor authentication prompt detected';
          }

          const otpPatterns = [
            /\bverification code\b/i,
            /\bone[- ]?time code\b/i,
            /\bsecurity code\b/i,
            /\bauthenticator code\b/i,
            /\benter the code\b/i,
            /\bcode sent to\b/i,
          ];
          for (const p of otpPatterns) {
            if (p.test(lower)) return 'One-time password / verification code prompt detected';
          }

          const otpInput = document.querySelector(
            'input[autocomplete="one-time-code"], input[autocomplete="one-time password"], input[inputmode="numeric"][maxlength="6"]'
          );
          if (otpInput instanceof HTMLElement && otpInput.offsetHeight > 0) {
            return 'OTP input field detected';
          }

          return null;
        };

        const checkPasswordLogin = (): string | null => {
          const passwordInputs = document.querySelectorAll('input[type="password"]');
          for (const input of passwordInputs) {
            if (!(input instanceof HTMLElement) || input.offsetHeight === 0) continue;

            const form = input.closest('form');
            if (!form) {
              const parentText = (input.parentElement?.innerText ?? '').toLowerCase();
              if (/\b(sign[- ]?in|log[- ]?in|password|authenticate)\b/i.test(parentText)) {
                return 'Login/password input detected';
              }
              continue;
            }

            const formText = form.innerText.toLowerCase();
            const formHtml = form.innerHTML.toLowerCase();
            if (
              /\b(sign[- ]?in|log[- ]?in|login|password|authenticate|credential)\b/i.test(formText) ||
              /\b(sign[- ]?in|log[- ]?in|login|password|authenticate|credential)\b/i.test(formHtml)
            ) {
              return 'Login/password input detected';
            }
          }
          return null;
        };

        const visibleText = getVisibleText();

        const captchaResult = checkCaptcha();
        if (captchaResult) return { handoff: true, reason: captchaResult };

        const twoFactorResult = checkTwoFactor(visibleText);
        if (twoFactorResult) return { handoff: true, reason: twoFactorResult };

        const passwordResult = checkPasswordLogin();
        if (passwordResult) return { handoff: true, reason: passwordResult };

        return { handoff: false };
      });

      return result.handoff ? result : null;
    } catch {
      return null;
    }
  }

  async verifyAction(
    before: PageSnapshot,
    kind: 'navigate' | 'click' | 'type' | 'press' | 'scroll' | 'back',
    input?: string,
  ): Promise<VerificationResult> {
    const after = await this.captureSnapshot();

    if (kind === 'navigate' || kind === 'back') {
      if (before.url !== after.url) {
        return { outcome: 'SUCCESS', reason: `URL changed to ${after.url}` };
      }
      if (before.title !== after.title) {
        return { outcome: 'SUCCESS', reason: `Page title changed to "${after.title}"` };
      }
      return { outcome: 'UNCERTAIN', reason: 'URL and title unchanged after navigation' };
    }

    if (kind === 'scroll') {
      if (after.scrollY !== before.scrollY || after.scrollX !== before.scrollX) {
        return { outcome: 'SUCCESS', reason: `Scrolled to (${after.scrollX}, ${after.scrollY})` };
      }
      return { outcome: 'FAILED', reason: 'Scroll position unchanged' };
    }

    if (kind === 'type') {
      const page = await this.getPage();
      const value = await page.evaluate((sel) => {
        if (!sel) return '';
        const el = document.querySelector(sel);
        if (el && ('value' in el)) return (el as HTMLInputElement).value ?? '';
        const focused = document.activeElement;
        if (focused && ('value' in focused)) return (focused as HTMLInputElement).value ?? '';
        return '';
      }, input);
      if (value && input && value.includes(input)) {
        return { outcome: 'SUCCESS', reason: `Input contains typed text` };
      }
      if (after.bodyTextHash !== before.bodyTextHash) {
        return { outcome: 'SUCCESS', reason: 'Page content changed after typing' };
      }
      return { outcome: 'UNCERTAIN', reason: 'Could not confirm typed text landed' };
    }

    if (kind === 'click') {
      if (before.url !== after.url) {
        return { outcome: 'SUCCESS', reason: `Navigation to ${after.url}` };
      }
      if (before.title !== after.title) {
        return { outcome: 'SUCCESS', reason: `Page title changed to "${after.title}"` };
      }
      if (after.bodyTextHash !== before.bodyTextHash) {
        return { outcome: 'SUCCESS', reason: 'Page content changed' };
      }
      if (before.activeElementSelector !== after.activeElementSelector) {
        return { outcome: 'SUCCESS', reason: `Focus moved to ${after.activeElementTag}` };
      }
      return { outcome: 'UNCERTAIN', reason: 'No observable effect from click' };
    }

    if (kind === 'press') {
      if (before.url !== after.url) {
        return { outcome: 'SUCCESS', reason: `Navigation to ${after.url}` };
      }
      if (before.title !== after.title) {
        return { outcome: 'SUCCESS', reason: `Page title changed` };
      }
      if (after.bodyTextHash !== before.bodyTextHash) {
        return { outcome: 'SUCCESS', reason: 'Page content changed' };
      }
      if (before.activeElementSelector !== after.activeElementSelector) {
        return { outcome: 'SUCCESS', reason: `Focus moved to ${after.activeElementTag}` };
      }
      return { outcome: 'UNCERTAIN', reason: 'No observable effect from key press' };
    }

    return { outcome: 'UNCERTAIN', reason: 'Unknown action kind' };
  }

  async close(): Promise<void> {
    try {
      await this.page?.close();
      await this.context?.close();
      await this.browser?.close();
    } catch {
      // ignore cleanup errors
    }
    this.page = null;
    this.context = null;
    this.browser = null;
    this.actionLedger.clear();
  }

  resetLedger(): void {
    this.actionLedger.clear();
  }

  private async findLocator(page: Page, target: string) {
    const looksLikeSelector = /^[a-zA-Z][\w-]*(\[.+\])?(#[\w-]+)?(\.[\w-]+)*$/.test(target) ||
      target.includes('[') || target.includes('#') || target.includes(' > ');

    if (looksLikeSelector) {
      try {
        const locator = page.locator(target);
        const count = await locator.count();
        if (count > 0) return locator;
      } catch {
        // fall through to ARIA strategies
      }
    }

    const strategies: Array<() => ReturnType<Page['locator']>> = [
      () => page.getByRole('button', { name: target }),
      () => page.getByRole('link', { name: target }),
      () => page.getByRole('textbox', { name: target }),
      () => page.getByRole('combobox', { name: target }),
      () => page.getByRole('searchbox', { name: target }),
      () => page.getByLabel(target),
      () => page.getByPlaceholder(target),
      () => page.getByText(target, { exact: false }),
      () => page.getByAltText(target),
      () => page.getByTitle(target),
      () => page.locator(target),
    ];

    for (const strategy of strategies) {
      try {
        const locator = strategy();
        if (locator) {
          const count = await locator.count();
          if (count > 0) return locator;
        }
      } catch {
        continue;
      }
    }
    return page.locator(target);
  }
}

export class BrowserSessionError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = 'BrowserSessionError';
  }
}

const globalSession = new BrowserSession();
export default globalSession;
