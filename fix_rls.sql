-- 1. Bildirim RLS Düzeltmesi
DROP POLICY IF EXISTS "herkes kendi bildirimlerini görür" ON notifications;
DROP POLICY IF EXISTS "notifications: select, update, delete kendi bildirimleri" ON notifications;
DROP POLICY IF EXISTS "notifications: insert ayni kurum" ON notifications;

-- Okuma, Güncelleme, Silme işlemleri sadece KENDİ bildirimleri için:
CREATE POLICY "notifications: select, update, delete kendi bildirimleri" ON notifications
  FOR ALL USING (user_id = auth.uid());

-- Ekleme işlemi: Aynı kurumdan olan başka biri için de eklenebilir (takas/onay vs için):
CREATE POLICY "notifications: insert ayni kurum" ON notifications
  FOR INSERT WITH CHECK (
    institution_id = (SELECT institution_id FROM profiles WHERE id = auth.uid())
  );

-- 2. Test Bildirimleri
INSERT INTO notifications (user_id, institution_id, title, body, type, is_read) 
VALUES (
  'e2f47917-ad6e-4ed4-afff-4383e09b002a', 
  'f92beb3d-30f3-4b0e-9e9c-bba98b7c9730', 
  'Test Bildirimi (Elif)', 
  'Bu bir test bildirimidir', 
  'schedule_published', 
  false
);

INSERT INTO notifications (user_id, institution_id, title, body, type, is_read) 
VALUES (
  '1c8ad85c-3f89-4da5-b832-0878a0a3c6da', 
  'f92beb3d-30f3-4b0e-9e9c-bba98b7c9730', 
  'Test Bildirimi (İsmail)', 
  'Bu bir test bildirimidir', 
  'schedule_published', 
  false
);

-- 3. constraint_type enum güncellemesi
ALTER TYPE constraint_type ADD VALUE IF NOT EXISTS 'required_on_date';
