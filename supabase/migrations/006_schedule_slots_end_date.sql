-- Migration: schedule_slots tablosuna end_date kolonu ekle
-- 24 saati aşan nöbetlerde bitiş tarihi başlangıç tarihinden farklı olabilir
-- Örn: 09:00 başlayan 24 saatlik nöbet → end_date = date + 1 gün

ALTER TABLE schedule_slots
ADD COLUMN IF NOT EXISTS end_date DATE;

-- Mevcut slotlar için end_date = date (aynı gün bitişi varsay)
-- (opsiyonel, NULL bırakılabilir — uygulama NULL'ı date ile aynı kabul eder)
-- UPDATE schedule_slots SET end_date = date WHERE end_date IS NULL;

COMMENT ON COLUMN schedule_slots.end_date IS
  'Nöbet bitiş tarihi. 24 saati aşan nöbetlerde date+1 olabilir. NULL ise date ile aynıdır.';
