import Link from "next/link";

type HomeSection = {
  href: string;
  title: string;
  description: string;
};

type PublicHomePageProps = {
  eyebrow: string;
  title: string;
  description: string;
  sections: HomeSection[];
  primaryCta: { href: string; label: string };
  secondaryCta: { href: string; label: string };
};

export function PublicHomePage({
  eyebrow,
  title,
  description,
  sections,
  primaryCta,
  secondaryCta,
}: PublicHomePageProps) {
  return (
    <div className="space-y-10">
      <section className="rounded-3xl border bg-background px-6 py-10 shadow-sm sm:px-10">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-muted-foreground">{eyebrow}</p>
        <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">{title}</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">{description}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href={primaryCta.href} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            {primaryCta.label}
          </Link>
          <Link href={secondaryCta.href} className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground">
            {secondaryCta.label}
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {sections.map((section) => (
          <Link key={section.href} href={section.href} className="rounded-2xl border bg-background p-5 shadow-sm transition-colors hover:bg-accent/40">
            <div className="text-lg font-semibold tracking-tight">{section.title}</div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{section.description}</p>
          </Link>
        ))}
      </section>
    </div>
  );
}
