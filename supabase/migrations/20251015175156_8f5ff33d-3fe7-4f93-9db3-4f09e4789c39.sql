-- Add visible column to complaints table
ALTER TABLE public.complaints 
ADD COLUMN IF NOT EXISTS visible boolean NOT NULL DEFAULT true;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_complaints_visible ON public.complaints(visible);