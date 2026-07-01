-- 034_bulk_insert_questions_rpc.sql

CREATE OR REPLACE FUNCTION public.bulk_insert_questions(p_questions jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inserted_count int := 0;
  v_skipped_count int := 0;
  v_q jsonb;
  v_text text;
  v_subject_id uuid;
  v_university_id uuid;
  v_correct_answer text;
  v_option_a text;
  v_option_b text;
  v_option_c text;
  v_option_d text;
  v_explanation text;
  v_year int;
  v_created_by uuid;
BEGIN
  -- Verify requester is administrator
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('admin', 'superadmin')
  ) THEN
    RAISE EXCEPTION 'Unauthorized: Only administrators can upload questions.';
  END IF;

  FOR v_q IN SELECT * FROM jsonb_array_elements(p_questions) LOOP
    v_text := TRIM(v_q->>'text');
    v_subject_id := NULL;
    v_university_id := NULL;
    
    -- Safe typecasting
    IF v_q->>'subject_id' IS NOT NULL AND v_q->>'subject_id' <> '' THEN
      v_subject_id := (v_q->>'subject_id')::uuid;
    END IF;
    
    IF v_q->>'university_id' IS NOT NULL AND v_q->>'university_id' <> '' THEN
      v_university_id := (v_q->>'university_id')::uuid;
    END IF;
    
    v_correct_answer := TRIM(v_q->>'correct_answer');
    v_option_a := TRIM(v_q->>'option_a');
    v_option_b := TRIM(v_q->>'option_b');
    v_option_c := TRIM(v_q->>'option_c');
    v_option_d := TRIM(v_q->>'option_d');
    v_explanation := TRIM(v_q->>'explanation');
    v_year := NULL;
    
    IF v_q->>'year' IS NOT NULL AND v_q->>'year' <> '' THEN
      v_year := (v_q->>'year')::int;
    END IF;
    
    v_created_by := auth.uid();

    IF v_subject_id IS NULL OR v_text IS NULL OR v_text = '' THEN
      v_skipped_count := v_skipped_count + 1;
      CONTINUE;
    END IF;

    -- Check if question already exists in public.questions case-insensitively (trimmed)
    IF EXISTS (
      SELECT 1 FROM public.questions 
      WHERE subject_id = v_subject_id 
        AND TRIM(LOWER(text)) = TRIM(LOWER(v_text))
    ) THEN
      v_skipped_count := v_skipped_count + 1;
    ELSE
      INSERT INTO public.questions (
        subject_id, university_id, text, option_a, option_b, option_c, option_d, 
        correct_answer, explanation, year, created_by, is_published
      ) VALUES (
        v_subject_id, v_university_id, v_text, v_option_a, v_option_b, v_option_c, v_option_d,
        v_correct_answer, v_explanation, v_year, v_created_by, true
      );
      v_inserted_count := v_inserted_count + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'inserted', v_inserted_count,
    'skipped', v_skipped_count
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.bulk_insert_questions(jsonb) TO authenticated;
