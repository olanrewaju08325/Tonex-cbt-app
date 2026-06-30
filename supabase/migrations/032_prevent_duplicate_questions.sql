-- 032_prevent_duplicate_questions.sql

-- 1. Clean up existing duplicate questions
-- We keep the earliest entered question (minimum ID or minimum created_at)
DELETE FROM public.questions q1
USING public.questions q2
WHERE q1.id > q2.id 
  AND q1.subject_id = q2.subject_id 
  AND TRIM(LOWER(q1.text)) = TRIM(LOWER(q2.text));

-- 2. Create a unique constraint/index on (subject_id, text)
-- To prevent future duplicate questions for the same subject
ALTER TABLE public.questions 
ADD CONSTRAINT unique_subject_question_text UNIQUE (subject_id, text);
