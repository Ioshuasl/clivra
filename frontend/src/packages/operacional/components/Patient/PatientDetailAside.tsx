'use client';

import Link from 'next/link';
import {
  formatCpfMask,
  formatPhoneMask,
} from '@/packages/operacional/helpers/FormatPatientContact';
import type { LegalGuardianSummary } from '@/packages/operacional/types/Patient/PatientTypes';
import { Can } from '@/shared/auth/Can';
import { Button } from '@/shared/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/ui/card';

export type PatientDetailTab =
  | 'dados'
  | 'responsaveis'
  | 'consentimentos'
  | 'timeline'
  | 'orcamentos'
  | 'financeiro'
  | 'prontuario'
  | 'documentos';

type PatientDetailAsideProps = {
  tab: PatientDetailTab;
  patientId: string;
  patientActive: boolean;
  guardians: LegalGuardianSummary[];
  confirmFuture: boolean;
  deactivatePending: boolean;
  onDeactivate: () => void;
  onNewQuote?: () => void;
  onSendAnamnesis?: () => void;
};

function AsideHint({ title, children }: { title: string; children: string }) {
  return (
    <div className="grid gap-1 border-t border-border pt-3">
      <p className="text-sm font-semibold text-foreground">{title}</p>
      <p className="text-xs text-muted-foreground">{children}</p>
    </div>
  );
}

export function PatientDetailAside({
  tab,
  patientId,
  patientActive,
  guardians,
  confirmFuture,
  deactivatePending,
  onDeactivate,
  onNewQuote,
  onSendAnamnesis,
}: PatientDetailAsideProps) {
  const primaryGuardian = guardians[0];

  return (
    <aside className="hidden w-[360px] shrink-0 lg:block">
      <div className="sticky top-4 z-10 max-h-[calc(100vh-2rem)] overflow-auto">
        <Card>
          <CardHeader className="border-b border-border">
            <CardTitle>Ações rápidas</CardTitle>
            <CardDescription>
              Atendimento e comunicação sem sair da ficha.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            {tab === 'orcamentos' ? (
              <Can permission="quotes.write">
                <Button
                  type="button"
                  className="cursor-pointer"
                  onClick={onNewQuote}
                >
                  Novo orçamento
                </Button>
              </Can>
            ) : null}

            {tab === 'financeiro' ? (
              <Can permission="finance.write">
                <Button
                  type="button"
                  className="cursor-pointer"
                  nativeButton={false}
                  render={<Link href="/app/financeiro" prefetch={false} />}
                >
                  Receber agora
                </Button>
              </Can>
            ) : null}

            {tab === 'prontuario' ? (
              <>
                <Button
                  type="button"
                  className="cursor-pointer"
                  nativeButton={false}
                  render={
                    <Link
                      href={`/app/agenda?patientId=${encodeURIComponent(patientId)}`}
                      prefetch={false}
                    />
                  }
                >
                  Abrir atendimento
                </Button>
                <Can permission="clinical_records.write">
                  <Button
                    type="button"
                    variant="outline"
                    className="cursor-pointer"
                    onClick={onSendAnamnesis}
                  >
                    Enviar anamnese
                  </Button>
                </Can>
              </>
            ) : null}

            {tab !== 'orcamentos' && tab !== 'financeiro' && tab !== 'prontuario' ? (
              <Button
                type="button"
                className="cursor-pointer"
                nativeButton={false}
                render={
                  <Link
                    href={`/app/agenda?patientId=${encodeURIComponent(patientId)}`}
                    prefetch={false}
                  />
                }
              >
                Agendar consulta
              </Button>
            ) : null}

            {tab === 'orcamentos' || tab === 'financeiro' ? (
              <Button
                type="button"
                variant="outline"
                className="cursor-pointer"
                nativeButton={false}
                render={
                  <Link
                    href={`/app/agenda?patientId=${encodeURIComponent(patientId)}`}
                    prefetch={false}
                  />
                }
              >
                Agendar consulta
              </Button>
            ) : null}

            <Can permission="messaging.write">
              <Button
                type="button"
                variant="outline"
                className="cursor-pointer"
                nativeButton={false}
                render={
                  <Link
                    href={`/app/inbox?patientId=${encodeURIComponent(patientId)}`}
                    prefetch={false}
                  />
                }
              >
                Enviar WhatsApp
              </Button>
            </Can>

            {tab !== 'orcamentos' ? (
              <Can permission="quotes.write">
                <Button
                  type="button"
                  variant="outline"
                  className="cursor-pointer"
                  onClick={onNewQuote}
                >
                  Novo orçamento
                </Button>
              </Can>
            ) : null}

            <Can permission="audit.read">
              <Button
                type="button"
                variant="ghost"
                className="cursor-pointer"
                nativeButton={false}
                render={
                  <Link
                    href={`/app/configuracoes/auditoria?patientId=${encodeURIComponent(patientId)}`}
                    prefetch={false}
                  />
                }
              >
                Ver acessos
              </Button>
            </Can>

            {tab === 'responsaveis' ? (
              <AsideHint title="Dica">
                Sem responsável, o envio de orçamento para aprovação do paciente fica bloqueado.
              </AsideHint>
            ) : null}

            {tab === 'consentimentos' ? (
              <AsideHint title="Revogação">
                Revogar gera novo registro; o histórico permanece auditável.
              </AsideHint>
            ) : null}

            {tab === 'timeline' ? (
              <AsideHint title="Fontes">
                A lista inclui agenda, orçamentos e mensagens conforme suas permissões.
              </AsideHint>
            ) : null}

            {tab === 'orcamentos' ? (
              <AsideHint title="Menor de idade">
                Envio para aprovação do paciente exige responsável legal cadastrado.
              </AsideHint>
            ) : null}

            {tab === 'financeiro' ? (
              <AsideHint title="Escopo da aba">
                Resumo e atalho. Caixa e relatórios ficam em Financeiro.
              </AsideHint>
            ) : null}

            {tab === 'prontuario' ? (
              <AsideHint title="Segurança">
                Dado clínico sensível: exige permissão de prontuário.
              </AsideHint>
            ) : null}

            {primaryGuardian && (tab === 'dados' || tab === 'responsaveis') ? (
              <div className="grid gap-1 rounded-lg bg-muted/60 px-3 py-3">
                <p className="text-xs font-semibold text-muted-foreground">Responsável</p>
                <p className="text-sm font-semibold text-foreground">{primaryGuardian.name}</p>
                <p className="text-xs text-muted-foreground">
                  {[
                    primaryGuardian.relationship,
                    primaryGuardian.phone
                      ? formatPhoneMask(primaryGuardian.phone)
                      : null,
                    primaryGuardian.cpf ? formatCpfMask(primaryGuardian.cpf) : null,
                  ]
                    .filter(Boolean)
                    .join(' · ') || '—'}
                </p>
              </div>
            ) : null}

            {patientActive ? (
              <Button
                type="button"
                variant={confirmFuture ? 'destructive' : 'outline'}
                className={
                  confirmFuture
                    ? 'mt-1 cursor-pointer'
                    : 'mt-1 cursor-pointer border-destructive/40 text-destructive hover:bg-destructive/10'
                }
                disabled={deactivatePending}
                onClick={onDeactivate}
              >
                {confirmFuture ? 'Confirmar inativação' : 'Inativar paciente'}
              </Button>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </aside>
  );
}
