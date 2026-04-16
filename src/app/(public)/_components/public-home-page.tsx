"use client";

import Link from "next/link";
import { Code, Trophy, Users, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

type HomeSection = {
  href: string;
  title: string;
  description: string;
  icon: "code" | "trophy" | "users" | "message";
};

type PublicHomePageProps = {
  eyebrow: string;
  title: string;
  description: string;
  sections: HomeSection[];
  primaryCta: { href: string; label: string };
  secondaryCta?: { href: string; label: string } | null;
};

const sectionIcons = {
  code: Code,
  trophy: Trophy,
  users: Users,
  message: MessageCircle,
} as const;

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
        <h1 className="mt-4 text-4xl font-semibold tracking-tight sm:text-5xl">{title}</h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">{description}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button render={<Link href={primaryCta.href} />}>{primaryCta.label}</Button>
          {secondaryCta ? (
            <Button variant="outline" render={<Link href={secondaryCta.href} />}>{secondaryCta.label}</Button>
          ) : null}
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {sections.map((section) => {
          const Icon = sectionIcons[section.icon];
          return (
            <Link key={section.href} href={section.href} className="group rounded-2xl border bg-background p-5 shadow-sm transition-all hover:shadow-md hover:bg-accent/40">
              {Icon && (
                <div className="mb-3 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="size-5" aria-hidden="true" />
                </div>
              )}
              <div className="text-lg font-semibold tracking-tight">{section.title}</div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{section.description}</p>
            </Link>
          );
        })}
      </section>
    </div>
  );
}
