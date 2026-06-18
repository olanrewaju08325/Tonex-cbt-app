-- 023_new_features.sql
-- Migration to support:
-- 1. Topics for questions
-- 2. Flashcards
-- 3. Weekly Leaderboard

-- 1. Add topic column to questions table
ALTER TABLE public.questions ADD COLUMN IF NOT EXISTS topic text;

-- 2. Create flashcards table
CREATE TABLE IF NOT EXISTS public.flashcards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_id uuid REFERENCES public.subjects(id) ON DELETE SET NULL,
  front text NOT NULL,
  back text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS for flashcards
ALTER TABLE public.flashcards ENABLE ROW LEVEL SECURITY;

-- Select policies
DROP POLICY IF EXISTS "flashcards_select_auth" ON public.flashcards;
CREATE POLICY "flashcards_select_auth" ON public.flashcards 
  FOR SELECT USING (true);

-- Admin modification policies
DROP POLICY IF EXISTS "flashcards_admin_all" ON public.flashcards;
CREATE POLICY "flashcards_admin_all" ON public.flashcards 
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','superadmin'))
  );

-- 3. Create weekly leaderboard function
DROP FUNCTION IF EXISTS public.get_weekly_leaderboard(uuid);
CREATE OR REPLACE FUNCTION public.get_weekly_leaderboard(p_university_id uuid DEFAULT NULL)
RETURNS TABLE (
  user_id uuid, full_name text, university_short_name text,
  avg_score numeric, total_exams bigint
) LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
    SELECT
      p.id AS user_id,
      p.full_name,
      u.short_name AS university_short_name,
      ROUND(AVG(s.score_percentage), 1) AS avg_score,
      COUNT(s.id) AS total_exams
    FROM public.profiles p
    JOIN public.exam_sessions s ON s.user_id = p.id
    LEFT JOIN public.universities u ON u.id = p.target_university_id
    WHERE (p_university_id IS NULL OR p.target_university_id = p_university_id)
      AND s.completed_at >= NOW() - INTERVAL '7 days'
    GROUP BY p.id, p.full_name, u.short_name
    HAVING COUNT(s.id) >= 1
    ORDER BY avg_score DESC
    LIMIT 100;
END;
$$;

-- 4. Seed some flashcards and assign topics to existing questions
DO $$
DECLARE
    sub_english uuid;
    sub_math uuid;
    sub_physics uuid;
    sub_chem uuid;
    sub_bio uuid;
BEGIN
    SELECT id INTO sub_english FROM public.subjects WHERE slug = 'english';
    SELECT id INTO sub_math FROM public.subjects WHERE slug = 'mathematics';
    SELECT id INTO sub_physics FROM public.subjects WHERE slug = 'physics';
    SELECT id INTO sub_chem FROM public.subjects WHERE slug = 'chemistry';
    SELECT id INTO sub_bio FROM public.subjects WHERE slug = 'biology';

    -- Assign topics to existing seeded questions
    UPDATE public.questions SET topic = 'Lexis and Structure' WHERE subject_id = sub_english;
    UPDATE public.questions SET topic = 'Logarithms & Algebra' WHERE subject_id = sub_math;
    UPDATE public.questions SET topic = 'Mechanics & Vectors' WHERE subject_id = sub_physics;
    UPDATE public.questions SET topic = 'General Chemistry' WHERE subject_id = sub_chem;
    UPDATE public.questions SET topic = 'Cell Biology' WHERE subject_id = sub_bio;

    -- Seed Flashcards
    INSERT INTO public.flashcards (subject_id, front, back) VALUES
    -- Physics
    (sub_physics, 'Newton''s Second Law of Motion', 'Force equals mass times acceleration (F = ma). The acceleration of an object is directly proportional to the net force acting on it.'),
    (sub_physics, 'Ohms Law', 'The current through a conductor between two points is directly proportional to the voltage across the two points. V = IR (Voltage = Current x Resistance).'),
    (sub_physics, 'Work-Energy Theorem', 'The net work done on an object is equal to the change in its kinetic energy (W = ΔKE).'),
    
    -- Chemistry
    (sub_chem, 'Avogadro''s Number', 'The number of constituent particles (usually atoms or molecules) in one mole of a given substance: 6.022 × 10²³.'),
    (sub_chem, 'Boyle''s Law', 'At constant temperature, the volume of a given mass of gas is inversely proportional to its pressure. (P₁V₁ = P₂V₂).'),
    (sub_chem, 'Charles''s Law', 'At constant pressure, the volume of a given mass of gas is directly proportional to its absolute temperature in Kelvin. (V₁/T₁ = V₂/T₂).'),
    
    -- Math
    (sub_math, 'Quadratic Formula', 'x = (-b ± √(b² - 4ac)) / 2a. Used to find the roots of a quadratic equation ax² + bx + c = 0.'),
    (sub_math, 'Derivative of sin(x)', 'The derivative of sin(x) with respect to x is cos(x).'),
    (sub_math, 'Pythagorean Theorem', 'In a right-angled triangle, the square of the hypotenuse is equal to the sum of the squares of the other two sides: a² + b² = c².'),
    
    -- English
    (sub_english, 'Active vs Passive Voice', 'Active: The subject performs the action (e.g., "The cat chased the mouse"). Passive: The subject receives the action (e.g., "The mouse was chased by the cat").'),
    (sub_english, 'Noun Clause', 'A dependent clause that functions as a noun. It can be a subject, object, or complement in a sentence (e.g., "What she said was interesting").')
    ON CONFLICT DO NOTHING;
END $$;
