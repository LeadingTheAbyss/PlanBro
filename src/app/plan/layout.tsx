import { AppShell } from '@/components/layout/AppShell';
import { PlanThemeWrapper } from '@/components/layout/PlanThemeWrapper';

export default function PlanLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell>
      <PlanThemeWrapper>{children}</PlanThemeWrapper>
    </AppShell>
  );
}
