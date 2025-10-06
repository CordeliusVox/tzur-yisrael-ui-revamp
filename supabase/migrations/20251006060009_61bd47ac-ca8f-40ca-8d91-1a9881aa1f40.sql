-- Create categories table
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Create user_categories junction table for many-to-many relationship
CREATE TABLE public.user_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  category_id uuid REFERENCES public.categories(id) ON DELETE CASCADE NOT NULL,
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  UNIQUE(user_id, category_id)
);

-- Enable RLS on both tables
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_categories ENABLE ROW LEVEL SECURITY;

-- RLS policies for categories - everyone can view, only admins can modify
CREATE POLICY "Everyone can view categories"
ON public.categories
FOR SELECT
USING (true);

CREATE POLICY "Admins can insert categories"
ON public.categories
FOR INSERT
WITH CHECK (get_current_user_role() = 'admin');

CREATE POLICY "Admins can delete categories"
ON public.categories
FOR DELETE
USING (get_current_user_role() = 'admin');

-- RLS policies for user_categories - users can view their own, admins can manage all
CREATE POLICY "Users can view their own category assignments"
ON public.user_categories
FOR SELECT
USING (auth.uid() IN (SELECT id FROM profiles WHERE id = user_id) OR get_current_user_role() = 'admin');

CREATE POLICY "Admins can insert user category assignments"
ON public.user_categories
FOR INSERT
WITH CHECK (get_current_user_role() = 'admin');

CREATE POLICY "Admins can delete user category assignments"
ON public.user_categories
FOR DELETE
USING (get_current_user_role() = 'admin');

-- Update complaints RLS policy to filter by user's assigned categories
DROP POLICY IF EXISTS "Users can view complaints based on role and ownership" ON public.complaints;

CREATE POLICY "Users can view complaints based on role and ownership"
ON public.complaints
FOR SELECT
USING (
  -- Admins and staff can see all complaints
  (get_current_user_role() = ANY (ARRAY['admin'::text, 'staff'::text]))
  -- Users can see their own complaints
  OR (auth.uid() IN (SELECT id FROM profiles WHERE id = submitter_id))
  -- Users can see complaints assigned to them
  OR (auth.uid() IN (SELECT id FROM profiles WHERE id = assigned_to))
  -- Users can see complaints in their assigned categories
  OR (category IN (
    SELECT c.name 
    FROM categories c
    JOIN user_categories uc ON uc.category_id = c.id
    JOIN profiles p ON p.id = uc.user_id
    WHERE p.id = (SELECT id FROM profiles WHERE user_id = auth.uid() LIMIT 1)
  ))
);

-- Insert default categories from the existing system
INSERT INTO public.categories (name) VALUES
  ('תחבורה ציבורית'),
  ('תשתיות'),
  ('ניקיון'),
  ('בטיחות'),
  ('אחר')
ON CONFLICT (name) DO NOTHING;