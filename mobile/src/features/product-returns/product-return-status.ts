import {
    ProductType,
    ReturnStatus,
} from './product-return-types';

export function getReturnStatusLabel(
  status: ReturnStatus,
) {
  switch (status) {
    case ReturnStatus.Pending:
      return 'Şəkil gözləyir';

    case ReturnStatus.Submitted:
      return 'Menecer təsdiqi';

    case ReturnStatus.Completed:
      return 'Sistemə işlənilib';

    case ReturnStatus.Cancelled:
      return 'Ləğv edilib';

    default:
      return 'Naməlum';
  }
}

export function getProductTypeLabel(
  productType: ProductType,
) {
  return productType === ProductType.Showcase
    ? 'Vitrin'
    : 'Vazvrad';
}

export function getReturnTypeSummary(
  productTypes: ProductType[],
) {
  const hasProduct = productTypes.includes(
    ProductType.Product,
  );

  const hasShowcase = productTypes.includes(
    ProductType.Showcase,
  );

  if (hasProduct && hasShowcase) {
    return 'Vazvrad və Vitrin';
  }

  return hasShowcase
    ? 'Vitrin'
    : 'Vazvrad';
}