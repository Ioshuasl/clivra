'use client';

import type { ReactNode } from 'react';
import { ClivraLogo } from '@/shared/brand/ClivraLogo';
import { CLIVRA } from '@/shared/brand/ClivraBrand';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';

type AuthCardProps = {
  title: string;
  description?: string;
  children: ReactNode;
};

export function AuthCard({ title, description, children }: AuthCardProps) {
  return (
    <main className="grid min-h-dvh place-items-center bg-background px-4 py-8">
      <div className="grid w-full max-w-md gap-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <ClivraLogo size={48} wordmark="burgundy" />
          <p className="text-xs tracking-wide text-muted-foreground uppercase">
            {CLIVRA.tagline}
          </p>
        </div>
        <Card className="w-full border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle role="heading" aria-level={1}>
              {title}
            </CardTitle>
            {description ? <CardDescription>{description}</CardDescription> : null}
          </CardHeader>
          <CardContent>{children}</CardContent>
        </Card>
      </div>
    </main>
  );
}
