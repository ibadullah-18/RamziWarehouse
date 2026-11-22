import { useLocalSearchParams } from 'expo-router';

import { AccountPageShell } from '../../features/customer-accounts/account-ui';
import { HandoverList } from '../../features/handovers/handover-list';

/** Every handover of a day (opened from a notification or the admin panel). */
export default function HandoversScreen() {
  const params = useLocalSearchParams<{ date?: string; focus?: string }>();
  const date = typeof params.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(params.date) ? params.date : undefined;
  return (
    <AccountPageShell title="Mal təhvil" subtitle="Bütün təhvillər">
      <HandoverList mine={false} initialDate={date} focusId={typeof params.focus === 'string' ? params.focus : undefined} />
    </AccountPageShell>
  );
}
