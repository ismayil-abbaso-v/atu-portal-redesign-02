# ATU Portal — Production əlaqə və təhlükəsizlik auditi

Bu sənəd 2026-08-29 tarixində canlı Supabase layihəsi üzərində aparılmış yekun auditin source qeydidir.

## Kanonik əlaqə modeli

- Tələbə: `profiles -> group_members -> groups -> course_groups (cari tədris ili/semestr) -> courses`.
- Müəllim: `course_teachers` əsas mənbədir; `courses.muellim_id` yalnız legacy uyğunluq üçündür.
- Tyutor: `groups.tyutor_id` və uyğun cari `course_groups`; `courses.tyutor_id` legacy/direct təyinatı dəstəkləyir.
- Dekan: profil fakültəsi `faculties` ilə normallaşdırılır və idarəetmə öz fakültəsi ilə məhdudlaşır.
- Admin: universitet səviyyəsində tam idarəetmə.
- Elektron jurnal: `course_schedule_templates -> course_lesson_sessions -> lesson_student_records`; qiymətləndirmələr fixed-slot assessment cədvəllərindədir.

## Məcburi biznes qaydaları

- Tələbə tarixi `course_groups` əlaqələrindən cari jurnal/chat məlumatı əldə etmir.
- Müəllim gündəlik qiymətləndirməni yalnız `course_teachers.icazeler` və ±5 dəqiqə vaxt pəncərəsi daxilində təsdiqləyir.
- `is_confirmed=true` sessiyanın tələbə qeydləri DB trigger ilə kilidlənir.
- Semestr balı backend formula mühərrikindən gəlir; legacy imtahan görünüşlərində derived/read-only dəyərdir.
- Sərbəst iş 2, kurs işi 1, kollokvium 3 fixed slotdur.
- Student submission Storage yolu `course-materials/<course>/student-submissions/<student>/...` və RLS ilə owner/course scopedur.
- `faculty_stats` və `group_stats` `security_invoker=true` view-lardır və təsdiqlənmiş jurnal davamiyyətindən hesablanır.

## Təhlükəsizlik nəticəsi

- Bütün `public` base table-larda RLS aktivdir.
- `anon` rolunun `public` base table-larda SELECT imtiyazı yoxdur.
- Privileged relation helper-lər exposed olmayan `private` schema-dadır; public API wrapper-ləri `SECURITY INVOKER` işləyir.
- Storage policy-ləri rol adına yox, real fakültə/qrup/fənn/tələbə əlaqəsinə görə scope olunur.
- Supabase Security Advisor-da DB/RLS warning yoxdur. Qalan platform warning: Auth Leaked Password Protection hesab ayarından aktiv edilməlidir.

## Regression testləri

Canlı DB-də rollback fixture-lərlə admin/dekan/tyutor/müəllim/tələbə visibility və write scope, cross-faculty bloklama, cari semestr, chat, Storage, ±5 dəqiqə, təsdiq kilidi, 42.66 formula nümunəsi, fixed assessment slotları və stats view uyğunluğu yoxlanıb.

## Akademik konfiqurasiya

Kod təhlükəsizdir, amma real semestr başlamazdan əvvəl universitet admini cari fənnləri yaratmalı, `course_groups` ilə cari dövrə bağlamalı, müəllim/tyutor təyinatlarını, qiymətləndirmə növünü, lab sayını/dərs saatını və həftə rotasiyasını real akademik məlumatla doldurmalıdır. Tarixi transkript fənnlərinə bu məlumat avtomatik uydurulmur.
