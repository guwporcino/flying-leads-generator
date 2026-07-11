import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 bg-zinc-50 p-16 text-center dark:bg-black">
      <h1 className="text-2xl font-semibold tracking-tight text-black dark:text-zinc-50">
        Flying Leads Generator
      </h1>
      <p className="max-w-md text-sm text-zinc-600 dark:text-zinc-400">
        Dashboard em construção — Fase 1 do roadmap (Google Maps Search Engine). Ver ARCHITECTURE.md
        e ROADMAP.md na raiz do repositório.
      </p>
      <Link
        href="/campaigns/new"
        className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white dark:bg-white dark:text-black"
      >
        Nova campanha
      </Link>
    </div>
  );
}
