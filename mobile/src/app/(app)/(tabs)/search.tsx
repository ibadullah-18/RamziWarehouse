import ReturnsBrowser from '../../../features/product-returns/returns-browser';

export default function SearchScreen() {
  return (
    <ReturnsBrowser
      title="Axtarış"
      description="Koda görə axtarın: 1019 yazanda tərkibində 1019 olan bütün vazvrad və vitrinlər çıxır. İstəsəniz müştəri də seçin."
      allowCustomerFilter
      allowAcceptedDate
    />
  );
}
