import { sql } from "drizzle-orm";
import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";
import { nanoid } from "nanoid";

/**
 * Konvensi (lihat PRD-TEKNIS.md §4.1):
 * - id      : TEXT nanoid
 * - uang    : INTEGER rupiah utuh (JANGAN float)
 * - waktu   : INTEGER unix epoch milidetik (UTC)
 * - tanggal : TEXT "YYYY-MM-DD" waktu lokal outlet (business_date)
 * - boolean : INTEGER 0/1
 */

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => nanoid());

const timestamps = {
  createdAt: integer("created_at")
    .notNull()
    .$defaultFn(() => Date.now()),
  updatedAt: integer("updated_at")
    .notNull()
    .$defaultFn(() => Date.now())
    .$onUpdateFn(() => Date.now()),
};

/* -------------------------------------------------------------- users */

export const users = sqliteTable("users", {
  id: id(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  phone: text("phone"),
  image: text("image"),
  plan: text("plan", { enum: ["mulai", "tumbuh", "juara"] })
    .notNull()
    .default("mulai"),
  trialEndsAt: integer("trial_ends_at"),
  planEndsAt: integer("plan_ends_at"),
  ...timestamps,
});

/* ------------------------------------------------------------ outlets */

export const outlets = sqliteTable(
  "outlets",
  {
    id: id(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    address: text("address"),
    phone: text("phone"),
    timezone: text("timezone").notNull().default("Asia/Jakarta"),
    isActive: integer("is_active").notNull().default(1),
    ...timestamps,
  },
  (t) => [index("idx_outlets_owner").on(t.ownerId)],
);

/**
 * Sumber kebenaran otorisasi. Setiap Server Action wajib memverifikasi
 * (userId, outletId) ke tabel ini — SQLite tidak punya Row Level Security.
 */
export const staff = sqliteTable(
  "staff",
  {
    id: id(),
    outletId: text("outlet_id")
      .notNull()
      .references(() => outlets.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role", { enum: ["owner", "kasir"] })
      .notNull()
      .default("kasir"),
    isActive: integer("is_active").notNull().default(1),
    ...timestamps,
  },
  (t) => [uniqueIndex("uq_staff_outlet_user").on(t.outletId, t.userId)],
);

/* -------------------------------------------------- katalog & produk */

export const categories = sqliteTable(
  "categories",
  {
    id: id(),
    outletId: text("outlet_id")
      .notNull()
      .references(() => outlets.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    ...timestamps,
  },
  (t) => [index("idx_categories_outlet").on(t.outletId)],
);

export const products = sqliteTable(
  "products",
  {
    id: id(),
    outletId: text("outlet_id")
      .notNull()
      .references(() => outlets.id, { onDelete: "cascade" }),
    categoryId: text("category_id").references(() => categories.id, {
      onDelete: "set null",
    }),
    name: text("name").notNull(),
    sku: text("sku"),
    emoji: text("emoji"),
    price: integer("price").notNull(), // harga jual (Rp)
    cost: integer("cost").notNull().default(0), // modal / HPP (Rp)
    stock: integer("stock").notNull().default(0),
    /**
     * 0 = produk ini tidak dilacak stoknya.
     *
     * Untuk F&B masak-saat-pesan (nasi goreng, kopi susu) tidak ada
     * "stok nasi goreng" yang masuk akal. Tanpa opsi ini penjual harus
     * mengisi stok palsu yang besar, atau POS menolak penjualan dengan
     * "Stok tinggal 0" di tengah jam ramai.
     */
    lacakStok: integer("lacak_stok").notNull().default(1),
    lowStockThreshold: integer("low_stock_threshold").notNull().default(5),
    unit: text("unit").notNull().default("pcs"),
    // Nama berkas foto di data/uploads/produk, bukan URL penuh — supaya
    // pindah domain atau pindah server tidak membuat gambar putus.
    imageUrl: text("image_url"),
    // manual = `cost` diketik sendiri; resep = HPP dihitung dari recipe_items
    // + labor + overhead (lihat PRD-TEKNIS.md §16.4).
    hppMode: text("hpp_mode", { enum: ["manual", "resep"] })
      .notNull()
      .default("manual"),
    laborCost: integer("labor_cost").notNull().default(0),
    overheadCost: integer("overhead_cost").notNull().default(0),
    isActive: integer("is_active").notNull().default(1),
    ...timestamps,
  },
  (t) => [
    index("idx_products_outlet_active").on(t.outletId, t.isActive),
    index("idx_products_outlet_name").on(t.outletId, t.name),
    uniqueIndex("uq_products_outlet_sku")
      .on(t.outletId, t.sku)
      .where(sql`sku is not null`),
  ],
);

export const customers = sqliteTable(
  "customers",
  {
    id: id(),
    outletId: text("outlet_id")
      .notNull()
      .references(() => outlets.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    phone: text("phone"), // dinormalisasi ke format 62xxx
    note: text("note"),
    isActive: integer("is_active").notNull().default(1),
    ...timestamps,
  },
  (t) => [index("idx_customers_outlet_name").on(t.outletId, t.name)],
);

/* -------------------------------------------------------- transaksi */

export const transactions = sqliteTable(
  "transactions",
  {
    id: id(),
    outletId: text("outlet_id")
      .notNull()
      .references(() => outlets.id, { onDelete: "cascade" }),
    staffId: text("staff_id").references(() => staff.id),
    customerId: text("customer_id").references(() => customers.id),
    invoiceNo: text("invoice_no").notNull(),
    subtotal: integer("subtotal").notNull(),
    discount: integer("discount").notNull().default(0),
    total: integer("total").notNull(),
    paymentMethod: text("payment_method", {
      enum: ["cash", "qris", "transfer", "debt", "other"],
    }).notNull(),
    paidAmount: integer("paid_amount").notNull().default(0),
    changeAmount: integer("change_amount").notNull().default(0),
    status: text("status", { enum: ["paid", "debt", "void"] })
      .notNull()
      .default("paid"),
    occurredAt: integer("occurred_at").notNull(),
    businessDate: text("business_date").notNull(), // YYYY-MM-DD lokal outlet
    note: text("note"),
    ...timestamps,
  },
  (t) => [
    // Index terpenting: hampir semua query dashboard & laporan memakainya.
    index("idx_tx_outlet_date").on(t.outletId, t.businessDate),
    index("idx_tx_outlet_occurred").on(t.outletId, t.occurredAt),
    index("idx_tx_customer").on(t.customerId),
    uniqueIndex("uq_tx_outlet_invoice").on(t.outletId, t.invoiceNo),
  ],
);

/**
 * Harga & modal disimpan sebagai snapshot agar laporan untung periode lalu
 * tetap akurat walau harga produk diubah hari ini.
 */
export const transactionItems = sqliteTable(
  "transaction_items",
  {
    id: id(),
    transactionId: text("transaction_id")
      .notNull()
      .references(() => transactions.id, { onDelete: "cascade" }),
    productId: text("product_id").references(() => products.id, {
      onDelete: "set null",
    }),
    nameSnapshot: text("name_snapshot").notNull(),
    priceSnapshot: integer("price_snapshot").notNull(),
    costSnapshot: integer("cost_snapshot").notNull().default(0),
    qty: integer("qty").notNull(),
    lineTotal: integer("line_total").notNull(),
  },
  (t) => [
    index("idx_items_tx").on(t.transactionId),
    index("idx_items_product").on(t.productId),
  ],
);

/* ------------------------------------------------------ kasbon/utang */

export const debts = sqliteTable(
  "debts",
  {
    id: id(),
    outletId: text("outlet_id")
      .notNull()
      .references(() => outlets.id, { onDelete: "cascade" }),
    customerId: text("customer_id")
      .notNull()
      .references(() => customers.id, { onDelete: "cascade" }),
    transactionId: text("transaction_id").references(() => transactions.id),
    amount: integer("amount").notNull(),
    paid: integer("paid").notNull().default(0),
    remaining: integer("remaining").notNull(),
    dueDate: text("due_date"), // YYYY-MM-DD
    status: text("status", { enum: ["open", "partial", "paid"] })
      .notNull()
      .default("open"),
    ...timestamps,
  },
  (t) => [
    index("idx_debts_outlet_status").on(t.outletId, t.status),
    index("idx_debts_outlet_due").on(t.outletId, t.dueDate),
    index("idx_debts_customer").on(t.customerId),
  ],
);

export const debtPayments = sqliteTable(
  "debt_payments",
  {
    id: id(),
    debtId: text("debt_id")
      .notNull()
      .references(() => debts.id, { onDelete: "cascade" }),
    amount: integer("amount").notNull(),
    method: text("method", { enum: ["cash", "qris", "transfer", "other"] })
      .notNull()
      .default("cash"),
    paidAt: integer("paid_at").notNull(),
    note: text("note"),
    recordedBy: text("recorded_by").references(() => users.id),
  },
  (t) => [index("idx_debt_payments_debt").on(t.debtId)],
);

/* ------------------------------------------------------ stok & kas */

/** Buku besar stok — append only. Menjawab "kenapa stok berubah?". */
export const stockMovements = sqliteTable(
  "stock_movements",
  {
    id: id(),
    outletId: text("outlet_id")
      .notNull()
      .references(() => outlets.id, { onDelete: "cascade" }),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    type: text("type", {
      enum: ["sale", "purchase", "production", "adjustment", "void"],
    }).notNull(),
    qtyChange: integer("qty_change").notNull(), // boleh negatif
    stockAfter: integer("stock_after").notNull(),
    refId: text("ref_id"),
    note: text("note"),
    createdAt: integer("created_at")
      .notNull()
      .$defaultFn(() => Date.now()),
  },
  (t) => [index("idx_stock_mov_product").on(t.productId, t.createdAt)],
);

export const reconciliations = sqliteTable(
  "reconciliations",
  {
    id: id(),
    outletId: text("outlet_id")
      .notNull()
      .references(() => outlets.id, { onDelete: "cascade" }),
    businessDate: text("business_date").notNull(),
    cashSystem: integer("cash_system").notNull().default(0),
    cashPhysical: integer("cash_physical").notNull().default(0),
    cashDiff: integer("cash_diff").notNull().default(0),
    qrisSystem: integer("qris_system").notNull().default(0),
    qrisSettled: integer("qris_settled").notNull().default(0),
    qrisDiff: integer("qris_diff").notNull().default(0),
    note: text("note"),
    approvedBy: text("approved_by").references(() => users.id),
    approvedAt: integer("approved_at"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("uq_recon_outlet_date").on(t.outletId, t.businessDate),
  ],
);

export const reminders = sqliteTable(
  "reminders",
  {
    id: id(),
    outletId: text("outlet_id")
      .notNull()
      .references(() => outlets.id, { onDelete: "cascade" }),
    type: text("type", {
      enum: ["debt_due", "low_stock", "daily_report"],
    }).notNull(),
    refId: text("ref_id"),
    title: text("title").notNull(),
    body: text("body"),
    scheduledAt: integer("scheduled_at").notNull(),
    sentAt: integer("sent_at"),
    status: text("status", { enum: ["pending", "sent", "dismissed"] })
      .notNull()
      .default("pending"),
    ...timestamps,
  },
  (t) => [index("idx_reminders_outlet_status").on(t.outletId, t.status)],
);

/* ------------------------------------------- bahan baku & produksi */

/**
 * Bahan baku. Harga satuan disimpan sebagai rupiah x1.000 per satuan
 * terkecil (ADR-003) karena Rp 150.000/kg = Rp 150/g, sementara bahan lain
 * bisa Rp 0,15/ml — pembulatan ke rupiah utuh akan membuatnya jadi nol.
 */
export const materials = sqliteTable(
  "materials",
  {
    id: id(),
    outletId: text("outlet_id")
      .notNull()
      .references(() => outlets.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    unit: text("unit", { enum: ["g", "ml", "pcs"] })
      .notNull()
      .default("g"),
    stock: integer("stock").notNull().default(0),
    costPerUnitMilli: integer("cost_per_unit_milli").notNull().default(0),
    lowStockThreshold: integer("low_stock_threshold").notNull().default(0),
    isActive: integer("is_active").notNull().default(1),
    ...timestamps,
  },
  (t) => [index("idx_materials_outlet_active").on(t.outletId, t.isActive)],
);

/** Buku besar bahan baku — append only, seperti stock_movements untuk produk. */
export const materialMovements = sqliteTable(
  "material_movements",
  {
    id: id(),
    outletId: text("outlet_id")
      .notNull()
      .references(() => outlets.id, { onDelete: "cascade" }),
    materialId: text("material_id")
      .notNull()
      .references(() => materials.id, { onDelete: "cascade" }),
    type: text("type", {
      enum: ["purchase", "production", "adjustment", "waste"],
    }).notNull(),
    qtyChange: integer("qty_change").notNull(),
    stockAfter: integer("stock_after").notNull(),
    costPerUnitMilli: integer("cost_per_unit_milli").notNull().default(0),
    refId: text("ref_id"),
    note: text("note"),
    createdAt: integer("created_at")
      .notNull()
      .$defaultFn(() => Date.now()),
  },
  (t) => [index("idx_mat_mov_material").on(t.materialId, t.createdAt)],
);

/** Resep (BOM) — jembatan antara stok bahan baku dan biaya. */
export const recipeItems = sqliteTable(
  "recipe_items",
  {
    id: id(),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    materialId: text("material_id")
      .notNull()
      .references(() => materials.id, { onDelete: "cascade" }),
    qty: integer("qty").notNull(),
  },
  (t) => [
    uniqueIndex("uq_recipe_product_material").on(t.productId, t.materialId),
  ],
);

export const productions = sqliteTable(
  "productions",
  {
    id: id(),
    outletId: text("outlet_id")
      .notNull()
      .references(() => outlets.id, { onDelete: "cascade" }),
    productId: text("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    qty: integer("qty").notNull(),
    hppPerUnit: integer("hpp_per_unit").notNull(),
    totalCost: integer("total_cost").notNull(),
    staffId: text("staff_id").references(() => staff.id),
    note: text("note"),
    occurredAt: integer("occurred_at").notNull(),
    businessDate: text("business_date").notNull(),
    ...timestamps,
  },
  (t) => [index("idx_productions_outlet_date").on(t.outletId, t.businessDate)],
);

/* --------------------------------------- pembelian & hutang supplier */

export const purchases = sqliteTable(
  "purchases",
  {
    id: id(),
    outletId: text("outlet_id")
      .notNull()
      .references(() => outlets.id, { onDelete: "cascade" }),
    supplierName: text("supplier_name"),
    total: integer("total").notNull(),
    paidAmount: integer("paid_amount").notNull().default(0),
    remaining: integer("remaining").notNull().default(0),
    method: text("method", { enum: ["cash", "qris", "transfer", "other"] })
      .notNull()
      .default("cash"),
    status: text("status", { enum: ["paid", "partial", "debt"] })
      .notNull()
      .default("paid"),
    dueDate: text("due_date"),
    note: text("note"),
    occurredAt: integer("occurred_at").notNull(),
    businessDate: text("business_date").notNull(),
    ...timestamps,
  },
  (t) => [
    index("idx_purchases_outlet_date").on(t.outletId, t.businessDate),
    index("idx_purchases_outlet_status").on(t.outletId, t.status),
  ],
);

export const purchaseItems = sqliteTable(
  "purchase_items",
  {
    id: id(),
    purchaseId: text("purchase_id")
      .notNull()
      .references(() => purchases.id, { onDelete: "cascade" }),
    materialId: text("material_id").references(() => materials.id, {
      onDelete: "set null",
    }),
    nameSnapshot: text("name_snapshot").notNull(),
    qty: integer("qty").notNull(),
    unitCostMilli: integer("unit_cost_milli").notNull(),
    lineTotal: integer("line_total").notNull(),
  },
  (t) => [index("idx_purchase_items_purchase").on(t.purchaseId)],
);

export const payablePayments = sqliteTable(
  "payable_payments",
  {
    id: id(),
    purchaseId: text("purchase_id")
      .notNull()
      .references(() => purchases.id, { onDelete: "cascade" }),
    amount: integer("amount").notNull(),
    method: text("method", { enum: ["cash", "qris", "transfer", "other"] })
      .notNull()
      .default("cash"),
    paidAt: integer("paid_at").notNull(),
    note: text("note"),
    recordedBy: text("recorded_by").references(() => users.id),
  },
  (t) => [index("idx_payable_payments_purchase").on(t.purchaseId)],
);

/* ------------------------------------------------- beban & tagihan */

export const expenses = sqliteTable(
  "expenses",
  {
    id: id(),
    outletId: text("outlet_id")
      .notNull()
      .references(() => outlets.id, { onDelete: "cascade" }),
    category: text("category", {
      enum: ["listrik", "gaji", "sewa", "internet", "transport", "lainnya"],
    })
      .notNull()
      .default("lainnya"),
    name: text("name").notNull(),
    amount: integer("amount").notNull(),
    method: text("method", { enum: ["cash", "qris", "transfer", "other"] })
      .notNull()
      .default("cash"),
    berulang: integer("berulang").notNull().default(0),
    occurredAt: integer("occurred_at").notNull(),
    businessDate: text("business_date").notNull(),
    note: text("note"),
    recordedBy: text("recorded_by").references(() => users.id),
    ...timestamps,
  },
  (t) => [
    index("idx_expenses_outlet_date").on(t.outletId, t.businessDate),
    index("idx_expenses_outlet_category").on(t.outletId, t.category),
  ],
);

/* ------------------------------------------------------- autentikasi */

/**
 * Akun login aplikasi. Sengaja terpisah dari tabel `users` (yang menyimpan
 * pemilik outlet beserta paket langganannya): `users` adalah data usaha,
 * `pengguna` adalah kredensial. Memisahkannya membuat pencabutan akses tidak
 * pernah menyentuh data outlet.
 *
 * Tidak ada tabel `sesi`: sesi dibawa sebagai JWT di cookie (src/lib/jwt.ts).
 * Konsekuensinya sesi tidak bisa dicabut satu per satu — lihat README.md.
 */
export const pengguna = sqliteTable(
  "pengguna",
  {
    id: id(),
    nama: text("nama").notNull(),
    namaPengguna: text("nama_pengguna").notNull(),
    // scrypt(sandi, salt) — lihat src/server/auth.ts. Bukan bcrypt supaya
    // tidak menambah dependency native kedua di samping better-sqlite3.
    hashSandi: text("hash_sandi").notNull(),
    salt: text("salt").notNull(),
    peran: text("peran", { enum: ["pemilik", "kasir"] })
      .notNull()
      .default("kasir"),
    harusGantiSandi: integer("harus_ganti_sandi").notNull().default(0),
    /**
     * Kode pemulihan sekali pakai, di-hash sama seperti sandi.
     *
     * Ini satu-satunya jalan pulih sendiri kalau sandi lupa: deployment ini
     * tidak punya SMTP, dan wa.me hanya membuka tautan chat — tidak bisa
     * mengirim pesan otomatis. Jadi kodenya dicatat pemilik saat dibuat.
     * NULL berarti pemilik belum pernah membuat kode.
     */
    kodePemulihanHash: text("kode_pemulihan_hash"),
    kodePemulihanSalt: text("kode_pemulihan_salt"),
    kodePemulihanDibuatPada: integer("kode_pemulihan_dibuat_pada"),
    dibuatPada: integer("dibuat_pada")
      .notNull()
      .$defaultFn(() => Date.now()),
  },
  (t) => [uniqueIndex("idx_pengguna_nama_pengguna").on(t.namaPengguna)],
);

export type Product = typeof products.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type Debt = typeof debts.$inferSelect;
export type Customer = typeof customers.$inferSelect;
export type Material = typeof materials.$inferSelect;
export type Expense = typeof expenses.$inferSelect;
export type Pengguna = typeof pengguna.$inferSelect;
