'use client';

import { clinicoErrorMessage } from '@/packages/clinico/helpers/ClinicoErrorMessage';
import {
  initialAnswers,
  visibleQuestions,
  type AnswerValue,
} from '@/packages/clinico/helpers/AnamnesisAnswerState';
import { useAnamnesisFormResolveHook } from '@/packages/clinico/hooks/Anamnesis/useAnamnesisFormResolveHook';
import { useAnamnesisListHook } from '@/packages/clinico/hooks/Anamnesis/useAnamnesisListHook';
import type { AnamnesisViewDialogProps } from '@/packages/clinico/types/Anamnesis/AnamnesisViewDialogTypes';
import { Can } from '@/shared/auth/Can';
import { cn } from '@/shared/helpers/utils';
import { MotionDialogBody } from '@/shared/motion/MotionDialogBody';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';

function AnswerView({ value }: { value: AnswerValue }) {
  if (value === undefined) return <span className="text-sm text-muted-foreground">Não respondida</span>;
  if (typeof value === 'string') return <span className="text-sm whitespace-pre-wrap">{value}</span>;
  const yes = typeof value === 'object' ? value.value : value;
  const text = typeof value === 'object' ? value.text : '';
  return (
    <span className="flex flex-wrap items-center gap-2">
      <Badge variant={yes ? 'default' : 'outline'}>{yes ? 'Sim' : 'Não'}</Badge>
      {text ? <span className="text-sm">{text}</span> : null}
    </span>
  );
}

export function AnamnesisViewDialog({
  patient,
  professionalId,
  onClose,
  onUpdate,
}: AnamnesisViewDialogProps) {
  const formQuery = useAnamnesisFormResolveHook(professionalId);
  const listQuery = useAnamnesisListHook(patient.id);

  const model = formQuery.data;
  const latest = listQuery.data?.[0];
  const questions = model ? visibleQuestions(model.questions, patient.sex) : [];
  const answers = initialAnswers(questions, latest?.answers);
  const loading = formQuery.isLoading || listQuery.isLoading;
  const loadError = formQuery.isError ? formQuery.error : listQuery.isError ? listQuery.error : null;

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
        <MotionDialogBody>
          <DialogHeader>
            <DialogTitle>Anamnese de {patient.socialName || patient.name}</DialogTitle>
            <DialogDescription>
              {latest
                ? `${latest.formName} · respondida em ${new Date(latest.answeredAt).toLocaleDateString('pt-BR')}`
                : 'Ficha de saúde do paciente.'}
            </DialogDescription>
          </DialogHeader>

          {loadError ? (
            <Alert variant="destructive" className="mt-4">
              <AlertDescription>{clinicoErrorMessage(loadError)}</AlertDescription>
            </Alert>
          ) : loading ? (
            <p className="mt-4 text-sm text-muted-foreground">Carregando anamnese…</p>
          ) : !latest ? (
            <p className="mt-4 text-sm text-muted-foreground">
              Este paciente ainda não respondeu a anamnese.
            </p>
          ) : (
            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              {questions.map((question) => (
                <div
                  key={question.id}
                  className={cn(
                    'grid content-start gap-1.5 rounded-lg border border-border p-3',
                    question.type === 'TEXT' && 'sm:col-span-2',
                  )}
                >
                  <dt className="text-xs font-medium text-muted-foreground">{question.label}</dt>
                  <dd>
                    <AnswerView value={answers[question.id]} />
                  </dd>
                </div>
              ))}
            </dl>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Fechar
            </Button>
            <Can permission="clinical_records.write">
              <Button type="button" disabled={loading} onClick={onUpdate}>
                {latest ? 'Atualizar anamnese' : 'Responder anamnese'}
              </Button>
            </Can>
          </DialogFooter>
        </MotionDialogBody>
      </DialogContent>
    </Dialog>
  );
}
