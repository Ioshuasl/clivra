'use client';

import { adminErrorMessage } from '@/packages/admin/helpers/AdminErrorMessage';
import { useAnamnesisFormAssignmentListHook } from '@/packages/admin/hooks/AnamnesisForm/useAnamnesisFormAssignmentListHook';
import { useAnamnesisFormAssignmentUpdateHook } from '@/packages/admin/hooks/AnamnesisForm/useAnamnesisFormAssignmentUpdateHook';
import { useProfessionalListHook } from '@/packages/admin/hooks/Professional/useProfessionalListHook';
import { SettingsCard } from '@/packages/admin/components/Settings/SettingsCard';
import { Can } from '@/shared/auth/Can';
import { Alert, AlertDescription } from '@/shared/ui/alert';
import { NativeSelect, NativeSelectOption } from '@/shared/ui/native-select';

type AnamnesisFormAssignmentCardProps = {
  /** Nomes dos modelos em uso (um por nome, versão ativa). */
  formNames: string[];
  generalName: string;
};

export function AnamnesisFormAssignmentCard({
  formNames,
  generalName,
}: AnamnesisFormAssignmentCardProps) {
  const professionals = useProfessionalListHook();
  const assignments = useAnamnesisFormAssignmentListHook();
  const update = useAnamnesisFormAssignmentUpdateHook();

  const chosen = new Map((assignments.data ?? []).map((item) => [item.professionalId, item.formName]));
  const active = (professionals.data ?? []).filter((professional) => professional.active);

  return (
    <SettingsCard
      title="Quem usa cada modelo"
      description={`Cada profissional pode ter o seu questionário. Quem não escolher usa o modelo geral (${generalName}).`}
    >
      {professionals.isLoading || assignments.isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando profissionais…</p>
      ) : active.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum profissional ativo na clínica.</p>
      ) : (
        <ul className="grid gap-2">
          {active.map((professional) => {
            const current = chosen.get(professional.id);
            const value = current && formNames.includes(current) ? current : '';
            return (
              <li
                key={professional.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border px-4 py-3"
              >
                <span className="text-sm font-medium">{professional.name}</span>
                <Can
                  permission="settings.write"
                  fallback={<span className="text-sm text-muted-foreground">{value || generalName}</span>}
                >
                  <NativeSelect
                    aria-label={`Modelo de anamnese de ${professional.name}`}
                    value={value}
                    className="w-80"
                    disabled={update.isPending}
                    onChange={(event) =>
                      update.mutate({
                        professionalId: professional.id,
                        formName: event.target.value || null,
                      })
                    }
                  >
                    <NativeSelectOption value="">Modelo geral ({generalName})</NativeSelectOption>
                    {formNames
                      .filter((name) => name !== generalName)
                      .map((name) => (
                        <NativeSelectOption key={name} value={name}>
                          {name}
                        </NativeSelectOption>
                      ))}
                  </NativeSelect>
                </Can>
              </li>
            );
          })}
        </ul>
      )}
      {update.isError ? (
        <Alert variant="destructive" className="mt-3">
          <AlertDescription>{adminErrorMessage(update.error)}</AlertDescription>
        </Alert>
      ) : null}
    </SettingsCard>
  );
}
