import type {
    OrderReceipt,
} from './order-receipt-types';

function escapeHtml(
  value: string | null | undefined,
): string {
  if (!value) {
    return '';
  }

  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function parseUtcDate(
  value: string,
): Date {
  const hasTimeZone =
    /(?:Z|[+-]\d{2}:\d{2})$/i.test(
      value,
    );

  return new Date(
    hasTimeZone
      ? value
      : `${value}Z`,
  );
}

function formatDate(
  value: string,
): string {
  const date = parseUtcDate(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return new Intl.DateTimeFormat(
    'az-AZ',
    {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'Asia/Baku',
    },
  ).format(date);
}

function formatDateTime(
  value: string,
): string {
  const date = parseUtcDate(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return new Intl.DateTimeFormat(
    'az-AZ',
    {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: 'Asia/Baku',
    },
  ).format(date);
}

export function getReceiptPdfHeight(
  receipt: OrderReceipt,
): number {
  const noteHeight =
    receipt.orderNote ||
    receipt.deliveryNote
      ? 170
      : 0;

  return Math.max(
    900,
    720 +
      receipt.items.length * 58 +
      noteHeight,
  );
}

export function createReceiptMessage(
  receipt: OrderReceipt,
): string {
  return [
    `Salam, ${receipt.customerName}.`,
    '',
    `GrandWall qaiməsi №${receipt.orderNumber}`,
    `Tarix: ${formatDate(receipt.orderDateUtc)}`,
    `Anbar: ${receipt.warehouseName}`,
    `Ümumi məhsul sayı: ${receipt.totalQuantity} ədəd`,
    '',
    'Qaimə PDF faylı olaraq əlavə edilib.',
  ].join('\n');
}

export function createOrderReceiptHtml(
  receipt: OrderReceipt,
): string {
  const productRows =
    receipt.items
      .map(
        item => `
          <tr>
            <td class="line">
              ${item.lineNumber}
            </td>

            <td>
              <strong>
                ${escapeHtml(item.productCode)}
              </strong>

              <div class="secondary">
                ${escapeHtml(item.productTypeName)}
              </div>
            </td>

            <td>
              ${escapeHtml(item.partyNumber)}
            </td>

            <td class="quantity">
              ${item.quantity}
            </td>
          </tr>
        `,
      )
      .join('');

  const orderNote = receipt.orderNote
    ? `
      <div class="note">
        <strong>Qaimə qeydi</strong>
        <div>${escapeHtml(receipt.orderNote)}</div>
      </div>
    `
    : '';

  const deliveryNote = receipt.deliveryNote
    ? `
      <div class="note">
        <strong>Təhvil qeydi</strong>
        <div>${escapeHtml(receipt.deliveryNote)}</div>
      </div>
    `
    : '';

  return `
    <!DOCTYPE html>

    <html lang="az">
      <head>
        <meta charset="UTF-8" />

        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0"
        />

        <style>
          @page {
            margin: 0;
          }

          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            padding: 18px;
            color: #111827;
            background: #ffffff;
            font-family:
              "Courier New",
              Courier Courier,
              monospace;
            font-size: 12px;
          }

          .receipt {
            width: 100%;
          }

          .brand {
            text-align: center;
            font-size: 23px;
            font-weight: 800;
            letter-spacing: 1.5px;
          }

          .subtitle {
            margin-top: 5px;
            color: #64748b;
            text-align: center;
            font-size: 11px;
            letter-spacing: 1px;
          }

          .separator {
            margin: 16px 0;
            border-top: 1px dashed #64748b;
          }

          .row {
            display: flex;
            justify-content: space-between;
            gap: 12px;
            margin-top: 7px;
          }

          .row-label {
            color: #64748b;
          }

          .row-value {
            max-width: 62%;
            text-align: right;
            font-weight: 700;
          }

          table {
            width: 100%;
            border-collapse: collapse;
          }

          th {
            padding: 8px 3px;
            border-top: 1px dashed #64748b;
            border-bottom: 1px dashed #64748b;
            color: #475569;
            text-align: left;
            font-size: 10px;
          }

          td {
            padding: 10px 3px;
            border-bottom: 1px dotted #cbd5e1;
            vertical-align: top;
          }

          .line {
            width: 22px;
            color: #64748b;
          }

          .secondary {
            margin-top: 3px;
            color: #64748b;
            font-size: 10px;
          }

          .quantity {
            text-align: right;
            font-weight: 800;
          }

          .total {
            display: flex;
            justify-content: space-between;
            margin-top: 15px;
            padding: 12px 0;
            border-top: 2px solid #111827;
            border-bottom: 2px solid #111827;
            font-size: 15px;
            font-weight: 800;
          }

          .note {
            margin-top: 12px;
            padding: 10px;
            border: 1px dashed #94a3b8;
            line-height: 1.5;
          }

          .note strong {
            display: block;
            margin-bottom: 5px;
          }

          .execution {
            line-height: 1.55;
          }

          .footer {
            margin-top: 18px;
            color: #64748b;
            text-align: center;
            line-height: 1.6;
          }
        </style>
      </head>

      <body>
        <main class="receipt">
          <div class="brand">
            GRANDWALL
          </div>

          <div class="subtitle">
            TƏHVİL QAİMƏSİ
          </div>

          <div class="separator"></div>

          <div class="row">
            <span class="row-label">
              Qaimə
            </span>

            <span class="row-value">
              №${escapeHtml(receipt.orderNumber)}
            </span>
          </div>

          <div class="row">
            <span class="row-label">
              Tarix
            </span>

            <span class="row-value">
              ${formatDate(receipt.orderDateUtc)}
            </span>
          </div>

          <div class="row">
            <span class="row-label">
              Müştəri
            </span>

            <span class="row-value">
              ${escapeHtml(receipt.customerName)}
            </span>
          </div>

          <div class="row">
            <span class="row-label">
              Telefon
            </span>

            <span class="row-value">
              ${escapeHtml(receipt.customerPhoneNumber)}
            </span>
          </div>

          <div class="row">
            <span class="row-label">
              Anbar
            </span>

            <span class="row-value">
              ${escapeHtml(receipt.warehouseName)}
            </span>
          </div>

          <div class="separator"></div>

          <table>
            <thead>
              <tr>
                <th>№</th>
                <th>Məhsul</th>
                <th>Partiya</th>
                <th style="text-align:right">
                  Ədəd
                </th>
              </tr>
            </thead>

            <tbody>
              ${productRows}
            </tbody>
          </table>

          <div class="total">
            <span>ÜMUMİ</span>
            <span>${receipt.totalQuantity} ƏDƏD</span>
          </div>

          ${orderNote}
          ${deliveryNote}

          <div class="separator"></div>

          <div class="execution">
            <div class="row">
              <span class="row-label">
                Yaratdı
              </span>

              <span class="row-value">
                ${escapeHtml(receipt.createdByFullName)}
              </span>
            </div>

            <div class="row">
              <span class="row-label">
                Hazırladı
              </span>

              <span class="row-value">
                ${escapeHtml(
                  receipt.preparedByFullName ?? '—',
                )}
              </span>
            </div>

            <div class="row">
              <span class="row-label">
                Təhvil verdi
              </span>

              <span class="row-value">
                ${escapeHtml(receipt.deliveredByFullName)}
              </span>
            </div>

            <div class="row">
              <span class="row-label">
                Təhvil vaxtı
              </span>

              <span class="row-value">
                ${formatDateTime(receipt.deliveredAtUtc)}
              </span>
            </div>
          </div>

          <div class="footer">
            GrandWall<br />
            Qaimə yaradıldı:
            ${formatDateTime(receipt.generatedAtUtc)}
          </div>
        </main>
      </body>
    </html>
  `;
}