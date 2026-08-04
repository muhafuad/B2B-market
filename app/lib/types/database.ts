export type UserRole = "super_admin" | "supplier" | "customer";

export type SupplierType =
  | "manufacturer"
  | "factory"
  | "supplier"
  | "distributor";
export type CustomerType = "retailer" | "business" | "individual";

export type ProductStatus = "active" | "draft" | "archived";
export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded"
  | "returned";
export type PaymentStatus = "unpaid" | "partial" | "paid" | "refunded";
export type PaymentMethod =
  | "bank_transfer"
  | "mobile_money"
  | "cash"
  | "credit"
  | "invoice";
export type PaymentVerificationStatus =
  | "pending"
  | "verified"
  | "rejected"
  | "refunded";
export type PurchaseRequestStatus =
  | "draft"
  | "sent"
  | "accepted"
  | "rejected"
  | "quoted"
  | "ordered"
  | "cancelled";
export type QuoteStatus = "pending" | "accepted" | "rejected" | "countered";
export type PurchaseOrderStatus =
  | "pending"
  | "approved"
  | "in_production"
  | "shipped"
  | "delivered"
  | "completed"
  | "cancelled";
export type DeliveryStatus =
  | "scheduled"
  | "in_transit"
  | "received"
  | "inspected"
  | "rejected"
  | "stored";
export type ShipmentStatus =
  | "processing"
  | "shipped"
  | "in_transit"
  | "delivered"
  | "returned";
export type TransactionType =
  | "income"
  | "expense"
  | "purchase"
  | "sale"
  | "refund"
  | "adjustment";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  role: UserRole;
  supplier_id: string | null;
  customer_id: string | null;
  is_active: boolean;
  must_change_password: boolean;
  created_at: string;
  updated_at: string;
}

export interface Supplier {
  id: string;
  name: string;
  company_name: string | null;
  type: SupplierType;
  email: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postal_code: string | null;
  tax_id: string | null;
  rating: number;
  status: "active" | "inactive" | "blacklisted";
  payment_methods: string[] | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Customer {
  id: string;
  name: string;
  company_name: string | null;
  type: CustomerType;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postal_code: string | null;
  tax_id: string | null;
  credit_limit: number;
  status: "active" | "inactive";
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Employee {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  position: string | null;
  department: string | null;
  salary: number | null;
  hire_date: string | null;
  status: "active" | "inactive" | "on_leave";
  profile_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  parent_id: string | null;
  image_url: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  country: string | null;
  is_active: boolean;
  created_at: string;
}

export interface Warehouse {
  id: string;
  name: string;
  code: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  postal_code: string | null;
  manager: string | null;
  phone: string | null;
  capacity: number | null;
  is_active: boolean;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  sku: string | null;
  barcode: string | null;
  description: string | null;
  specifications: Record<string, string> | null;
  category_id: string | null;
  brand_id: string | null;
  supplier_id: string | null;
  image_url: string | null;
  gallery: string[] | null;
  video_url: string | null;
  wholesale_price: number;
  retail_price: number;
  discount: number;
  tax_rate: number;
  unit: string;
  min_stock: number;
  max_stock: number;
  stock: number;
  status: ProductStatus;
  is_featured: boolean;
  meta_title: string | null;
  meta_description: string | null;
  rating: number;
  review_count: number;
  created_at: string;
  updated_at: string;
  category?: Category;
  brand?: Brand;
  supplier?: Supplier;
}

export interface ProductImage {
  id: string;
  product_id: string;
  url: string;
  alt: string | null;
  position: number;
  created_at: string;
}

export interface Inventory {
  id: string;
  product_id: string;
  warehouse_id: string | null;
  sku: string | null;
  barcode: string | null;
  batch_number: string | null;
  expiry_date: string | null;
  quantity: number;
  min_stock: number;
  max_stock: number;
  purchase_price: number;
  selling_price: number;
  supplier_id: string | null;
  created_at: string;
  updated_at: string;
  product?: Product;
  warehouse?: Warehouse;
}

export interface PurchaseRequest {
  id: string;
  request_number: string;
  title: string;
  description: string | null;
  supplier_id: string | null;
  status: PurchaseRequestStatus;
  priority: "low" | "medium" | "high" | "urgent";
  expected_date: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  supplier?: Supplier;
  items?: PurchaseRequestItem[];
  quotes?: SupplierQuote[];
}

export interface PurchaseRequestItem {
  id: string;
  purchase_request_id: string;
  product_name: string;
  description: string | null;
  quantity: number;
  unit: string;
  created_at: string;
}

export interface SupplierQuote {
  id: string;
  purchase_request_id: string;
  supplier_id: string;
  status: QuoteStatus;
  price: number;
  quantity: number;
  unit: string;
  estimated_delivery_date: string | null;
  comments: string | null;
  created_at: string;
  updated_at: string;
  supplier?: Supplier;
}

export interface PurchaseOrder {
  id: string;
  po_number: string;
  purchase_request_id: string | null;
  supplier_id: string;
  status: PurchaseOrderStatus;
  total_amount: number;
  expected_delivery_date: string | null;
  actual_delivery_date: string | null;
  notes: string | null;
  receipt_urls: string[] | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  supplier?: Supplier;
  purchase_request?: PurchaseRequest;
}

export interface Delivery {
  id: string;
  delivery_number: string;
  purchase_order_id: string;
  supplier_id: string | null;
  warehouse_id: string | null;
  status: DeliveryStatus;
  scheduled_date: string | null;
  received_date: string | null;
  notes: string | null;
  attachments: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  purchase_order?: PurchaseOrder;
  warehouse?: Warehouse;
}

export interface Order {
  id: string;
  order_number: string;
  customer_id: string;
  status: OrderStatus;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  shipping_amount: number;
  total_amount: number;
  payment_status: PaymentStatus;
  shipping_address: string | null;
  billing_address: string | null;
  tracking_number: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  customer?: Customer;
  items?: OrderItem[];
}

export interface OrderItem {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
}

export interface Payment {
  id: string;
  order_id: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentVerificationStatus;
  reference: string | null;
  paid_at: string | null;
  verified_at: string | null;
  verified_by: string | null;
  notes: string | null;
  receipt_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  reference_type: string | null;
  reference_id: string | null;
  amount: number;
  description: string | null;
  category: string | null;
  created_at: string;
}

export interface Shipment {
  id: string;
  shipment_number: string;
  order_id: string;
  carrier: string | null;
  tracking_number: string | null;
  status: ShipmentStatus;
  shipped_date: string | null;
  delivered_date: string | null;
  estimated_delivery: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Review {
  id: string;
  product_id: string;
  customer_id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  is_approved: boolean;
  created_at: string;
  customer?: Customer;
}

export interface Notification {
  id: string;
  user_id: string | null;
  role_scope: string | null;
  type: string;
  title: string;
  message: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

export interface Message {
  id: string;
  thread_id: string;
  sender_id: string;
  recipient_id: string | null;
  subject: string | null;
  body: string;
  attachment_url: string | null;
  is_read: boolean;
  created_at: string;
}

export interface Settings {
  id: number;
  company_name: string;
  company_email: string | null;
  company_phone: string | null;
  company_address: string | null;
  currency: string;
  currency_symbol: string;
  tax_rate: number;
  low_stock_threshold: number;
  logo_url: string | null;
  primary_color: string;
}
