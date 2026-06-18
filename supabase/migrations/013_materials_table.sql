-- ============================================================
-- 013_materials_table.sql
-- Create materials table for PDF study guides and past questions
-- ============================================================

CREATE TABLE IF NOT EXISTS materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  file_url text NOT NULL,
  subject_id uuid REFERENCES subjects(id) ON DELETE SET NULL,
  university_id uuid REFERENCES universities(id) ON DELETE SET NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE materials ENABLE ROW LEVEL SECURITY;

-- Everyone can read active materials
DROP POLICY IF EXISTS "materials_select_all" ON materials;
CREATE POLICY "materials_select_all" ON materials FOR SELECT USING (is_active = true);

-- Admins can do everything
DROP POLICY IF EXISTS "materials_admin_all" ON materials;
CREATE POLICY "materials_admin_all" ON materials FOR ALL USING (is_admin());

-- Create a storage bucket for materials if not exists
INSERT INTO storage.buckets (id, name, public) 
VALUES ('materials', 'materials', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for materials bucket
DROP POLICY IF EXISTS "materials_bucket_select" ON storage.objects;
CREATE POLICY "materials_bucket_select" ON storage.objects FOR SELECT 
USING (bucket_id = 'materials');

DROP POLICY IF EXISTS "materials_bucket_insert" ON storage.objects;
CREATE POLICY "materials_bucket_insert" ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'materials' AND is_admin());

DROP POLICY IF EXISTS "materials_bucket_update" ON storage.objects;
CREATE POLICY "materials_bucket_update" ON storage.objects FOR UPDATE 
USING (bucket_id = 'materials' AND is_admin());

DROP POLICY IF EXISTS "materials_bucket_delete" ON storage.objects;
CREATE POLICY "materials_bucket_delete" ON storage.objects FOR DELETE 
USING (bucket_id = 'materials' AND is_admin());
