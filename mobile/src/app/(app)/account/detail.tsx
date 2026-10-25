import { Redirect, useLocalSearchParams } from 'expo-router';

import CustomerDetailScreen from '../../../features/customer-accounts/customer-detail-screen';
import { singleAccountParam } from '../../../features/customer-accounts/account-navigation';

export default function CustomerDetailPage() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = singleAccountParam(params.id);
  if (!id) return <Redirect href="/account/reports" />;
  return <CustomerDetailScreen customerId={id} />;
}
