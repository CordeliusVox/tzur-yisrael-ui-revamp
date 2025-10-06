-- Make user_id nullable in profiles table since we're creating accounts manually
-- without corresponding auth.users records
ALTER TABLE public.profiles ALTER COLUMN user_id DROP NOT NULL;

-- Drop the foreign key constraint that links to auth.users
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_user_id_fkey;

-- Update the RLS policies to work with nullable user_id
DROP POLICY IF EXISTS "Users can create their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view profiles based on role" ON public.profiles;

-- Create new RLS policies that handle nullable user_id
CREATE POLICY "Users can create their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can view profiles based on role" 
ON public.profiles 
FOR SELECT 
USING (
  (get_current_user_role() = ANY (ARRAY['admin'::text, 'staff'::text])) 
  OR (auth.uid() = user_id)
  OR (user_id IS NULL)
);