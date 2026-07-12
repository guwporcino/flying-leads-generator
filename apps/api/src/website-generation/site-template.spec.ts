import * as ts from 'typescript';
import { renderSiteFiles } from './site-template';
import { CompanySiteInput, GeneratedSiteContent } from './website-generation.types';

function buildCompany(overrides: Partial<CompanySiteInput> = {}): CompanySiteInput {
  return {
    id: 'company-1',
    name: 'Clínica Sorriso',
    category: 'dentist',
    phone: '(31) 3333-4444',
    whatsapp: '5531999998888',
    rating: 4.5,
    reviewCount: 20,
    googleMapsUrl: 'https://maps.google.com/?cid=1',
    ...overrides,
  };
}

function buildContent(overrides: Partial<GeneratedSiteContent> = {}): GeneratedSiteContent {
  return {
    seoTitle: 'Clínica Sorriso — Dentista em BH',
    seoDescription: 'Odontologia geral e estética em Belo Horizonte.',
    heroHeadline: 'Seu sorriso, nossa prioridade',
    heroSubheadline: 'Atendimento completo para toda a família.',
    aboutText: 'A Clínica Sorriso é referência em odontologia na região.',
    services: ['Limpeza', 'Clareamento', 'Ortodontia'],
    ctaText: 'Fale agora pelo WhatsApp',
    ...overrides,
  };
}

function assertValidTsx(source: string): void {
  const result = ts.transpileModule(source, {
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext },
    reportDiagnostics: true,
  });
  const errors = (result.diagnostics ?? []).filter(
    (diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error,
  );
  expect(errors).toEqual([]);
}

describe('renderSiteFiles', () => {
  it('returns the expected file set', () => {
    const files = renderSiteFiles(buildCompany(), buildContent());

    expect(files.map((file) => file.path)).toEqual([
      'package.json',
      'next.config.ts',
      'tsconfig.json',
      'postcss.config.mjs',
      'app/globals.css',
      'app/layout.tsx',
      'app/page.tsx',
    ]);
  });

  it('produces syntactically valid TSX for page and layout', () => {
    const files = renderSiteFiles(buildCompany(), buildContent());
    const page = files.find((file) => file.path === 'app/page.tsx')!;
    const layout = files.find((file) => file.path === 'app/layout.tsx')!;

    assertValidTsx(page.content);
    assertValidTsx(layout.content);
  });

  it('stays valid TSX even when AI content has quotes, backticks, and JSX-like text', () => {
    const tricky = buildContent({
      heroHeadline: `Diga "olá" \`aqui\` </div> {malicious}`,
      aboutText: "Texto com 'aspas simples' e \\barras\\ invertidas",
      services: ['<script>alert(1)</script>', 'Serviço "especial"'],
    });
    const files = renderSiteFiles(buildCompany(), tricky);
    const page = files.find((file) => file.path === 'app/page.tsx')!;

    assertValidTsx(page.content);
  });

  it('produces valid TSX for a company without whatsapp or rating', () => {
    const files = renderSiteFiles(
      buildCompany({ whatsapp: null, phone: null, rating: null }),
      buildContent(),
    );
    const page = files.find((file) => file.path === 'app/page.tsx')!;

    assertValidTsx(page.content);
    expect(page.content).not.toContain('wa.me');
  });

  it('produces a valid package.json', () => {
    const files = renderSiteFiles(buildCompany(), buildContent());
    const packageJson = files.find((file) => file.path === 'package.json')!;

    expect(() => {
      JSON.parse(packageJson.content);
    }).not.toThrow();
  });
});
