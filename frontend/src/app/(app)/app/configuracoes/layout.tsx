import type { ReactNode } from 'react';
import { SettingsShell } from '@/packages/admin/components/Settings/SettingsShell';

export default function ConfiguracoesLayout({ children }: { children: ReactNode }) {
  return <SettingsShell>{children}</SettingsShell>;
}
