'use client';

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/shared/ui/alert-dialog';
import { Button } from '@/shared/ui/button';

type ClinicalNoteSignConfirmDialogProps = {
  content: string;
  isPending: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

/** Assinar é irreversível: mostra o texto final e pede confirmação explícita. */
export function ClinicalNoteSignConfirmDialog({
  content,
  isPending,
  onConfirm,
  onClose,
}: ClinicalNoteSignConfirmDialogProps) {
  return (
    <AlertDialog open onOpenChange={(open) => (!open && !isPending ? onClose() : undefined)}>
      <AlertDialogContent size="default" className="sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>Assinar esta evolução?</AlertDialogTitle>
          <AlertDialogDescription>
            Depois de assinada, ela não pode ser editada. Para corrigir, será criada uma nova versão.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <p className="max-h-40 overflow-auto whitespace-pre-wrap rounded-md border bg-muted/40 p-3 text-sm">
          {content}
        </p>
        <AlertDialogFooter>
          <AlertDialogCancel className="cursor-pointer" disabled={isPending}>
            Voltar e revisar
          </AlertDialogCancel>
          <Button type="button" className="cursor-pointer" disabled={isPending} onClick={onConfirm}>
            {isPending ? 'Assinando…' : 'Assinar evolução'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
