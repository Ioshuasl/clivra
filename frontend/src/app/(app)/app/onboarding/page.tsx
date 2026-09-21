import { redirect } from 'next/navigation';
import { PRIMEIROS_PASSOS_PATH } from '@/packages/admin/enum/OnboardingStepEnum';

export default function OnboardingLegacyRedirectPage() {
  redirect(PRIMEIROS_PASSOS_PATH);
}
