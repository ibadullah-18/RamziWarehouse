import ReturnsBrowser from '../../../features/product-returns/returns-browser';
import { ReturnStatus } from '../../../features/product-returns/product-return-types';

export default function ReturnsScreen() {
  return (
    <ReturnsBrowser
      title="Vazvrad"
      description="Menecer təsdiqi gözləyən vazvrad və vitrinlər. Kod, partiya və ya müştəri adı ilə axtarın."
      allowCreate
      defaultStatus={ReturnStatus.Submitted}
    />
  );
}
