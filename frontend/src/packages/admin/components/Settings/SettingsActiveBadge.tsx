import { SubscriptionToneBadge } from '@/packages/admin/components/Subscription/SubscriptionToneBadge';

export function SettingsActiveBadge({ active, female }: { active: boolean; female?: boolean }) {
  return (
    <SubscriptionToneBadge tone={active ? 'success' : 'neutral'}>
      {active ? (female ? 'Ativa' : 'Ativo') : female ? 'Inativa' : 'Inativo'}
    </SubscriptionToneBadge>
  );
}
