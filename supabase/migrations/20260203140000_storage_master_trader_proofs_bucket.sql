-- KLINEO: Storage bucket for Master Trader application screenshots (proof of performance).
-- Public read so admin panel can display images without signed URLs.

INSERT INTO storage.buckets (id, name, public)
VALUES ('master-trader-proofs', 'master-trader-proofs', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

-- RLS: authenticated users can upload only in their own folder (path: {user_id}/...)
DROP POLICY IF EXISTS "Users can upload own master trader proof" ON storage.objects;
CREATE POLICY "Users can upload own master trader proof"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'master-trader-proofs'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Public read so admin can view screenshots
DROP POLICY IF EXISTS "Master trader proofs are publicly readable" ON storage.objects;
CREATE POLICY "Master trader proofs are publicly readable"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'master-trader-proofs');
