import { ScraperService, parseHtml } from './scraper.service';

const SAMPLE_HTML = `
<!DOCTYPE html>
<html>
  <head>
    <title>Clínica Sorriso — Dentista em BH</title>
    <meta name="description" content="Odontologia geral e estética." />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </head>
  <body class="wp-content">
    <header><a href="/blog">Blog</a></header>
    <nav>
      <a href="https://clinicasorriso.example/sobre">Sobre</a>
      <a href="https://clinicasorriso.example/contato">Contato</a>
      <a href="https://www.facebook.com/clinicasorriso">Facebook</a>
      <a href="https://www.instagram.com/clinicasorriso">Instagram</a>
    </nav>
    <main>
      <iframe src="https://www.google.com/maps/embed?pb=abc"></iframe>
      <form><input type="email" /></form>
      <p>© 2018 Clínica Sorriso. Todos os direitos reservados.</p>
    </main>
  </body>
</html>
`;

describe('parseHtml', () => {
  const result = parseHtml(SAMPLE_HTML, 'https://clinicasorriso.example/');

  it('extracts title and description', () => {
    expect(result.title).toBe('Clínica Sorriso — Dentista em BH');
    expect(result.description).toBe('Odontologia geral e estética.');
  });

  it('detects responsiveness via viewport meta tag', () => {
    expect(result.isResponsive).toBe(true);
  });

  it('detects technology fingerprints', () => {
    expect(result.detectedTechnology).toContain('WordPress');
  });

  it('extracts the copyright year', () => {
    expect(result.copyrightYear).toBe(2018);
  });

  it('finds social links', () => {
    expect(result.socialLinks).toEqual(
      expect.arrayContaining([
        'https://www.facebook.com/clinicasorriso',
        'https://www.instagram.com/clinicasorriso',
      ]),
    );
  });

  it('detects contact form, map, and blog', () => {
    expect(result.hasContactForm).toBe(true);
    expect(result.hasMap).toBe(true);
    expect(result.hasBlog).toBe(true);
  });

  it('dedupes internal links', () => {
    expect(result.internalLinks).toEqual(
      expect.arrayContaining([
        'https://clinicasorriso.example/sobre',
        'https://clinicasorriso.example/contato',
      ]),
    );
    expect(result.internalLinks).toHaveLength(3);
  });

  it('truncates the text excerpt', () => {
    expect(result.textExcerpt.length).toBeLessThanOrEqual(4000);
    expect(result.textExcerpt).toContain('Clínica Sorriso');
  });
});

describe('ScraperService', () => {
  let service: ScraperService;
  let fetchMock: jest.Mock;

  beforeEach(() => {
    service = new ScraperService();
    fetchMock = jest.fn();
    global.fetch = fetchMock;
  });

  it('fetches the page and returns normalized scraped data', async () => {
    fetchMock.mockImplementation((input: string, init?: RequestInit) => {
      if (init?.method === 'HEAD') {
        return Promise.resolve({ ok: true } as Response);
      }
      return Promise.resolve({
        ok: true,
        url: 'https://clinicasorriso.example/',
        text: () => Promise.resolve(SAMPLE_HTML),
      } as Response);
    });

    const result = await service.analyze('https://clinicasorriso.example/');

    expect(result.hasHttps).toBe(true);
    expect(result.title).toBe('Clínica Sorriso — Dentista em BH');
    expect(result.pageCount).toBe(3);
    expect(result.brokenLinksCount).toBe(0);
    expect(typeof result.loadTimeMs).toBe('number');
  });

  it('counts failed link checks as broken', async () => {
    fetchMock.mockImplementation((input: string, init?: RequestInit) => {
      if (init?.method === 'HEAD') {
        return Promise.resolve({ ok: false } as Response);
      }
      return Promise.resolve({
        ok: true,
        url: 'https://clinicasorriso.example/',
        text: () => Promise.resolve(SAMPLE_HTML),
      } as Response);
    });

    const result = await service.analyze('https://clinicasorriso.example/');

    expect(result.brokenLinksCount).toBeGreaterThan(0);
  });
});
