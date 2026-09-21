import { Suspense } from 'react';
import { RevenueIndex } from '@/packages/admin/components/Report/RevenueIndex';

export default function RelatoriosReceitaPage() {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Carregando…</p>}>
      <RevenueIndex />
    </Suspense>
  );
}
