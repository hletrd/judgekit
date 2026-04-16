"use client";

import Link from "next/link";
import { Code, Trophy, Users, MessageCircle, BookOpen, Send, Languages, Server } from "lucide-react";
import { Button } from "@/components/ui/button";

type HomeSection = {
  href: string;
  title: string;
  description: string;
  icon: "code" | "trophy" | "users" | "message";
};

type JudgeInfo = {
  title: string;
  description: string;
  viewDetails: string;
  languagesHref: string;
  stats: Array<{
    label: string;
    value: string;
  }>;
};

type PublicHomePageProps = {
  eyebrow: string;
  title: string;
  description: string;
  insights: Array<{
    label: string;
    value: string;
    description: string;
    icon: "problems" | "submissions" | "languages";
  }>;
  sections: HomeSection[];
  primaryCta: { href: string; label: string };
  secondaryCta?: { href: string; label: string } | null;
  judgeInfo: JudgeInfo;
};

const sectionIcons = {
  code: Code,
  trophy: Trophy,
  users: Users,
  message: MessageCircle,
} as const;

const insightIcons = {
  problems: BookOpen,
  submissions: Send,
  languages: Languages,
} as const;

export function PublicHomePage({
  eyebrow,
  title,
  description,
  insights,
  sections,
  primaryCta,
  secondaryCta,
  judgeInfo,
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

      <section className="grid gap-4 md:grid-cols-3">
        {insights.map((insight) => {
          const Icon = insightIcons[insight.icon];

          return (
            <div key={insight.label} className="rounded-2xl border bg-background p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-muted-foreground">{insight.label}</p>
                  <div className="mt-2 text-3xl font-semibold tracking-tight">{insight.value}</div>
                </div>
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Icon className="size-5" aria-hidden="true" />
                </div>
              </div>
              <div className="mb-3 h-2 overflow-hidden rounded-full bg-muted">
                <div className="h-full w-full rounded-full bg-gradient-to-r from-primary/60 via-primary to-primary/70" />
              </div>
              <p className="text-sm leading-6 text-muted-foreground">{insight.description}</p>
            </div>
          );
        })}
      </section>

      <section className="rounded-2xl border bg-background p-6 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Server className="size-5" aria-hidden="true" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold tracking-tight">{judgeInfo.title}</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">{judgeInfo.description}</p>
          </div>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          {judgeInfo.stats.map((stat) => (
            <div key={stat.label} className="rounded-xl border bg-muted/20 p-4">
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className="mt-1 text-2xl font-semibold tracking-tight">{stat.value}</p>
            </div>
          ))}
        </div>
        <div className="mt-4">
          <Link href={judgeInfo.languagesHref} className="group inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
            {judgeInfo.viewDetails}
            <span className="transition-transform group-hover:translate-x-0.5">&rarr;</span>
          </Link>
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
