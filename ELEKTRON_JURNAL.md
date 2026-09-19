# Elektron Jurnal

Bu sənəd tələbə/müəllim Elektron Jurnal modulunun yekun DB arxitekturasını, biznes qaydalarını, rol icazələrini və audit testlərini təsvir edir.

## 1. Mənbələr və əsas axın

Elektron Jurnal legacy `attendance` / `notes` cədvəllərindən ayrı işləyir. Canonical akademik əlaqə aşağıdakı kimidir:

`group_members -> course_groups -> courses -> course_teachers`

Dərs planı və faktiki dərs ayrı saxlanılır:

- `course_schedule_templates` — həftəlik təkrarlanan dərs şablonu.
- `course_lesson_sessions` — konkret tarix/saatda baş tutan dərs sessiyası.
- `lesson_student_records` — sessiyadakı tələbənin davamiyyəti, gündəlik qiyməti və ya laboratoriya təqdimatı.
- `course_topics` — müəllimin fənn üzrə mövzu/material mənbəyi.

Qiymətləndirmə slotları:

- `independent_work_assessments` — hər tələbə/fənn üçün maksimum 2 sərbəst iş.
- `course_work_assessments` — `courses.kurs_isi_var=true` olduqda maksimum 1 kurs işi.
- `colloquium_assessments` — hər tələbə/fənn üçün 3 kollokvium.

## 2. Fənn konfiqurasiyası

`courses` üzərində Elektron Jurnal üçün əsas sahələr:

| Sahə | Məna |
| --- | --- |
| `qiymetlendirme_novu` | `meshgele` və ya `laboratoriya` |
| `kurs_isi_var` | Kurs işi komponentinin aktivliyi |
| `umumi_lab_sayi` | Laboratoriya komponentinin məxrəci |
| `umumi_ders_saati` | Davamiyyət üçün manual ümumi saat override-i |

Bu sahələri yalnız admin, dekan və fənn/qrupla əlaqəli tyutor dəyişə bilər. Müəllim qiymətləndirmə konfiqurasiyasını dəyişmir.

## 3. ÜST / ALT həftə rotasiyası

`system_settings`:

- `hefte_rotasiya_baslama_tarixi` — birinci həftənin Bazar ertəsi.
- `birinci_hefte_novu` — `ust` və ya `alt`.
- `tedris_hefte_sayi` — cari semestr üçün həftə sayı.

`public.get_week_parity(date)` verilən tarixin həftəsini anchor tarixindən hesablayır. Funksiya `SECURITY DEFINER` wrapper-dir; `private` schema istifadəçiyə açılmır.

`public.generate_course_lesson_sessions()` yalnız şablonun `gun_nomresi` və `hefte_novu` uyğun olduqda sessiya yaradır. `ust` və `alt` şablonları eyni gün/saatda konflikt sayılmır; ardıcıl həftələrdə növbələnir.

## 4. Müəllim qiymətləndirmə pəncərəsi

Müəllimin gündəlik davamiyyət/qiymət yazması yalnız bütün şərtlər ödənəndə mümkündür:

1. Müəllim `course_teachers`-də həmin fənnə təyin olunub.
2. Sessiyanın `teacher_id`-si həmin müəllimdir.
3. `course_teachers.icazeler[session.dars_novu] = true`.
4. Server vaxtı dərsin başlanğıcından 5 dəqiqə əvvəl ilə bitməsindən 5 dəqiqə sonrakı intervaldadır.

Bu yoxlama yalnız UI-də deyil, DB trigger və RLS səviyyəsində məcburidir. Əsas helper: `public.can_grade_now(...)` / `private.teacher_can_grade_lesson_at(...)`.

Sərbəst iş və kollokvium qiymətləndirməsində də müəllim canonical `course_teachers` təyinatına malik olmalıdır və uyğun aktiv sessiyanın ±5 dəqiqəlik pəncərəsi açıq olmalıdır. Kurs işi üçün həmin fənnin istənilən icazəli aktiv sessiyası grading window kimi qəbul edilir.

## 5. Təsdiq kilidi

`course_lesson_sessions.is_confirmed=true` olduqdan sonra sessiya akademik snapshot sayılır.

- `private.guard_confirmed_session` təsdiqlənmiş sessiyanın UPDATE/DELETE əməliyyatını rədd edir.
- `private.validate_lesson_student_record` həmin sessiyanın `lesson_student_records` sətrlərinin INSERT/UPDATE/DELETE əməliyyatını rədd edir.
- Yalnız audit səbəbi ilə admin/dekan üçün ayrıca controlled unlock RPC mövcuddur: `unlock_lesson_session`.

Beləliklə müəllim təsdiqdən sonra davamiyyət və gündəlik qiyməti dəyişə bilmir.

