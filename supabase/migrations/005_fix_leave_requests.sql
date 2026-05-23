-- ============================================================
-- 005_fix_leave_requests.sql
-- İzin talepleri ile ilgili 3 kritik düzeltme:
--   1) notification_type enum'una 'leave_request' eklenmesi
--   2) leave_requests tablosuna reviewer_note sütunu eklenmesi
--   3) leave_requests.institution_id için index eklenmesi
-- ============================================================

-- 1. notification_type enum'una 'leave_request' ekle
-- Bu değer olmadığı için bildirim insert'i sessizce başarısız oluyordu.
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'leave_request';

-- 2. leave_requests tablosuna reviewer_note sütunu ekle
-- Onay/red sırasında yönetici notu yazabilmek için gerekli.
ALTER TABLE leave_requests
  ADD COLUMN IF NOT EXISTS reviewer_note TEXT;

-- 3. institution_id üzerinde index oluştur (admin sorguları hızlansın)
CREATE INDEX IF NOT EXISTS idx_leave_requests_institution
  ON leave_requests(institution_id);
