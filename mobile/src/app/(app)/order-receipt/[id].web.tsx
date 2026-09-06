import { Redirect } from 'expo-router';

export default function DisabledOrderReceiptWebScreen() {
  return (
    <Redirect
      href="/(app)/(tabs)/returns"
    />
  );
}