## 6. 50 ballıq semestr formulu

Frontend formul yazmır; canlı nəticə DB mühərrikindən gəlir. `exam_scores.semestr_qiymeti` Elektron Jurnal aktiv olduqda derived snapshot kimi sinxronlaşdırılır.

### Davamiyyət — maksimum 10

`m = təsdiqlənmiş qayıb sayı`, `l = ümumi dərs saatı`:

`max(0, 10 - (((m * 2) / l) * 10))`

Qayıb limiti: `floor(l / 8)`.

### Kollokvium

Üç kollokviumun ortası:

- kurs işi yoxdursa: `orta * 1.8`, maksimum 18;
- kurs işi varsa: `orta * 1.2`, maksimum 12.

### Sərbəst iş — maksimum 10

İki sərbəst işin 0–5 balları toplanır.

### Məşğələ

Təsdiqlənmiş dərslərin gündəlik qiymət ortası:

- kurs işi yoxdursa: `orta * 1.2`, maksimum 12;
- kurs işi varsa: `orta * 0.8`, maksimum 8.

### Laboratoriya

`təhvil verilmiş təsdiqlənmiş lab sayı / umumi_lab_sayi`:

- kurs işi yoxdursa maksimum 12;
- kurs işi varsa maksimum 8.

`umumi_lab_sayi` təyin edilməyibsə lab komponenti 0 qalır; sistem məxrəc uydurmur.

### Kurs işi — maksimum 10

Yalnız `kurs_isi_var=true` olduqda daxil edilir.

### Audit nümunəsi

`a=8, b=9, c=7, d=4, e=5, məşğələ_orta=8.5, l=64, m=3`, kurs işi yoxdur:

- Kollokvium: `(8+9+7)/3 * 1.8 = 14.40`
- Sərbəst iş: `4+5 = 9.00`
- Məşğələ: `8.5 * 1.2 = 10.20`
- Davamiyyət: `10 - ((3*2/64)*10) = 9.0625`
- Yekun semestr balı: `42.6625 -> 42.66`

Canlı DB `private.semester_score_components(...)` auditində nəticə dəqiq `42.66` olub.

## 7. Tələbə təqdimatları və Storage

Canonical private bucket: `course-materials`.

Tələbə təqdimat yolu:

`course-materials/<course_id>/student-submissions/<student_id>/<fayl>`

Tələbə yalnız öz `student_id` qovluğuna və yalnız aid olduğu fənn üçün upload edə bilər. DB sətrində də eyni prefix trigger ilə yoxlanır.

Tələbə:

- yalnız öz sərbəst iş/kurs işi/lab təqdimatını yaza bilər;
- `grade`, davamiyyət, sistem identifikatorları və `qiymetlendirilib` statusuna toxuna bilməz;
- artıq təqdim edilmiş slotu ikinci dəfə dəyişə bilməz;
- sərbəst iş üçün `sira` yalnız 1 və 2-dir;
- kurs işi üçün yalnız bir slot var;
- laboratoriya faylı yalnız `qiymetlendirme_novu=laboratoriya` olan fənnə yazıla bilər.

Müəllim və tyutor course-scope, admin/dekan isə tam Storage SELECT hüququna malikdir.

## 8. RLS rol matrisi

| Resurs | Tələbə | Müəllim | Tyutor | Admin / Dekan |
| --- | --- | --- | --- | --- |
| `course_schedule_templates` | öz fənn+qrupunda SELECT | təyin olunduğu fənndə SELECT | öz qrup/fənnində CRUD | tam CRUD |
| `course_lesson_sessions` | öz fənn+qrupunda SELECT | təyin olunduğu fənndə SELECT; UPDATE yalnız aktiv ±5 dəq | öz qrup/fənnində CRUD, confirmed lock qüvvədə | tam CRUD, confirmed lock/audit qaydaları qüvvədə |
| `lesson_student_records` | yalnız öz sətri; yalnız öz lab təqdimatı INSERT/UPDATE | öz `course_teachers` fənnində SELECT; grading INSERT/UPDATE yalnız ±5 dəq və `icazeler` | öz tələbələrində SELECT | tam giriş; DELETE yalnız admin/dekan policy-si |
| `independent_work_assessments` | yalnız öz sətri; submission INSERT/UPDATE; grade qadağan | assigned course SELECT; grading INSERT/UPDATE yalnız `serbest_is` pəncərəsində | öz tələbələrində SELECT/INSERT/UPDATE | tam giriş, DELETE |
| `course_work_assessments` | yalnız öz sətri; submission INSERT/UPDATE; grade qadağan | assigned course SELECT; grading aktiv course window-da | öz tələbələrində SELECT/INSERT/UPDATE | tam giriş, DELETE |
| `colloquium_assessments` | yalnız öz sətrini SELECT | assigned course SELECT; INSERT/UPDATE yalnız `kollokvium` pəncərəsində | öz tələbələrində SELECT/INSERT/UPDATE | tam giriş, DELETE |

