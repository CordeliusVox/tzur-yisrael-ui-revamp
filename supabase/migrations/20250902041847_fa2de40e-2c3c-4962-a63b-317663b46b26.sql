-- Clear all existing user data to start fresh
DELETE FROM public.complaint_updates;
DELETE FROM public.complaints; 
DELETE FROM public.profiles;

-- Note: We cannot delete from auth.users directly, but clearing profiles will help
-- Users will need to be manually deleted from Supabase Auth dashboard if needed