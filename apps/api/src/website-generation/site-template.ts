import { CompanySiteInput, GeneratedFile, GeneratedSiteContent } from './website-generation.types';

/**
 * Monta o file set de um site gerado — ver ADR 0010. Só `app/page.tsx` é
 * dinâmico; os demais arquivos são boilerplate estático idêntico para
 * qualquer lead. Valores de texto são embutidos via `JSON.stringify` (nunca
 * interpolados direto no JSX) para garantir que o arquivo gerado seja
 * sempre TSX sintaticamente válido, independentemente do conteúdo da IA.
 */
export function renderSiteFiles(
  company: CompanySiteInput,
  content: GeneratedSiteContent,
): GeneratedFile[] {
  return [
    { path: 'package.json', content: renderPackageJson() },
    { path: 'next.config.ts', content: renderNextConfig() },
    { path: 'tsconfig.json', content: renderTsConfig() },
    { path: 'postcss.config.mjs', content: renderPostcssConfig() },
    { path: 'app/globals.css', content: renderGlobalsCss() },
    { path: 'app/layout.tsx', content: renderLayout(content) },
    { path: 'app/page.tsx', content: renderPage(company, content) },
  ];
}

function renderPackageJson(): string {
  return `${JSON.stringify(
    {
      name: 'generated-site',
      version: '0.1.0',
      private: true,
      scripts: { dev: 'next dev', build: 'next build', start: 'next start' },
      dependencies: { next: '16.2.10', react: '19.2.4', 'react-dom': '19.2.4' },
      devDependencies: {
        '@tailwindcss/postcss': '^4',
        '@types/node': '^20',
        '@types/react': '^19',
        '@types/react-dom': '^19',
        tailwindcss: '^4',
        typescript: '^5',
      },
    },
    null,
    2,
  )}\n`;
}

function renderNextConfig(): string {
  return `import type { NextConfig } from "next";

const nextConfig: NextConfig = {};

export default nextConfig;
`;
}

function renderTsConfig(): string {
  return `${JSON.stringify(
    {
      compilerOptions: {
        target: 'ES2017',
        lib: ['dom', 'dom.iterable', 'esnext'],
        allowJs: true,
        skipLibCheck: true,
        strict: true,
        noEmit: true,
        esModuleInterop: true,
        module: 'esnext',
        moduleResolution: 'bundler',
        resolveJsonModule: true,
        isolatedModules: true,
        jsx: 'react-jsx',
        incremental: true,
        plugins: [{ name: 'next' }],
      },
      include: ['next-env.d.ts', '**/*.ts', '**/*.tsx', '.next/types/**/*.ts'],
      exclude: ['node_modules'],
    },
    null,
    2,
  )}\n`;
}

function renderPostcssConfig(): string {
  return `const config = { plugins: ["@tailwindcss/postcss"] };

export default config;
`;
}

function renderGlobalsCss(): string {
  return `@import "tailwindcss";\n`;
}

function renderLayout(content: GeneratedSiteContent): string {
  return `import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: ${JSON.stringify(content.seoTitle)},
  description: ${JSON.stringify(content.seoDescription)},
  openGraph: {
    title: ${JSON.stringify(content.seoTitle)},
    description: ${JSON.stringify(content.seoDescription)},
    locale: "pt_BR",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-white text-zinc-900 antialiased">{children}</body>
    </html>
  );
}
`;
}

function renderPage(company: CompanySiteInput, content: GeneratedSiteContent): string {
  const whatsappNumber = company.whatsapp?.replace(/\D/g, '') ?? null;
  const whatsappHref = whatsappNumber ? `https://wa.me/${whatsappNumber}` : null;

  return `const company = ${JSON.stringify(
    {
      name: company.name,
      category: company.category,
      phone: company.phone,
      whatsappHref,
      rating: company.rating,
      reviewCount: company.reviewCount,
      googleMapsUrl: company.googleMapsUrl,
    },
    null,
    2,
  )};

const content = ${JSON.stringify(content, null, 2)};

export default function Home() {
  return (
    <>
    <main className="mx-auto flex max-w-3xl flex-col gap-16 px-6 py-20">
      <header className="flex flex-col gap-4 text-center">
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
          {company.category}
        </p>
        <h1 className="text-4xl font-bold tracking-tight">{content.heroHeadline}</h1>
        <p className="text-lg text-zinc-600">{content.heroSubheadline}</p>
        {company.rating ? (
          <p className="text-sm text-zinc-500">
            <span aria-hidden="true">★</span> Nota {company.rating} · {company.reviewCount}{" "}
            avaliações no Google
          </p>
        ) : null}
      </header>

      <section className="flex flex-col gap-3">
        <h2 className="text-2xl font-semibold">Sobre</h2>
        <p className="text-zinc-700">{content.aboutText}</p>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-2xl font-semibold">Serviços</h2>
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {content.services.map((service: string) => (
            <li key={service} className="rounded-md border border-zinc-200 px-4 py-3">
              {service}
            </li>
          ))}
        </ul>
      </section>

      <section
        aria-label="Contato"
        className="flex flex-col items-center gap-4 rounded-lg bg-zinc-900 px-6 py-10 text-center text-white"
      >
        <h2 className="text-2xl font-semibold">{content.ctaText}</h2>
        <div className="flex flex-wrap justify-center gap-3">
          {company.whatsappHref ? (
            <a
              href={company.whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Conversar no WhatsApp"
              className="rounded-md bg-white px-5 py-2 font-medium text-zinc-900"
            >
              WhatsApp
            </a>
          ) : null}
          {company.phone ? (
            <a
              href={\`tel:\${company.phone}\`}
              aria-label={\`Ligar para \${company.phone}\`}
              className="rounded-md border border-white px-5 py-2 font-medium"
            >
              {company.phone}
            </a>
          ) : null}
          <a
            href={company.googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Ver localização no Google Maps"
            className="rounded-md border border-white px-5 py-2 font-medium"
          >
            Ver no mapa
          </a>
        </div>
      </section>
    </main>
    <footer className="mx-auto max-w-3xl px-6 pb-10 text-center text-sm text-zinc-500">
      <p>
        © {new Date().getFullYear()} {company.name}. Todos os direitos reservados.
      </p>
    </footer>
    </>
  );
}
`;
}