Bütün altı yeni cədvəldə RLS aktivdir və ayrıca SELECT / INSERT / UPDATE / DELETE policy-si mövcuddur. `anon` table hüquqları revoke edilib; `authenticated` hüquqları yalnız RLS-dən keçərək işləyir.

## 9. Realtime

Tələbə paneli aşağıdakı dəyişiklikləri dinləyir:

- `course_lesson_sessions`
- `lesson_student_records`
- `exam_scores`
- `independent_work_assessments`
- `course_work_assessments`
- `colloquium_assessments`

Realtime hadisəsi TanStack Query cache-ni invalidate edir. Əlavə təhlükəsizlik üçün 30 saniyəlik refetch fallback mövcuddur.

## 10. Köhnə dashboard uyğunluğu

Yeni jurnal legacy `attendance` cədvəlinə dual-write etmir.

`faculty_stats` və `group_stats` `security_invoker=true` view-larıdır və davamiyyəti yalnız:

`lesson_student_records JOIN course_lesson_sessions WHERE is_confirmed=true`

üzərindən hesablayır. Score-lar `exam_scores`-dan əvvəlcədən aggregate edilir. Bu quruluş köhnə attendance/exam join row-multiplication problemini də aradan qaldırır.

## 11. İmtahanlar səhifəsi ilə uyğunluq

Elektron Jurnal aktiv olduqda `exam_scores.semestr_qiymeti` formula nəticəsidir. Müəllim panelində semestr balı sərbəst yazılan input olmamalıdır; yalnız oxunan formula nəticəsi kimi göstərilir. Müəllim yalnız imtahan balını daxil edir.

DB səviyyəsində `private.enforce_exam_semester_score` Elektron Jurnal datası mövcud olduqda manual `semestr_qiymeti` dəyərini formula ilə əvəz edir; frontend read-only davranışı bunun UX qarşılığıdır.

## 12. Testlər

### Unit

`bun test src/lib/electronic-journal.test.ts src/lib/schedule.test.ts`

Əhatə edir:

- 42.66 audit formula nümunəsi;
- məşğələ/laboratoriya və kurs işi budaqları;
- maksimum 50 clamp;
- qayıb limiti;
- ÜST/ALT parity;
- ±5 dəqiqə window;
- `icazeler` və assigned-teacher client gate;
- ÜST və ALT eyni saat conflict qaydası.

### SQL struktur auditi

`supabase/tests/elektron_jurnal_audit.sql`

Heç bir production data saxlamır; transaction sonunda `ROLLBACK` edir. RLS, policy sayı, trigger-lər, 42.66 formula nümunəsi, week parity, time window, sərbəst iş slot constraint-i, Storage policy-ləri və stats view mənbələri yoxlanılır.

### Canlı rollback ssenariləri

Yekun audit zamanı real `authenticated` rolu ilə production sxemində transaction/rollback testləri aparılıb:

- tələbə başqa tələbənin assessment sətrini görə bilmədi;
- tələbənin `grade` UPDATE-i `Tələbə qiymət sahəsinə toxuna bilməz` ilə rədd edildi;
- teacher window: daxilində `true`, xaricində `false`;
- ÜST template 2026-09-14, ALT template 2026-09-21 sessiyası yaratdı;
- `is_confirmed=true` sonrası sessiya UPDATE-i `Təsdiqlənmiş dərs sessiyası dəyişdirilə və ya silinə bilməz` ilə rədd edildi;
- üçüncü sərbəst iş `independent_work_assessments_sira_check` ilə rədd edildi;
- qayıb limiti 1 olan fixture-də 2 qayıb `at_risk_students`-da tələbənin telefon/e-poçt məlumatları ilə qaytarıldı;
- `faculty_stats` / `group_stats` yeni jurnal mənbələrini istifadə edir və admin/dekan baxışında aggregate-lər işləyir.

## 13. Məlumat konfiqurasiyası

Kod və RLS-dən ayrı olaraq real akademik istifadədən əvvəl aşağıdakı data doldurulmalıdır:

- `course_teachers` müəllim təyinatları və `icazeler`;
- hər fənnin `qiymetlendirme_novu`;
- laboratoriya fənnlərində `umumi_lab_sayi`;
- `course_topics`;
- `system_settings.hefte_rotasiya_baslama_tarixi` və `birinci_hefte_novu`;
- dərs şablonları və semestr sessiyalarının generasiyası.

Bu sahələrin boş olması təhlükəsizlik xətası deyil, akademik konfiqurasiya borcudur.
