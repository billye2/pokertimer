import Link from "next/link";

export function AppHeader({ right }: { right?: React.ReactNode }) {
  return (
    <header className="border-b border-border/60 bg-background/80 backdrop-blur sticky top-0 z-40">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="text-primary text-xl leading-none">♠</span>
          <span>Shuffle Up</span>
        </Link>
        <nav className="flex items-center gap-4 text-sm text-muted-foreground">
          <Link href="/structures" className="hover:text-foreground transition-colors">
            Structures
          </Link>
          <Link href="/chipsets" className="hover:text-foreground transition-colors">
            Chips
          </Link>
          {right}
        </nav>
      </div>
    </header>
  );
}
