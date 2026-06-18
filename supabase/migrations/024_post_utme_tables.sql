-- supabase/migrations/024_post_utme_tables.sql
-- Create table for university departmental cut-off aggregates

CREATE TABLE IF NOT EXISTS public.university_cut_off_marks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id uuid NOT NULL REFERENCES public.universities(id) ON DELETE CASCADE,
  department text NOT NULL,
  year int NOT NULL,
  cutoff_aggregate numeric(5,2) NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(university_id, department, year)
);

-- Enable RLS
ALTER TABLE public.university_cut_off_marks ENABLE ROW LEVEL SECURITY;

-- Select policies (anyone can read)
DROP POLICY IF EXISTS "cutoff_marks_select" ON public.university_cut_off_marks;
CREATE POLICY "cutoff_marks_select" ON public.university_cut_off_marks FOR SELECT USING (true);

-- Modification policies (only admins/superadmins)
DROP POLICY IF EXISTS "cutoff_marks_all_admin" ON public.university_cut_off_marks;
CREATE POLICY "cutoff_marks_all_admin" ON public.university_cut_off_marks FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','superadmin'))
);

-- Seed some cut-off marks for popular target universities (UI, UNILAG, OAU, UNIBEN)
DO $$
DECLARE
    uni_unilag uuid;
    uni_ui uuid;
    uni_oau uuid;
    uni_uniben uuid;
BEGIN
    SELECT id INTO uni_unilag FROM public.universities WHERE short_name = 'UNILAG';
    SELECT id INTO uni_ui FROM public.universities WHERE short_name = 'UI';
    SELECT id INTO uni_oau FROM public.universities WHERE short_name = 'OAU';
    SELECT id INTO uni_uniben FROM public.universities WHERE short_name = 'UNIBEN';

    IF uni_unilag IS NOT NULL THEN
        INSERT INTO public.university_cut_off_marks (university_id, department, year, cutoff_aggregate) VALUES
        (uni_unilag, 'Medicine & Surgery', 2024, 80.50),
        (uni_unilag, 'Computer Science', 2024, 76.25),
        (uni_unilag, 'Law', 2024, 78.00),
        (uni_unilag, 'Accounting', 2024, 72.50)
        ON CONFLICT DO NOTHING;
    END IF;

    IF uni_ui IS NOT NULL THEN
        INSERT INTO public.university_cut_off_marks (university_id, department, year, cutoff_aggregate) VALUES
        (uni_ui, 'Medicine & Surgery', 2024, 82.35),
        (uni_ui, 'Computer Science', 2024, 74.00),
        (uni_ui, 'Law', 2024, 77.50),
        (uni_ui, 'Nursing Science', 2024, 70.80)
        ON CONFLICT DO NOTHING;
    END IF;

    IF uni_oau IS NOT NULL THEN
        INSERT INTO public.university_cut_off_marks (university_id, department, year, cutoff_aggregate) VALUES
        (uni_oau, 'Medicine & Surgery', 2024, 79.80),
        (uni_oau, 'Computer Science', 2024, 71.50),
        (uni_oau, 'Law', 2024, 75.25)
        ON CONFLICT DO NOTHING;
    END IF;
END $$;
