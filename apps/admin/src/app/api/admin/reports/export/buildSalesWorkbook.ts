/* eslint-disable i18next/no-literal-string */
import ExcelJS from "exceljs";

const SUPABASE_URL =
  process.env["SUPABASE_URL_INTERNAL"] || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const RECEIPT_CELL_WIDTH = 20;
const RECEIPT_IMG_WIDTH = 140;
const RECEIPT_IMG_HEIGHT = 100;
const COL_WIDTH_DEFAULT = 20;
const COL_WIDTH_WIDE = 30;
const ROW_HEIGHT_DEFAULT = 20;
const ROW_HEIGHT_WITH_IMAGE = 80;

const ORDER_ID_HEADER = "Order ID";
const DATE_HEADER = "Date";
const BUYER_EMAIL_HEADER = "Buyer Email";
const SELLER_EMAIL_HEADER = "Seller Email";
const RECEIPT_HEADER = "Receipt";

const WIDE_HEADERS = new Set([
  ORDER_ID_HEADER,
  DATE_HEADER,
  BUYER_EMAIL_HEADER,
  SELLER_EMAIL_HEADER,
]);

export interface OrderItemRow {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  currency: string;
  products: { name: string } | null;
}

export interface OrderRow {
  id: string;
  created_at: string;
  payment_status: string;
  total: number;
  currency: string;
  transfer_number: string | null;
  receipt_url: string | null;
  user_id: string;
  seller_id: string | null;
  buyer_info: Record<string, string> | null;
}

export interface UserProfileRow {
  id: string;
  email: string;
  display_name: string | null;
}

export const CONTENT_TYPE_XLSX =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

const STATIC_HEADERS = [
  ORDER_ID_HEADER,
  DATE_HEADER,
  "Status",
  BUYER_EMAIL_HEADER,
  "Buyer Name",
  SELLER_EMAIL_HEADER,
  "Seller Name",
  "Product",
  "Qty",
  "Unit Price",
  "Currency",
  "Order Total",
  "Transfer #",
  RECEIPT_HEADER,
] as const;

