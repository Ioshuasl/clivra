'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { PencilIcon, PlusIcon } from 'lucide-react';
import { AnamnesisFormAssignmentCard } from '@/packages/admin/components/AnamnesisForm/AnamnesisFormAssignmentCard';
import { AnamnesisFormPreview } from '@/packages/admin/components/AnamnesisForm/AnamnesisFormPreview';
import { SettingsCard } from '@/packages/admin/components/Settings/SettingsCard';
import { adminErrorMessage } from '@/packages/admin/helpers/AdminErrorMessage';
import { useAnamnesisFormAssignmentListHook } from '@/packages/admin/hooks/AnamnesisForm/useAnamnesisFormAssignmentListHook';
import { useAnamnesisFormListHook } from '@/packages/admin/hooks/AnamnesisForm/useAnamnesisFormListHook';
import { useProfessionalListHook } from '@/packages/admin/hooks/Professional/useProfessionalListHook';
import type { AnamnesisFormSummary } from '@/packages/admin/types/AnamnesisForm/AnamnesisFormTypes';
import { Can } from '@/shared/auth/Can';
import { ClivraPageHeader } from '@/shared/layout/ClivraPage';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';

const GENERAL_NAME = 'Anamnese Geral';

const AnamnesisFormFormDialog = dynamic(
  () =>
    import('@/packages/admin/components/AnamnesisForm/AnamnesisFormFormDialog').then(
      (m) => m.AnamnesisFormFormDialog,
    ),
  { ssr: false },
);

type EditTarget = { source?: AnamnesisFormSummary } | null;

export function AnamnesisFormIndex() {
  const [editing, setEditing] = useState<EditTarget>(null);
  const [openName, setOpenName] = useState<string | null>(null);
  const formsQuery = useAnamnesisFormListHook();
  const assignments = useAnamnesisFormAssignmentListHook();
  const professionals = useProfessionalListHook();

  // Um modelo por nome: a versão em uso (as anteriores ficam guardadas só no banco).
  const models = (formsQuery.data ?? []).filter((form) => form.active);
  const generalName = models.some((model) => model.name === GENERAL_NAME)
    ? GENERAL_NAME
    : (models[0]?.name ?? GENERAL_NAME);

  const usedBy = (name: string): string => {
    const direct = (assignments.data ?? [])
      .filter((item) => item.formName === name)
      .map((item) => professionals.data?.find((professional) => professional.id === item.professionalId)?.name)
      .filter(Boolean);
    return direct.length > 0 ? `Usado por ${direct.join(', ')}` : '';
  };

  return (
    <div className="grid min-w-0 gap-5">
      <ClivraPageHeader
        title="Anamnese"
        description="Os questionários de saúde que o paciente responde. Crie um modelo para cada necessidade e escolha quem usa cada um."
        action={
          <Can permission="settings.write">
            <Button type="button" onClick={() => setEditing({})} className="cursor-pointer">
              <PlusIcon className="size-4" strokeWidth={1.7} />
              Novo modelo
            </Button>
          </Can>
        }
      />

      {formsQuery.isLoading ? (
        <SettingsCard title="Carregando…">
          <p className="text-sm text-muted-foreground">Buscando os modelos da clínica.</p>
        </SettingsCard>
      ) : formsQuery.isError ? (
        <Alert variant="destructive">
          <AlertDescription>{adminErrorMessage(formsQuery.error)}</AlertDescription>
        </Alert>
      ) : models.length === 0 ? (
        <SettingsCard
          title="Nenhum modelo ainda"
          description="Clique em “Novo modelo” para montar a primeira anamnese."
        >
          <p className="text-sm text-muted-foreground">Você pode começar com perguntas prontas.</p>
        </SettingsCard>
      ) : (
        <>
          {models.map((model) => {
            const open = openName === model.name;
            const users = usedBy(model.name);
            return (
              <SettingsCard
                key={model.id}
                title={model.name}
                description={[
                  `${model.questions.length} ${model.questions.length === 1 ? 'pergunta' : 'perguntas'} · versão ${model.version}`,
                  users,
                ]
                  .filter(Boolean)
                  .join(' · ')}
                action={
                  <div className="flex items-center gap-2">
                    {model.name === generalName ? <Badge variant="secondary">Modelo geral</Badge> : null}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="cursor-pointer"
                      onClick={() => setOpenName(open ? null : model.name)}
                    >
                      {open ? 'Ocultar perguntas' : 'Ver perguntas'}
                    </Button>
                    <Can permission="settings.write">
                      <Button
                        type="button"
                        size="sm"
                        className="cursor-pointer"
                        onClick={() => setEditing({ source: model })}
                      >
                        <PencilIcon className="size-4" strokeWidth={1.7} />
                        Editar
                      </Button>
                    </Can>
                  </div>
                }
              >
                {open ? (
                  <AnamnesisFormPreview questions={model.questions} />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {model.questions
                      .slice(0, 3)
                      .map((question) => question.label)
                      .join(' · ')}
                    {model.questions.length > 3 ? '…' : ''}
                  </p>
                )}
              </SettingsCard>
            );
          })}

          <AnamnesisFormAssignmentCard
            formNames={models.map((model) => model.name)}
            generalName={generalName}
          />
        </>
      )}

      {editing ? (
        <AnamnesisFormFormDialog source={editing.source} onClose={() => setEditing(null)} />
      ) : null}
    </div>
  );
}
