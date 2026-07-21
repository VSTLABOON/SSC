-- Migration to add missing columns to public.asistencias table
ALTER TABLE public.asistencias ADD COLUMN IF NOT EXISTS observaciones TEXT;
ALTER TABLE public.asistencias ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL;
