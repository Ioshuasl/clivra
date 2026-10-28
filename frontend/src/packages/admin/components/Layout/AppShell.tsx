'use client';

import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { AppHeader } from '@/packages/admin/components/Layout/AppHeader';
import { AppSidebar } from '@/packages/admin/components/Layout/AppSidebar';
import { ClivraShellProvider } from '@/packages/admin/components/Layout/ClivraShellContext';
import { SubscriptionBanner } from '@/packages/admin/components/Subscription/SubscriptionBanner';
import { OnboardingBanner } from '@/packages/admin/components/Onboarding/OnboardingBanner';
import { useClinicGetHook } from '@/packages/admin/hooks/Clinic/useClinicGetHook';
import { useAuth } from '@/shared/auth/AuthProvider';
import { Skeleton } from '@/shared/ui/skeleton';
import { TooltipProvider } from '@/shared/ui/tooltip';

type AppShellProps = {
  children: ReactNode;
  inboxBadgeCount?: number;
};

export function AppShell({ children, inboxBadgeCount = 0 }: AppShellProps) {
  const { ready, isAuthenticated } = useAuth();
  const router = useRouter();
  const clinicQuery = useClinicGetHook({ enabled: ready && isAuthenticated });

  useEffect(() => {
    if (ready && !isAuthenticated) {
      router.replace('/login');
    }
  }, [ready, isAuthenticated, router]);

  if (!ready || !isAuthenticated) {
    return (
      <div className="flex min-h-svh items-center justify-center bg-background p-6">
        <Skeleton className="h-8 w-40" />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <ClivraShellProvider>
        <div className="flex h-svh w-full min-w-0 overflow-hidden bg-background">
          <AppSidebar
            clinicName={clinicQuery.data?.name}
            inboxBadgeCount={inboxBadgeCount}
          />
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <AppHeader />
            <main className="flex min-h-0 w-full min-w-0 flex-1 flex-col gap-4 overflow-hidden bg-background px-5 py-4 sm:px-6 sm:py-5">
              <SubscriptionBanner />
              <OnboardingBanner />
              <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto">
                {children}
              </div>
            </main>
          </div>
        </div>
      </ClivraShellProvider>
    </TooltipProvider>
  );
}
