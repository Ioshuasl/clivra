'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { FileTextIcon, PencilIcon, PlusIcon } from 'lucide-react';
import {
  DOCUMENT_KINDS,
  DOCUMENT_KIND_LABELS,
} from '@/packages/operacional/enum/Document/DocumentKindEnum';
import { operacionalErrorMessage } from '@/packages/operacional/helpers/OperacionalErrorMessage';
import { useDocumentTemplateDeleteHook } from '@/packages/operacional/hooks/Document/useDocumentTemplateDeleteHook';
import { useDocumentTemplateListHook } from '@/packages/operacional/hooks/Document/useDocumentTemplateListHook';
import type { DocumentTemplateSummary } from '@/packages/operacional/types/Document/DocumentTypes';
import { DocumentQuoteContractCard } from '@/packages/operacional/components/Document/DocumentQuoteContractCard';
import { DocumentSettingCard } from '@/packages/operacional/components/Document/DocumentSettingCard';
import { DocumentCertificateCard } from '@/packages/operacional/components/Document/DocumentCertificateCard';
import { Can } from '@/shared/auth/Can';
import { ClivraPageHeader } from '@/shared/layout/ClivraPage';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Skeleton } from '@/shared/ui/skeleton';

const DocumentTemplateFormDialog = dynamic(
  () =>
    import('@/packages/operacional/components/Document/DocumentTemplateFormDialog').then(
      (m) => m.DocumentTemplateFormDialog,
    ),
  { ssr: false },
);

type EditTarget = { template?: DocumentTemplateSummary } | null;

const DENTIST_SIGNATURE_SUMMARY: Record<DocumentTemplateSummary['professionalSignature'], string | null> = {
  NONE: null,
  OPTIONAL: 'Assinatura digital do dentista: opcional',
  REQUIRED: 'Assinatura digital do dentista: obrigatória',
};

const PATIENT_SIGNATURE_SUMMARY: Record<DocumentTemplateSummary['patientSignature'], string | null> = {
  NONE: null,
  OPTIONAL: 'Assinatura do paciente: opcional',
  REQUIRED: 'Assinatura do paciente: obrigatória',
};

function signatureSummary(template: DocumentTemplateSummary): string {
  const parts = [
    DENTIST_SIGNATURE_SUMMARY[template.professionalSignature],
    PATIENT_SIGNATURE_SUMMARY[template.patientSignature],
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(' · ') : 'Sem assinatura';
}

function TemplateCard({
  template,
  onEdit,
}: {
  template: DocumentTemplateSummary;
  onEdit: () => void;
}) {
  const remove = useDocumentTemplateDeleteHook();
  const [confirming, setConfirming] = useState(false);

  return (
    <li className="flex min-w-0 flex-col gap-3 rounded-2xl border border-border bg-card p-4 shadow-[0_1px_2px_rgb(74_15_22/0.04)]">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground">
          <FileTextIcon className="size-4" strokeWidth={1.7} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{template.name}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{signatureSummary(template)}</p>
        </div>
        {template.systemKey ? <Badge variant="secondary">Modelo do sistema</Badge> : null}
      </div>

      <Can permission="settings.write">
        <div className="flex flex-wrap items-center justify-end gap-2">
          {confirming ? (
            <>
              <span className="mr-auto text-xs text-muted-foreground">
                Desativar? Documentos já emitidos não mudam.
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="cursor-pointer"
                onClick={() => setConfirming(false)}
              >
                Voltar
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                className="cursor-pointer"
                disabled={remove.isPending}
                onClick={() => remove.mutate(template.id)}
              >
                Sim, desativar
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="cursor-pointer text-muted-foreground"
                onClick={() => setConfirming(true)}
              >
                Desativar
              </Button>
              <Button type="button" variant="outline" size="sm" className="cursor-pointer" onClick={onEdit}>
                <PencilIcon className="size-3.5" strokeWidth={1.7} />
                Editar
              </Button>
            </>
          )}
        </div>
      </Can>
    </li>
  );
}

export function DocumentTemplateIndex() {
  const [editing, setEditing] = useState<EditTarget>(null);
  const templatesQuery = useDocumentTemplateListHook();
  const templates = templatesQuery.data ?? [];
  const hasSystemTemplate = templates.some((template) => template.systemKey);

  return (
    <div className="grid min-w-0 grid-cols-1 gap-5">
      <ClivraPageHeader
        title="Documentos"
        description="Os modelos de receita, atestado, termo e contrato da clínica. Escreva uma vez e emita para qualquer paciente."
        action={
          <Can permission="settings.write">
            <Button type="button" className="cursor-pointer" onClick={() => setEditing({})}>
              <PlusIcon className="size-4" strokeWidth={1.7} />
              Novo modelo
            </Button>
          </Can>
        }
      />

      <Can permission="clinical_records.write">
        <DocumentCertificateCard />
      </Can>

      <DocumentSettingCard />
      <DocumentQuoteContractCard />

      {hasSystemTemplate ? (
        <Alert role="note">
          <AlertDescription>
            Os modelos marcados como “Modelo do sistema” são um ponto de partida. Peça para o seu
            responsável técnico ou advogado revisar o texto antes de usar com pacientes.
          </AlertDescription>
        </Alert>
      ) : null}

      {templatesQuery.isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Skeleton className="h-24 rounded-2xl" />
          <Skeleton className="h-24 rounded-2xl" />
        </div>
      ) : templatesQuery.isError ? (
        <Alert variant="destructive">
          <AlertDescription>{operacionalErrorMessage(templatesQuery.error)}</AlertDescription>
        </Alert>
      ) : templates.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
          <p className="text-sm font-semibold text-foreground">Nenhum modelo ativo</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Clique em “Novo modelo” para criar o primeiro documento da clínica.
          </p>
        </div>
      ) : (
        DOCUMENT_KINDS.map((kind) => {
          const group = templates.filter((template) => template.kind === kind);
          if (group.length === 0) return null;
          return (
            <section key={kind} aria-labelledby={`kind-${kind}`} className="grid min-w-0 gap-2">
              <h2 id={`kind-${kind}`} className="text-sm font-semibold text-foreground">
                {DOCUMENT_KIND_LABELS[kind]}
              </h2>
              <ul className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
                {group.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    onEdit={() => setEditing({ template })}
                  />
                ))}
              </ul>
            </section>
          );
        })
      )}

      {editing ? (
        <DocumentTemplateFormDialog template={editing.template} onClose={() => setEditing(null)} />
      ) : null}
    </div>
  );
}
