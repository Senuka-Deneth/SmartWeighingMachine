export interface Machine {
  id: string;
  machine_number: number;
  status: "online" | "offline";
  created_at: string;
}

export interface Compartment {
  id: string;
  machine_id: string;
  slot_number: number;
  product_name: string | null;
  status: "active" | "inactive";
  total_capacity: number;
  current_stock: number;
  low_stock_threshold: number;
  api_key: string | null;
  created_at: string;
  updated_at: string;
}

export interface DispenseLog {
  id: string;
  compartment_id: string;
  amount: number;
  stock_before: number;
  stock_after: number;
  created_at: string;
}

export interface RefillLog {
  id: string;
  compartment_id: string;
  refilled_by: string | null;
  stock_before: number;
  created_at: string;
}

export interface PushSubscription {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  created_at: string;
}
