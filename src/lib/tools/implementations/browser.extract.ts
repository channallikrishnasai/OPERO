import { ToolDefinition, ToolPermission, ToolResult } from '../types';
import { logToolExecution } from '../logger';
import { ActionStatus } from '@prisma/client';
import session from '@/lib/browser/session';

const MAX_VISIBLE_TEXT = 4000;

export interface ExtractedHeading {
  tag: 'h1' | 'h2' | 'h3';
  text: string;
}

export interface ExtractedLink {
  text: string;
  href: string;
}

export interface ExtractedButton {
  text: string;
  selector?: string;
}

export interface ExtractedFormField {
  tag: 'input' | 'textarea' | 'select' | 'contenteditable';
  type?: string;
  placeholder?: string;
  ariaLabel?: string;
  name?: string;
  value?: string;
  selector?: string;
}

export interface BrowserExtractOutput {
  url: string;
  title: string;
  headings: ExtractedHeading[];
  links: ExtractedLink[];
  buttons: ExtractedButton[];
  formFields: ExtractedFormField[];
  visibleText: string;
}

async function execute(): Promise<ToolResult<BrowserExtractOutput>> {
  try {
    const page = await session.getPage();
    const url = page.url();
    const title = await page.title();

    const extracted = await page.evaluate((maxText: number) => {
      const isVisible = (el: Element): boolean => {
        if (!(el instanceof HTMLElement)) return false;
        const style = window.getComputedStyle(el);
        return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0' && el.offsetHeight > 0;
      };

      const getText = (el: Element): string => {
        return (el.textContent ?? '').replace(/\s+/g, ' ').trim();
      };

      const getSelector = (el: Element): string | undefined => {
        if (el.id) return `#${el.id}`;
        const cls = el.className && typeof el.className === 'string'
          ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.')
          : '';
        return el.tagName.toLowerCase() + cls || undefined;
      };

      const headings: Array<{ tag: string; text: string }> = [];
      document.querySelectorAll('h1, h2, h3').forEach((el) => {
        if (isVisible(el)) {
          const text = getText(el);
          if (text) headings.push({ tag: el.tagName.toLowerCase(), text });
        }
      });

      const seenHrefs = new Set<string>();
      const links: Array<{ text: string; href: string }> = [];
      document.querySelectorAll('a[href]').forEach((el) => {
        if (!isVisible(el)) return;
        const text = getText(el);
        const href = (el as HTMLAnchorElement).href;
        if (!text || !href || href === 'javascript:void(0)' || href.endsWith('#')) return;
        const key = `${text}::${href}`;
        if (seenHrefs.has(key)) return;
        seenHrefs.add(key);
        links.push({ text: text.slice(0, 120), href: href.slice(0, 200) });
      });

      const seenButtons = new Set<string>();
      const buttons: Array<{ text: string; selector?: string }> = [];
      const addBtn = (text: string, selector?: string) => {
        const key = text + (selector ?? '');
        if (!text || seenButtons.has(key)) return;
        seenButtons.add(key);
        buttons.push({ text: text.slice(0, 120), selector });
      };

      document.querySelectorAll('button, [role="button"], input[type="submit"], input[type="button"]').forEach((el) => {
        if (!isVisible(el)) return;
        const text = getText(el) || (el as HTMLInputElement).value || el.getAttribute('aria-label') || '';
        addBtn(text, getSelector(el));
      });

      document.querySelectorAll('a').forEach((el) => {
        if (!isVisible(el)) return;
        const role = el.getAttribute('role');
        if (role === 'button') {
          addBtn(getText(el), getSelector(el));
        }
      });

      const seenFields = new Set<string>();
      const formFields: Array<{
        tag: string;
        type?: string;
        placeholder?: string;
        ariaLabel?: string;
        name?: string;
        value?: string;
        selector?: string;
      }> = [];

      document.querySelectorAll('input, textarea, select, [contenteditable="true"]').forEach((el) => {
        if (!isVisible(el)) return;
        const tag = el.tagName.toLowerCase() === 'input' || el.tagName.toLowerCase() === 'textarea'
          ? el.tagName.toLowerCase()
          : el.tagName.toLowerCase() === 'select'
            ? 'select'
            : 'contenteditable';
        const type = el.getAttribute('type') || undefined;
        const placeholder = el.getAttribute('placeholder') || undefined;
        const ariaLabel = el.getAttribute('aria-label') || undefined;
        const name = el.getAttribute('name') || undefined;
        const value = (tag === 'contenteditable')
          ? getText(el).slice(0, 100)
          : (el as HTMLInputElement).value?.slice(0, 100) || undefined;
        const selector = getSelector(el);
        const key = `${tag}::${name ?? ''}::${placeholder ?? ''}::${selector ?? ''}`;
        if (seenFields.has(key)) return;
        seenFields.add(key);
        formFields.push({ tag, type, placeholder, ariaLabel, name, value, selector });
      });

      const main = document.querySelector('main') || document.querySelector('[role="main"]') || document.body;
      const clone = main.cloneNode(true) as HTMLElement;
      clone.querySelectorAll('script, style, noscript, svg, code, pre').forEach((el) => el.remove());
      const visibleText = (clone.innerText ?? '').trim().slice(0, maxText);

      return { headings, links, buttons, formFields, visibleText };
    }, MAX_VISIBLE_TEXT);

    await logToolExecution({
      toolName: 'browser.extract',
      entityType: 'Browser',
      status: ActionStatus.COMPLETED,
      details: {
        url,
        headings: extracted.headings.length,
        links: extracted.links.length,
        buttons: extracted.buttons.length,
        formFields: extracted.formFields.length,
        visibleTextLength: extracted.visibleText.length,
      },
    });

    return {
      success: true,
      data: { url, title, ...extracted } as BrowserExtractOutput,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    await logToolExecution({
      toolName: 'browser.extract',
      entityType: 'Browser',
      status: ActionStatus.FAILED,
      details: { error: message },
    });

    return {
      success: false,
      data: { url: '', title: '', headings: [], links: [], buttons: [], formFields: [], visibleText: '' },
      error: { code: 'BROWSER_EXTRACT_FAILED', message: `Failed to extract page structure: ${message}` },
    };
  }
}

export const browserExtractTool: ToolDefinition<Record<string, never>, BrowserExtractOutput> = {
  name: 'browser.extract',
  description:
    'Extract structured information from the current page: metadata, headings, links, buttons, form fields, and main visible text. Read-only — never mutates the page.',
  permission: ToolPermission.READ,
  inputSchema: {
    type: 'object',
    properties: {},
  },
  execute,
};
