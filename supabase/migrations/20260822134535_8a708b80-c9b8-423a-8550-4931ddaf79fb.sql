-- ============================================================
-- QEYD (TƏMİZLİK): Bu miqrasiya faylı əvvəllər
-- 20260822120000_add_exam_detailed_results.sql-in TƏKRARI idi —
-- hər ikisi eyni `exam_detailed_results` cədvəlini `IF NOT EXISTS`
-- ilə yaradırdı. Xəta törətmirdi, amma çaşdırıcı idi.
--
-- Cədvəl artıq canlı bazada mövcuddur və bu fayl da tətbiq olunmuş
-- kimi qeydə alınıb. Məlumat itkisinin qarşısını almaq üçün fayl
-- saxlanılır, lakin məzmunu no-op-a endirilib. Bütün real sxem
-- 20260822120000_add_exam_detailed_results.sql faylındadır.
-- ============================================================

SELECT 1;
