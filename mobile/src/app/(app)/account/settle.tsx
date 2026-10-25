import { Redirect, useLocalSearchParams } from 'expo-router';

import SettlementScreen from '../../../features/customer-accounts/settlement-screen';
import { singleAccountParam } from '../../../features/customer-accounts/account-navigation';

export default function SettlePage() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = singleAccountParam(params.id);
  if (!id) return <Redirect href="/account/collect" />;
  return <SettlementScreen customerId={id} />;
}
