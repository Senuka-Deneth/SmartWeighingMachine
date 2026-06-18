-- Insert the single machine
insert into machines (machine_number, status) values (1, 'online');

-- Insert 4 compartments for this machine
-- Slot 1: Rice - ACTIVE (only working compartment)
insert into compartments (machine_id, slot_number, product_name, status, total_capacity, current_stock, low_stock_threshold, api_key)
select id, 1, 'Rice', 'active', 6, 6, 1, gen_random_uuid()::text
from machines where machine_number = 1;

-- Slots 2-4: Not configured / inactive
insert into compartments (machine_id, slot_number, product_name, status, total_capacity, current_stock, low_stock_threshold)
select id, 2, null, 'inactive', 6, 0, 1 from machines where machine_number = 1;

insert into compartments (machine_id, slot_number, product_name, status, total_capacity, current_stock, low_stock_threshold)
select id, 3, null, 'inactive', 6, 0, 1 from machines where machine_number = 1;

insert into compartments (machine_id, slot_number, product_name, status, total_capacity, current_stock, low_stock_threshold)
select id, 4, null, 'inactive', 6, 0, 1 from machines where machine_number = 1;
