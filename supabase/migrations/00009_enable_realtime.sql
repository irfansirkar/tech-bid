-- Enable realtime for answers and domain_bids so that score/credit updates
-- and bid count updates push instantly to all clients without page refresh.

ALTER PUBLICATION supabase_realtime ADD TABLE answers;
ALTER PUBLICATION supabase_realtime ADD TABLE domain_bids;
ALTER PUBLICATION supabase_realtime ADD TABLE buzzer_entries;