async function fetchReceiptImage(storagePath: string): Promise<Buffer | null> {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return null;
  try {
    const url = `${SUPABASE_URL}/storage/v1/object/receipts/${storagePath}`;
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${SERVICE_ROLE_KEY}` },
    });
    if (!response.ok) return null;
    return Buffer.from(await response.arrayBuffer());
  } catch {
    return null;
  }
}

function getImageExtension(storagePath: string): "jpeg" | "png" | "gif" {
  const lower = storagePath.toLowerCase();
  if (lower.endsWith(".png")) return "png";
  if (lower.endsWith(".gif")) return "gif";
  return "jpeg";
}

function collectBuyerInfoKeys(orders: OrderRow[]): string[] {
  const seen = new Set<string>();
  const keys: string[] = [];
  for (const order of orders) {
    if (!order.buyer_info) continue;
    for (const key of Object.keys(order.buyer_info)) {
      if (!seen.has(key)) {
        seen.add(key);
        keys.push(key);
      }
    }
  }
  return keys;
}

function getColumnWidth(
  header: string,
  index: number,
  buyerInfoStart: number,
): number {
  if (header === RECEIPT_HEADER) return RECEIPT_CELL_WIDTH;
  if (WIDE_HEADERS.has(header) || index >= buyerInfoStart)
    return COL_WIDTH_WIDE;
  return COL_WIDTH_DEFAULT;
}

function buildSheetColumns(buyerInfoKeys: string[]): Partial<ExcelJS.Column>[] {
  const allHeaders = [...STATIC_HEADERS, ...buyerInfoKeys];
  const buyerInfoStart = STATIC_HEADERS.length;
  return allHeaders.map((header, index) => ({
    header,
    key: `col_${index}`,
    width: getColumnWidth(header, index, buyerInfoStart),
  }));
}

function buildStaticCellValues(
  order: OrderRow,
  buyer: UserProfileRow | undefined,
  seller: UserProfileRow | undefined,
): Record<string, string | number> {
  return {
    col_0: order.id,
    col_1: new Date(order.created_at).toLocaleString(),
    col_2: order.payment_status,
    col_3: buyer?.email ?? "",
    col_4: buyer?.display_name ?? "",
    col_5: seller?.email ?? "",
    col_6: seller?.display_name ?? "",
    col_11: order.total,
    col_12: order.transfer_number ?? "",
    col_13: "",
  };
}

function buildBuyerInfoCellValues(
  order: OrderRow,
  buyerInfoKeys: string[],
): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [i, key] of buyerInfoKeys.entries()) {
    result[`col_${STATIC_HEADERS.length + i}`] = order.buyer_info?.[key] ?? "";
  }
  return result;
}

async function addReceiptImage(
  workbook: ExcelJS.Workbook,
  sheet: ExcelJS.Worksheet,
  receiptUrl: string,
  rowNumber: number,
  receiptColIndex: number,
): Promise<void> {
  const imgBuffer = await fetchReceiptImage(receiptUrl);
  if (!imgBuffer) return;
  const imageId = workbook.addImage({
    buffer: imgBuffer as unknown as ArrayBuffer,
    extension: getImageExtension(receiptUrl),
  });
  sheet.addImage(imageId, {
    tl: { col: receiptColIndex - 1, row: rowNumber - 1 },
    ext: { width: RECEIPT_IMG_WIDTH, height: RECEIPT_IMG_HEIGHT },
  });
}

async function addOrderRows(
  workbook: ExcelJS.Workbook,
  sheet: ExcelJS.Worksheet,
  order: OrderRow,
  buyer: UserProfileRow | undefined,
  seller: UserProfileRow | undefined,
  itemsByOrder: Map<string, OrderItemRow[]>,
  buyerInfoKeys: string[],
  receiptColIndex: number,
): Promise<void> {
  const staticValues = buildStaticCellValues(order, buyer, seller);
  const buyerInfoValues = buildBuyerInfoCellValues(order, buyerInfoKeys);
  const orderItems = itemsByOrder.get(order.id) ?? [];

  const rowItems =
    orderItems.length === 0
      ? [{ name: "", qty: 0, price: 0, currency: order.currency }]
      : orderItems.map((item) => ({
          name: item.products?.name ?? "",
          qty: item.quantity,
          price: item.unit_price,
          currency: item.currency,
        }));

  for (const item of rowItems) {
    const row = sheet.addRow({
      ...staticValues,
      col_7: item.name,
      col_8: item.qty,
      col_9: item.price,
      col_10: item.currency,
      ...buyerInfoValues,
    });
    row.height = order.receipt_url ? ROW_HEIGHT_WITH_IMAGE : ROW_HEIGHT_DEFAULT;
    row.alignment = { vertical: "middle" };
    row.commit();

    if (order.receipt_url) {
      await addReceiptImage(
        workbook,
        sheet,
        order.receipt_url,
        row.number,
        receiptColIndex,
      );
    }
  }
}

export async function buildSalesWorkbook(
  orders: OrderRow[],
  profileMap: Map<string, UserProfileRow>,
  itemsByOrder: Map<string, OrderItemRow[]>,
): Promise<ExcelJS.Workbook> {
  const buyerInfoKeys = collectBuyerInfoKeys(orders);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Admin Reports";
  workbook.created = new Date();

  const sheet = workbook.addWorksheet("Sales Report");
  sheet.columns = buildSheetColumns(buyerInfoKeys);

  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true };
  headerRow.alignment = { vertical: "middle", horizontal: "center" };
  headerRow.height = ROW_HEIGHT_DEFAULT;
  headerRow.commit();

  const receiptColIndex = STATIC_HEADERS.indexOf(RECEIPT_HEADER) + 1;

  for (const order of orders) {
    const buyer = profileMap.get(order.user_id);
    const seller = order.seller_id
      ? profileMap.get(order.seller_id)
      : undefined;
    await addOrderRows(
      workbook,
      sheet,
      order,
      buyer,
      seller,
      itemsByOrder,
      buyerInfoKeys,
      receiptColIndex,
    );
  }

  addRawDataSheet(workbook, orders, itemsByOrder);

  return workbook;
}

const RAW_ORDERS_HEADERS = [
  "id",
  "created_at",
  "payment_status",
  "total",
  "currency",
  "transfer_number",
  "receipt_url",
  "user_id",
  "seller_id",
  "buyer_info",
] as const;

const RAW_ITEMS_HEADERS = [
  "id",
  "order_id",
  "product_id",
  "quantity",
  "unit_price",
  "currency",
] as const;

function addRawDataSheet(
  workbook: ExcelJS.Workbook,
  orders: OrderRow[],
  itemsByOrder: Map<string, OrderItemRow[]>,
): void {
  const ordersSheet = workbook.addWorksheet("Raw Orders");
  ordersSheet.columns = RAW_ORDERS_HEADERS.map((h) => ({
    header: h,
    key: h,
    width: COL_WIDTH_WIDE,
  }));
  const ordersHeader = ordersSheet.getRow(1);
  ordersHeader.font = { bold: true };
  ordersHeader.commit();

  for (const order of orders) {
    ordersSheet
      .addRow({
        id: order.id,
        created_at: order.created_at,
        payment_status: order.payment_status,
        total: order.total,
        currency: order.currency,
        transfer_number: order.transfer_number ?? "",
        receipt_url: order.receipt_url ?? "",
        user_id: order.user_id,
        seller_id: order.seller_id ?? "",
        buyer_info: order.buyer_info ? JSON.stringify(order.buyer_info) : "",
      })
      .commit();
  }

  const itemsSheet = workbook.addWorksheet("Raw Order Items");
  itemsSheet.columns = RAW_ITEMS_HEADERS.map((h) => ({
    header: h,
    key: h,
    width: COL_WIDTH_WIDE,
  }));
  const itemsHeader = itemsSheet.getRow(1);
  itemsHeader.font = { bold: true };
  itemsHeader.commit();

  for (const items of itemsByOrder.values()) {
    for (const item of items) {
      itemsSheet
        .addRow({
          id: item.id,
          order_id: item.order_id,
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          currency: item.currency,
        })
        .commit();
    }
  }
}
