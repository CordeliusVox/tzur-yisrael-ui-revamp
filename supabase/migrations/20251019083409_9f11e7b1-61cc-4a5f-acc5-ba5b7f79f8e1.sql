-- Fix security issue: Remove overly permissive policy that allows all authenticated users to read all profiles
DROP POLICY IF EXISTS "Allow authenticated users to read profiles" ON public.profiles;

-- Fix security issue: Remove policy that allows all users to read all category assignments
DROP POLICY IF EXISTS "Enable read access for all users" ON public.user_categories;

-- Create secure policy: Users can only view their own profile, or staff/admin can view all
CREATE POLICY "Users can view profiles based on role_v2" ON public.profiles
  FOR SELECT
  USING (
    (auth.uid() = user_id) OR 
    (user_id IS NULL) OR
    (get_current_user_role() = ANY(ARRAY['admin'::text, 'staff'::text]))
  );