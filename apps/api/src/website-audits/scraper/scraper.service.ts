import { Injectable, Logger } from '@nestjs/common';
import * as cheerio from 'cheerio';
import { ScrapedWebsiteData } from './scraper.types';

const FETCH_TIMEOUT_MS = 10_000;
const LINK_CHECK_TIMEOUT_MS = 4_000;
const MAX_LINKS_TO_SAMPLE = 10;
const TEXT_EXCERPT_MAX_LENGTH = 4_000;

const TECHNOLOGY_FINGERPRINTS: Array<{ name: string; marker: string }> = [
  { name: 'WordPress', marker: 'wp-content' },
  { name: 'Shopify', marker: 'cdn.shopify.com' },
  { name: 'Wix', marker: 'static.wixstatic.com' },
  { name: 'Squarespace', marker: 'cdn.squarespace.com' },
  { name: 'Webflow', marker: 'webflow.com' },
  { name: 'Next.js', marker: '__NEXT_DATA__' },
];

const SOCIAL_DOMAINS = [
  'facebook.com',
  'instagram.com',
  'twitter.com',
  'x.com',
  'linkedin.com',
  'youtube.com',
  'tiktok.com',
];

interface ParsedHtml {
  title: string | null;
  description: string | null;
  detectedTechnology: string[];
  isResponsive: boolean;
  copyrightYear: number | null;
  socialLinks: string[];
  hasContactForm: boolean;
  hasMap: boolean;
  hasBlog: boolean;
  lastUpdatedDetectedAt: string | null;
  textExcerpt: string;
  internalLinks: string[];
  sampleLinksToCheck: string[];
}

@Injectable()
export class ScraperService {
  private readonly logger = new Logger(ScraperService.name);

  async analyze(url: string): Promise<ScrapedWebsiteData> {
    const start = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(url, { redirect: 'follow', signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }

    const loadTimeMs = Date.now() - start;
    const html = await response.text();
    const hasHttps = new URL(response.url || url).protocol === 'https:';
    const parsed = parseHtml(html, response.url || url);
    const brokenLinksCount = await this.sampleBrokenLinks(parsed.sampleLinksToCheck);

    return {
      title: parsed.title,
      description: parsed.description,
      detectedTechnology: parsed.detectedTechnology,
      pageCount: parsed.internalLinks.length,
      loadTimeMs,
      hasHttps,
      isResponsive: parsed.isResponsive,
      brokenLinksCount,
      lastUpdatedDetectedAt: parsed.lastUpdatedDetectedAt,
      copyrightYear: parsed.copyrightYear,
      socialLinks: parsed.socialLinks,
      hasContactForm: parsed.hasContactForm,
      hasMap: parsed.hasMap,
      hasBlog: parsed.hasBlog,
      textExcerpt: parsed.textExcerpt,
    };
  }

  /** Amostra até `MAX_LINKS_TO_SAMPLE` links com HEAD requests — não é uma varredura do site inteiro (ver ADR 0008). */
  private async sampleBrokenLinks(links: string[]): Promise<number> {
    const sample = links.slice(0, MAX_LINKS_TO_SAMPLE);
    const results = await Promise.allSettled(sample.map((link) => this.checkLink(link)));
    return results.filter((result) => result.status === 'fulfilled' && !result.value).length;
  }

  private async checkLink(link: string): Promise<boolean> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), LINK_CHECK_TIMEOUT_MS);
    try {
      const response = await fetch(link, { method: 'HEAD', signal: controller.signal });
      return response.ok;
    } catch (error) {
      this.logger.debug(`Link check failed for ${link}: ${String(error)}`);
      return false;
    } finally {
      clearTimeout(timeout);
    }
  }
}

export function parseHtml(html: string, pageUrl: string): ParsedHtml {
  const $ = cheerio.load(html);
  const baseHost = safeHostname(pageUrl);

  const title = $('title').first().text().trim() || null;
  const description = $('meta[name="description"]').attr('content')?.trim() || null;
  const isResponsive = $('meta[name="viewport"]').length > 0;

  const detectedTechnology = TECHNOLOGY_FINGERPRINTS.filter(({ marker }) =>
    html.includes(marker),
  ).map(({ name }) => name);

  const bodyText = $('body').text().replace(/\s+/g, ' ').trim();
  const copyrightMatch = /(?:©|copyright)\s*(\d{4})/i.exec(bodyText);
  const copyrightYear = copyrightMatch?.[1] ? Number(copyrightMatch[1]) : null;

  const lastUpdatedDetectedAt =
    $('meta[property="article:modified_time"]').attr('content') ??
    $('meta[name="last-modified"]').attr('content') ??
    null;

  const hrefs = $('a[href]')
    .map((_, el) => $(el).attr('href'))
    .get()
    .filter((href): href is string => Boolean(href));

  const resolvedLinks = hrefs
    .map((href) => resolveUrl(href, pageUrl))
    .filter((link): link is string => link !== null);

  const internalLinks = [
    ...new Set(resolvedLinks.filter((link) => safeHostname(link) === baseHost)),
  ];
  const sampleLinksToCheck = [...new Set(resolvedLinks)];

  const socialLinks = [
    ...new Set(
      resolvedLinks.filter((link) => SOCIAL_DOMAINS.some((domain) => link.includes(domain))),
    ),
  ];

  const navAndFooterText = $('nav, footer, header').text().toLowerCase();
  const hasBlog = navAndFooterText.includes('blog') || html.toLowerCase().includes('/blog');

  const hasContactForm = $('form').length > 0;
  const hasMap =
    html.includes('google.com/maps') ||
    html.includes('maps.google') ||
    $('iframe[src*="maps"]').length > 0;

  return {
    title,
    description,
    detectedTechnology,
    isResponsive,
    copyrightYear,
    socialLinks,
    hasContactForm,
    hasMap,
    hasBlog,
    lastUpdatedDetectedAt,
    textExcerpt: bodyText.slice(0, TEXT_EXCERPT_MAX_LENGTH),
    internalLinks,
    sampleLinksToCheck,
  };
}

function resolveUrl(href: string, base: string): string | null {
  try {
    return new URL(href, base).toString();
  } catch {
    return null;
  }
}

function safeHostname(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}
