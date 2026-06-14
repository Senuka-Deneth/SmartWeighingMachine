-- Required for Realtime UPDATE filters (e.g. id=eq.xxx, machine_id=eq.xxx)
alter table compartments replica identity full;

-- Enable Realtime on log tables for live history updates
alter publication supabase_realtime add table dispense_logs;
alter publication supabase_realtime add table refill_logs;
