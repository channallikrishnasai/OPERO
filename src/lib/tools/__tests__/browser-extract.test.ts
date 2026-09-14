import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('playwright-core', () => {
  const mockPage = {
    goto: vi.fn().mockResolvedValue(undefined),
    url: vi.fn().mockReturnValue('https://example.com'),
    title: vi.fn().mockReturnValue('Example Page'),
    evaluate: vi.fn(),
    click: vi.fn().mockResolvedValue(undefined),
    fill: vi.fn().mockResolvedValue(undefined),
    clear: vi.fn().mockResolvedValue(undefined),
    type: vi.fn().mockResolvedValue(undefined),
    keyboard: { press: vi.fn().mockResolvedValue(undefined) },
    mouse: { wheel: vi.fn().mockResolvedValue(undefined) },
    goBack: vi.fn().mockResolvedValue(undefined),
    screenshot: vi.fn().mockResolvedValue(undefined),
    isClosed: vi.fn().mockReturnValue(false),
    close: vi.fn().mockResolvedValue(undefined),
    waitForTimeout: vi.fn().mockResolvedValue(undefined),
    getByRole: vi.fn().mockReturnValue({ count: vi.fn().mockResolvedValue(0) }),
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

import { browserExtractTool } from '../implementations';
import session from '@/lib/browser/session';

async function getMockPage() {
  const pw = await import('playwright-core') as unknown as {
    __mock: {
      mockPage: {
        evaluate: ReturnType<typeof vi.fn>;
        url: ReturnType<typeof vi.fn>;
        title: ReturnType<typeof vi.fn>;
        click: ReturnType<typeof vi.fn>;
        fill: ReturnType<typeof vi.fn>;
        goto: ReturnType<typeof vi.fn>;
        keyboard: { press: ReturnType<typeof vi.fn> };
      };
    };
  };
  return pw.__mock.mockPage;
}

const EMPTY_RESULT = {
  headings: [],
  links: [],
  buttons: [],
  formFields: [],
  visibleText: '',
};

const FULL_PAGE_RESULT = {
  headings: [
    { tag: 'h1', text: 'Welcome' },
    { tag: 'h2', text: 'Features' },
    { tag: 'h3', text: 'Details' },
  ],
  links: [
    { text: 'Home', href: 'https://example.com/' },
    { text: 'About', href: 'https://example.com/about' },
  ],
  buttons: [
    { text: 'Submit', selector: 'button.submit' },
    { text: 'Cancel', selector: '#cancel-btn' },
  ],
  formFields: [
    { tag: 'input', type: 'text', placeholder: 'Search...', ariaLabel: 'Search', name: 'q', value: '', selector: 'input.search' },
    { tag: 'textarea', type: undefined, placeholder: 'Message', ariaLabel: undefined, name: 'message', value: '', selector: 'textarea' },
    { tag: 'select', type: undefined, placeholder: undefined, ariaLabel: undefined, name: 'country', value: undefined, selector: 'select' },
    { tag: 'contenteditable', type: undefined, placeholder: undefined, ariaLabel: undefined, name: undefined, value: 'Hello', selector: 'div' },
  ],
  visibleText: 'Welcome to our site. This is the main content area with useful information.',
};

describe('browser.extract', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    session.resetLedger();
    const page = await getMockPage();
    page.url.mockReturnValue('https://example.com');
    page.title.mockReturnValue('Example Page');
  });

  describe('A. Tool definition', () => {
    it('has correct name and READ permission', () => {
      expect(browserExtractTool.name).toBe('browser.extract');
      expect(browserExtractTool.permission).toBe('READ');
    });

    it('has no required input parameters', () => {
      expect(browserExtractTool.inputSchema.required).toBeUndefined();
      expect(Object.keys(browserExtractTool.inputSchema.properties)).toHaveLength(0);
    });
  });

  describe('B. Metadata extraction', () => {
    it('returns url and title from the page', async () => {
      const page = await getMockPage();
      page.url.mockReturnValue('https://example.com/page');
      page.title.mockReturnValue('My Page Title');
      page.evaluate.mockResolvedValue(EMPTY_RESULT);

      const result = await browserExtractTool.execute({});
      expect(result.success).toBe(true);
      expect(result.data.url).toBe('https://example.com/page');
      expect(result.data.title).toBe('My Page Title');
    });
  });

  describe('C. Headings extraction', () => {
    it('extracts h1, h2, h3 headings', async () => {
      const page = await getMockPage();
      page.evaluate.mockResolvedValue({
        ...EMPTY_RESULT,
        headings: [
          { tag: 'h1', text: 'Main Title' },
          { tag: 'h2', text: 'Section One' },
          { tag: 'h3', text: 'Sub Section' },
        ],
      });

      const result = await browserExtractTool.execute({});
      expect(result.success).toBe(true);
      expect(result.data.headings).toHaveLength(3);
      expect(result.data.headings[0]).toEqual({ tag: 'h1', text: 'Main Title' });
      expect(result.data.headings[1]).toEqual({ tag: 'h2', text: 'Section One' });
      expect(result.data.headings[2]).toEqual({ tag: 'h3', text: 'Sub Section' });
    });

    it('returns empty array when no headings exist', async () => {
      const page = await getMockPage();
      page.evaluate.mockResolvedValue(EMPTY_RESULT);

      const result = await browserExtractTool.execute({});
      expect(result.success).toBe(true);
      expect(result.data.headings).toEqual([]);
    });
  });

  describe('D. Links extraction', () => {
    it('extracts visible links with text and href', async () => {
      const page = await getMockPage();
      page.evaluate.mockResolvedValue({
        ...EMPTY_RESULT,
        links: [
          { text: 'Home', href: 'https://example.com/' },
          { text: 'About Us', href: 'https://example.com/about' },
        ],
      });

      const result = await browserExtractTool.execute({});
      expect(result.success).toBe(true);
      expect(result.data.links).toHaveLength(2);
      expect(result.data.links[0].text).toBe('Home');
      expect(result.data.links[0].href).toBe('https://example.com/');
    });

    it('returns empty array when no links exist', async () => {
      const page = await getMockPage();
      page.evaluate.mockResolvedValue(EMPTY_RESULT);

      const result = await browserExtractTool.execute({});
      expect(result.success).toBe(true);
      expect(result.data.links).toEqual([]);
    });
  });

  describe('E. Buttons extraction', () => {
    it('extracts buttons with text and selector', async () => {
      const page = await getMockPage();
      page.evaluate.mockResolvedValue({
        ...EMPTY_RESULT,
        buttons: [
          { text: 'Submit', selector: 'button.submit' },
          { text: 'Cancel', selector: '#cancel-btn' },
        ],
      });

      const result = await browserExtractTool.execute({});
      expect(result.success).toBe(true);
      expect(result.data.buttons).toHaveLength(2);
      expect(result.data.buttons[0].text).toBe('Submit');
      expect(result.data.buttons[0].selector).toBe('button.submit');
    });

    it('returns empty array when no buttons exist', async () => {
      const page = await getMockPage();
      page.evaluate.mockResolvedValue(EMPTY_RESULT);

      const result = await browserExtractTool.execute({});
      expect(result.success).toBe(true);
      expect(result.data.buttons).toEqual([]);
    });
  });

  describe('F. Form fields extraction', () => {
    it('extracts input, textarea, select, and contenteditable', async () => {
      const page = await getMockPage();
      page.evaluate.mockResolvedValue({
        ...EMPTY_RESULT,
        formFields: [
          { tag: 'input', type: 'text', placeholder: 'Search', ariaLabel: 'Search', name: 'q', value: '', selector: 'input' },
          { tag: 'textarea', type: undefined, placeholder: 'Message', ariaLabel: undefined, name: 'msg', value: '', selector: 'textarea' },
          { tag: 'select', type: undefined, placeholder: undefined, ariaLabel: undefined, name: 'country', value: undefined, selector: 'select' },
          { tag: 'contenteditable', type: undefined, placeholder: undefined, ariaLabel: undefined, name: undefined, value: 'Hello', selector: 'div' },
        ],
      });

      const result = await browserExtractTool.execute({});
      expect(result.success).toBe(true);
      expect(result.data.formFields).toHaveLength(4);
      expect(result.data.formFields[0].tag).toBe('input');
      expect(result.data.formFields[0].type).toBe('text');
      expect(result.data.formFields[1].tag).toBe('textarea');
      expect(result.data.formFields[2].tag).toBe('select');
      expect(result.data.formFields[3].tag).toBe('contenteditable');
      expect(result.data.formFields[3].value).toBe('Hello');
    });

    it('returns empty array when no form fields exist', async () => {
      const page = await getMockPage();
      page.evaluate.mockResolvedValue(EMPTY_RESULT);

      const result = await browserExtractTool.execute({});
      expect(result.success).toBe(true);
      expect(result.data.formFields).toEqual([]);
    });
  });

  describe('G. Visible text extraction', () => {
    it('returns bounded visible text', async () => {
      const page = await getMockPage();
      page.evaluate.mockResolvedValue({
        ...EMPTY_RESULT,
        visibleText: 'Some useful page content.',
      });

      const result = await browserExtractTool.execute({});
      expect(result.success).toBe(true);
      expect(result.data.visibleText).toBe('Some useful page content.');
    });

    it('returns empty string when no visible text', async () => {
      const page = await getMockPage();
      page.evaluate.mockResolvedValue(EMPTY_RESULT);

      const result = await browserExtractTool.execute({});
      expect(result.success).toBe(true);
      expect(result.data.visibleText).toBe('');
    });
  });

  describe('H. Bounded output', () => {
    it('returns evaluate result as-is without adding extra truncation', async () => {
      const page = await getMockPage();
      const text = 'x'.repeat(3000);
      page.evaluate.mockResolvedValue({
        ...EMPTY_RESULT,
        visibleText: text,
      });

      const result = await browserExtractTool.execute({});
      expect(result.success).toBe(true);
      expect(result.data.visibleText).toBe(text);
    });

    it('passes through link data from evaluate', async () => {
      const page = await getMockPage();
      const link = { text: 'Short', href: 'https://example.com/page' };
      page.evaluate.mockResolvedValue({
        ...EMPTY_RESULT,
        links: [link],
      });

      const result = await browserExtractTool.execute({});
      expect(result.success).toBe(true);
      expect(result.data.links[0]).toEqual(link);
    });

    it('passes through button data from evaluate', async () => {
      const page = await getMockPage();
      const btn = { text: 'Click Me', selector: '#btn' };
      page.evaluate.mockResolvedValue({
        ...EMPTY_RESULT,
        buttons: [btn],
      });

      const result = await browserExtractTool.execute({});
      expect(result.success).toBe(true);
      expect(result.data.buttons[0]).toEqual(btn);
    });
  });

  describe('I. Full page extraction', () => {
    it('extracts all fields from a populated page', async () => {
      const page = await getMockPage();
      page.evaluate.mockResolvedValue(FULL_PAGE_RESULT);

      const result = await browserExtractTool.execute({});
      expect(result.success).toBe(true);
      expect(result.data.headings).toHaveLength(3);
      expect(result.data.links).toHaveLength(2);
      expect(result.data.buttons).toHaveLength(2);
      expect(result.data.formFields).toHaveLength(4);
      expect(result.data.visibleText).toContain('Welcome to our site');
    });
  });

  describe('J. Empty / minimal page', () => {
    it('returns empty arrays and empty text for a blank page', async () => {
      const page = await getMockPage();
      page.evaluate.mockResolvedValue(EMPTY_RESULT);

      const result = await browserExtractTool.execute({});
      expect(result.success).toBe(true);
      expect(result.data.url).toBe('https://example.com');
      expect(result.data.title).toBe('Example Page');
      expect(result.data.headings).toEqual([]);
      expect(result.data.links).toEqual([]);
      expect(result.data.buttons).toEqual([]);
      expect(result.data.formFields).toEqual([]);
      expect(result.data.visibleText).toBe('');
    });
  });

  describe('K. Read-only operation', () => {
    it('does not call click, type, press, goto, or fill', async () => {
      const page = await getMockPage();
      page.evaluate.mockResolvedValue(FULL_PAGE_RESULT);

      await browserExtractTool.execute({});

      expect(page.click).not.toHaveBeenCalled();
      expect(page.fill).not.toHaveBeenCalled();
      expect(page.goto).not.toHaveBeenCalled();
      expect(page.keyboard.press).not.toHaveBeenCalled();
    });

    it('only calls evaluate and url/title (read-only methods)', async () => {
      const page = await getMockPage();
      page.evaluate.mockResolvedValue(EMPTY_RESULT);

      await browserExtractTool.execute({});

      expect(page.url).toHaveBeenCalled();
      expect(page.title).toHaveBeenCalled();
      expect(page.evaluate).toHaveBeenCalled();
    });
  });

  describe('L. Error handling', () => {
    it('returns error when evaluate throws', async () => {
      const page = await getMockPage();
      page.evaluate.mockRejectedValue(new Error('Page crashed'));

      const result = await browserExtractTool.execute({});
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error!.code).toBe('BROWSER_EXTRACT_FAILED');
      expect(result.data.headings).toEqual([]);
      expect(result.data.links).toEqual([]);
    });
  });
});
