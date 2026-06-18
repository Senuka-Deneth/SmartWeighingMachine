-- Reduce compartment capacity from 25 kg to 6 kg; scale low-stock threshold to 1 kg
update compartments
set
  total_capacity = 6,
  current_stock = least(current_stock, 6),
  low_stock_threshold = 1,
  updated_at = now();
