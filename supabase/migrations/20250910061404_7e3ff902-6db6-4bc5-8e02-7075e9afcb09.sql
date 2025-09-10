-- Add role column to profiles table
ALTER TABLE public.profiles ADD COLUMN role text DEFAULT 'user' CHECK (role IN ('admin', 'staff', 'user'));

-- Create index on role for better performance
CREATE INDEX idx_profiles_role ON public.profiles(role);

-- Create security definer function to get current user role
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE user_id = auth.uid();
$$;

-- Update RLS policies for complaints - restrict access based on roles and ownership
DROP POLICY IF EXISTS "Users can view all complaints" ON public.complaints;
CREATE POLICY "Users can view complaints based on role and ownership" 
ON public.complaints 
FOR SELECT 
USING (
  -- Admins and staff can see all
  public.get_current_user_role() IN ('admin', 'staff') OR
  -- Users can see their own submissions
  auth.uid() = submitter_id OR
  -- Users can see complaints assigned to them
  auth.uid() = assigned_to
);

-- Update RLS policies for complaint_updates - restrict access
DROP POLICY IF EXISTS "Users can view all complaint updates" ON public.complaint_updates;
CREATE POLICY "Users can view complaint updates based on role and ownership" 
ON public.complaint_updates 
FOR SELECT 
USING (
  -- Admins and staff can see all updates
  public.get_current_user_role() IN ('admin', 'staff') OR
  -- Users can see updates for complaints they submitted or are assigned to
  EXISTS (
    SELECT 1 FROM public.complaints c 
    WHERE c.id = complaint_updates.complaint_id 
    AND (c.submitter_id = auth.uid() OR c.assigned_to = auth.uid())
  )
);

-- Update complaint update creation policy to require proper role
DROP POLICY IF EXISTS "Users can create complaint updates" ON public.complaint_updates;
CREATE POLICY "Staff and admins can create complaint updates" 
ON public.complaint_updates 
FOR INSERT 
WITH CHECK (
  public.get_current_user_role() IN ('admin', 'staff') AND
  auth.uid() = user_id
);

-- Update complaint modification policies to require proper role
DROP POLICY IF EXISTS "Users can update complaints they submitted or are assigned to" ON public.complaints;
CREATE POLICY "Users can update complaints based on role and ownership" 
ON public.complaints 
FOR UPDATE 
USING (
  -- Admins and staff can update any complaint
  public.get_current_user_role() IN ('admin', 'staff') OR
  -- Users can update their own submissions (limited fields)
  (auth.uid() = submitter_id AND public.get_current_user_role() = 'user')
);

-- Allow only admins and staff to delete complaints
DROP POLICY IF EXISTS "Users can delete complaints they submitted" ON public.complaints;
CREATE POLICY "Only admins can delete complaints" 
ON public.complaints 
FOR DELETE 
USING (public.get_current_user_role() = 'admin');

-- Ensure profiles have proper RLS for role access
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view profiles based on role" 
ON public.profiles 
FOR SELECT 
USING (
  -- Admins and staff can view all profiles
  public.get_current_user_role() IN ('admin', 'staff') OR
  -- Users can view their own profile
  auth.uid() = user_id
);

-- Update the handle_new_user function to set default role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, role)
  VALUES (NEW.id, NEW.email, 'user');
  RETURN NEW;
END;
$$;

-- Create trigger for new users (if not exists)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();