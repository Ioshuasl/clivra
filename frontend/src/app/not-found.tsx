import Link from 'next/link';
import { buttonVariants } from '@/shared/ui/button';
import { cn } from '@/shared/helpers/utils';

export const metadata = { title: 'Página não encontrada' };

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center bg-background px-4 py-8">
      <div className="grid max-w-md gap-4 text-center">
        <p className="text-sm font-semibold tracking-wide text-primary uppercase">Erro 404</p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Página não encontrada
        </h1>
        <p className="text-sm text-muted-foreground">
          O endereço que você abriu não existe ou foi removido. Volte ao início para continuar.
        </p>
        <div className="flex justify-center">
          <Link href="/app" className={cn(buttonVariants({ variant: 'default' }), 'cursor-pointer')}>
            Voltar ao início
          </Link>
        </div>
      </div>
    </main>
  );
}
