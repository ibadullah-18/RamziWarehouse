import { useLocalSearchParams } from 'expo-router';
import AccountScreen from '../../../features/customer-accounts/account-screen';
const modes = ['daily', 'customers', 'detail', 'history', 'reports', 'report', 'debt', 'old', 'correct', 'payment'] as const;
export default function AccountPage() { const { screen } = useLocalSearchParams<{
    screen: string;
}>(); const mode = modes.find(m => m === screen) ?? 'home'; return <AccountScreen key={screen} mode={mode}/>; }
