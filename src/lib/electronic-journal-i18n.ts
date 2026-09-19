import { useCallback, useMemo } from "react";

import { useI18n, type Locale } from "@/lib/i18n";

const az = {
  "page.title": "Elektron jurnal",
  "page.description": "Dərs davamiyyəti və gündəlik qiymətləndirmə jurnalı.",
  "page.loading": "Elektron jurnal yüklənir",
  "page.roleOnly": "Elektron jurnalın gündəlik görünüşü müəllim və tələbə rolları üçün nəzərdə tutulub.",
  "common.view": "Bax",
  "common.save": "Saxla",
  "common.cancel": "Ləğv et",
  "common.confirm": "Təsdiqlə",
  "common.score": "Bal",
  "common.scoreUnit": "bal",
  "common.date": "Tarix",
  "common.topic": "Mövzu",
  "common.file": "Fayl",
  "common.attendance": "Davamiyyət",
  "common.grade": "Qiymət",
  "common.student": "Tələbə",
  "common.group": "Qrup",
  "common.status": "Status",
  "common.fileOpenError": "Fayl açıla bilmədi.",
  "common.present": "İştirak edib",
  "common.absent": "Qayıb",
  "common.practice": "Məşğələ",
  "common.laboratory": "Laboratoriya",
  "common.independentWork": "Sərbəst iş",
  "common.courseWork": "Kurs işi",
  "common.colloquium": "Kollokvium",
  "common.active": "Aktiv",
  "common.confirmed": "Təsdiqlənib",
  "common.locked": "Kilidli",
  "common.notConfigured": "Ayarlanmayıb",
  "common.currentSemester": "Cari semestr", "common.none": "Yoxdur", "teacher.work": "İş", "teacher.activeLesson": "Aktiv dərs",
  "student.noCourses": "Cari semestr üçün elektron jurnalda fənn təyin edilməyib.",
  "student.currentCourse": "Cari fənn",
  "student.chooseCourse": "Fənn seçin",
  "student.changeCourse": "Fənni dəyiş",
  "student.courseCount": "{count} fənn",
  "student.uploadAssignment": "Tapşırıq yüklə",
  "student.academicResult": "Akademik nəticə",
  "student.currentEvaluation": "Cari qiymətləndirmə",
  "student.hideBreakdown": "Bölgünü gizlət",
  "student.detailedBreakdown": "Detallı bölgü",
  "student.semester": "Semestr",
  "student.exam": "İmtahan",
  "student.final": "Yekun",
  "student.max50": "Maksimum 50 bal",
  "student.examResult": "İmtahan nəticəsi",
  "student.totalResult": "Ümumi nəticə",
  "student.scoreComposition": "Semestr balının tərkibi",
  "student.liveFormula": "Formula mühərrikindən canlı hesablanır",
  "student.gradingNotConfigured": "Bu fənn üçün qiymətləndirmə növü hələ təyin edilməyib. Semestr balı mövcud nəticədən göstərilir, detallı bölgü konfiqurasiya tamamlandıqda aktiv olacaq.",
  "student.lessons": "Dərslər",
  "student.independentWork": "Sərbəst iş",
  "student.courseWork": "Kurs işi",
  "student.colloquium": "Kollokvium",
  "student.dailyLessons": "Gündəlik dərslər",
  "student.confirmedLessons": "Müəllim tərəfindən təsdiqlənmiş dərslər",
  "student.independentWorks": "Sərbəst işlər",
  "student.max2Submissions": "Maksimum 2 təqdimat",
  "student.finalCourseWork": "Fənn üzrə yekun kurs işi",
  "student.colloquiums": "Kollokviumlar",
  "student.threeAssessments": "Semestr üzrə 3 qiymətləndirmə",
  "student.absenceSummary": "{absent} qayıb • {percent}% iştirak",
  "student.attendanceNormal": "Davamiyyət normaldır",
  "student.attendanceRisk": "Davamiyyət riski",
  "student.noLessons": "Hələ dərs yoxdur",
  "student.noConfirmedLessons": "Hələ təsdiqlənmiş dərs yoxdur",
  "student.confirmedLessonHint": "Müəllim dərsi təsdiqlədikdə burada dərhal görünəcək.",
  "student.topicMissing": "Mövzu göstərilməyib",
  "student.labSubmitted": "Lab təhvil verilib",
  "student.independentOrdinal": "{n}-ci sərbəst iş",
  "student.ordinal": "{n}-ci",
  "student.submitAssignment": "Tapşırıq təqdim et",
  "student.uploadDescription": "Laboratoriya, sərbəst iş və kurs işi fayllarını təhlükəsiz şəkildə yükləyin.",
  "student.uploadFile": "Fayl yüklə",
  "student.submitDialogTitle": "Tapşırığı təqdim et",
  "student.submitDialogDescription": "{course} üzrə tapşırıq növünü və mövzunu seçib faylınızı təhlükəsiz yükləyin.",
  "student.assignmentType": "Tapşırıq növü",
  "student.chooseType": "Növü seçin",
  "student.chooseTopic": "Mövzunu seçin",
  "student.topicNotAdded": "Mövzu əlavə edilməyib",
  "student.fileSelected": "Fayl seçildi",
  "student.dropFile": "Faylı seçin və ya bura sürüşdürün",
  "student.maxFile25": "Maksimum fayl ölçüsü 25 MB",
  "student.submit": "Təhvil ver",
  "student.submitSuccess": "Tapşırıq uğurla təhvil verildi.",
  "student.chooseTypeError": "Tapşırıq növünü seçin.",
  "student.chooseTopicError": "Mövzunu seçin.",
  "student.chooseFileError": "Fayl seçin.",
  "student.fileTooLarge": "Faylın ölçüsü 25 MB-dan böyük ola bilməz.",
  "student.topicNotFound": "Seçilən mövzu tapılmadı.",
  "student.topicAlreadySubmitted": "Bu mövzu üzrə artıq təhvil vermisiniz.",
  "student.independentLimit": "Sərbəst iş üçün boş təhvil sətri yoxdur. Artıq maksimum 2 iş təqdim edilib.",
  "student.courseWorkDisabled": "Bu fənn üçün kurs işi aktiv deyil.",
  "student.courseWorkMissing": "Kurs işi sətri yaradılmayıb.",
  "student.alreadySubmitted": "Artıq təhvil vermisiniz.",
  "student.notLaboratoryCourse": "Bu fənn laboratoriya tipli deyil.",
  "student.noOpenLabSession": "Bu mövzu üçün açıq laboratoriya sessiyası tapılmadı.",
  "student.noLabRecord": "Bu laboratoriya sessiyası üçün tələbə sətri tapılmadı.",
  "student.limitFull": "limit dolub",
  "student.submitted": "təhvil verilib",
  "teacher.noCourses": "course_teachers üzrə sizə təyin edilmiş fənn yoxdur.",
  "teacher.courseLessonSelection": "Fənn və dərs seçimi",
  "teacher.activeWindowHint": "Aktiv qiymətləndirmə pəncərəsi olan dərs avtomatik vurğulanır.",
  "teacher.activeLessonNow": "İndi aktiv dərs var",
  "teacher.noActiveLesson": "Aktiv dərs yoxdur",
  "teacher.gradingTypeMissing": "Qiymətləndirmə növü seçilməyib",
  "teacher.session": "Dərs sessiyası",
  "teacher.chooseSession": "Dərs sessiyası seçin",
  "teacher.gradingOpen": "Qiymətləndirmə açıqdır",
  "teacher.gradingClosed": "Vaxt pəncərəsi bağlıdır",
  "teacher.dailyTab": "Gündəlik qiymətləndirmə",
  "teacher.worksTab": "Sərbəst / Kurs işi",
  "teacher.noSessions": "Bu fənn üçün dərs sessiyası yoxdur.",
  "teacher.dailyTitle": "Gündəlik dərs qiymətləndirməsi",
  "teacher.lockedHint": "Bu dərs təsdiqlənib. Mövzu, davamiyyət və qiymətlər artıq dəyişdirilə bilməz.",
  "teacher.windowClosedHint": "Qiymətləndirmə pəncərəsi bağlıdır. Sahələr yalnız dərsin başlanğıcından 5 dəqiqə əvvəl başlayaraq bitməsindən 5 dəqiqə sonraya qədər aktiv olur.",
  "teacher.courseConfigHint": "Bu fənn üçün qiymətləndirmə növü seçilməyib. Admin/tyutor fənni “Məşğələ” və ya “Laboratoriya” kimi konfiqurasiya etməlidir.",
  "teacher.topicPlaceholder": "Bu gün keçirilən mövzunu yazın...",
  "teacher.noStudentRecords": "Bu sessiya üçün tələbə qeydi yoxdur.",
  "teacher.labSubmitted": "Lab təhvil verildi",
  "teacher.confirmAll": "Hamısını Təsdiqlə",
  "teacher.confirmTitle": "Dərsi təsdiqləyib kilidləmək?",
  "teacher.confirmDescription": "Mövzu, bütün tələbələrin davamiyyəti və qiymətləndirmələri yadda saxlanacaq. Təsdiqdən sonra müəllim bu sessiyanı dəyişə bilməyəcək.",
  "teacher.topicRequired": "Dərsin mövzusunu daxil edin.",
  "teacher.attendanceRequired": "Bütün tələbələrin davamiyyətini seçin.",
  "teacher.studentGradeRange": "{student}: qiymət 0-10 aralığında olmalıdır.",
  "teacher.confirmFailed": "Dərs təsdiqlənmədi.",
  "teacher.confirmSuccess": "Dərs təsdiqləndi və jurnal kilidləndi.",
  "teacher.worksTitle": "Sərbəst iş / Kurs işi qiymətləndirməsi",
  "teacher.worksHint": "Bu bölmə dərs vaxtı pəncərəsinə tabe deyil. Yalnız təqdim edilmiş işlər göstərilir.",
  "teacher.noSubmittedWork": "Qiymətləndiriləcək təqdim edilmiş fayl yoxdur.",
  "teacher.independentLabel": "Sərbəst iş {n}",
  "teacher.gradeRequired": "Qiymət daxil edin.",
  "teacher.gradeRange": "Qiymət 0-{max} aralığında olmalıdır.",
  "teacher.workGraded": "{work} qiymətləndirildi.",
  "teacher.colloquiumPanel": "Kollokvium paneli",
  "teacher.colloquiumHint": "Hər tələbə üçün 3 kollokvium. Fayl və mövzu sahəsi yoxdur.",
  "teacher.noColloquium": "Kollokvium qeydi yoxdur.",
  "teacher.colloquiumRange": "Kollokvium {n}: qiymət 0-10 aralığında olmalıdır.",
  "teacher.colloquiumSaved": "Kollokvium məlumatları yadda saxlanıldı.",
} as const;

export type JournalKey = keyof typeof az;
type Vars = Record<string, string | number>;

const tr: Record<JournalKey, string> = {
  "page.title": "Elektronik günlük", "page.description": "Ders devamlılığı ve günlük değerlendirme günlüğü.", "page.loading": "Elektronik günlük yükleniyor", "page.roleOnly": "Elektronik günlüğün günlük görünümü öğretmen ve öğrenci rolleri içindir.",
  "common.view": "Görüntüle", "common.save": "Kaydet", "common.cancel": "İptal", "common.confirm": "Onayla", "common.score": "Puan", "common.scoreUnit": "puan", "common.date": "Tarih", "common.topic": "Konu", "common.file": "Dosya", "common.attendance": "Devamlılık", "common.grade": "Not", "common.student": "Öğrenci", "common.group": "Grup", "common.status": "Durum", "common.fileOpenError": "Dosya açılamadı.", "common.present": "Katıldı", "common.absent": "Devamsız", "common.practice": "Uygulama", "common.laboratory": "Laboratuvar", "common.independentWork": "Bağımsız çalışma", "common.courseWork": "Ders projesi", "common.colloquium": "Kolokyum", "common.active": "Aktif", "common.confirmed": "Onaylandı", "common.locked": "Kilitli", "common.notConfigured": "Ayarlanmadı", "common.currentSemester": "Mevcut dönem", "common.none": "Yok", "teacher.work": "Çalışma", "teacher.activeLesson": "Aktif ders",
  "student.noCourses": "Mevcut dönem için elektronik günlükte ders atanmadı.", "student.currentCourse": "Mevcut ders", "student.chooseCourse": "Ders seçin", "student.changeCourse": "Dersi değiştir", "student.courseCount": "{count} ders", "student.uploadAssignment": "Ödev yükle", "student.academicResult": "Akademik sonuç", "student.currentEvaluation": "Güncel değerlendirme", "student.hideBreakdown": "Dağılımı gizle", "student.detailedBreakdown": "Ayrıntılı dağılım", "student.semester": "Dönem", "student.exam": "Sınav", "student.final": "Genel", "student.max50": "Maksimum 50 puan", "student.examResult": "Sınav sonucu", "student.totalResult": "Genel sonuç", "student.scoreComposition": "Dönem puanı dağılımı", "student.liveFormula": "Formül motorundan canlı hesaplanır", "student.gradingNotConfigured": "Bu ders için değerlendirme türü henüz belirlenmedi. Dönem puanı mevcut sonuçtan gösterilir; ayrıntılı dağılım yapılandırma tamamlandığında etkinleşir.", "student.lessons": "Dersler", "student.independentWork": "Bağımsız çalışma", "student.courseWork": "Ders projesi", "student.colloquium": "Kolokyum", "student.dailyLessons": "Günlük dersler", "student.confirmedLessons": "Öğretmen tarafından onaylanan dersler", "student.independentWorks": "Bağımsız çalışmalar", "student.max2Submissions": "En fazla 2 teslim", "student.finalCourseWork": "Dersin final projesi", "student.colloquiums": "Kolokyumlar", "student.threeAssessments": "Dönem boyunca 3 değerlendirme", "student.absenceSummary": "{absent} devamsız • %{percent} katılım", "student.attendanceNormal": "Devamlılık normal", "student.attendanceRisk": "Devamlılık riski", "student.noLessons": "Henüz ders yok", "student.noConfirmedLessons": "Henüz onaylanmış ders yok", "student.confirmedLessonHint": "Öğretmen dersi onayladığında burada anında görünür.", "student.topicMissing": "Konu belirtilmedi", "student.labSubmitted": "Laboratuvar teslim edildi", "student.independentOrdinal": "{n}. bağımsız çalışma", "student.ordinal": "{n}.", "student.submitAssignment": "Ödev teslim et", "student.uploadDescription": "Laboratuvar, bağımsız çalışma ve ders projesi dosyalarını güvenli şekilde yükleyin.", "student.uploadFile": "Dosya yükle", "student.submitDialogTitle": "Ödevi teslim et", "student.submitDialogDescription": "{course} için ödev türünü ve konuyu seçip dosyanızı güvenli şekilde yükleyin.", "student.assignmentType": "Ödev türü", "student.chooseType": "Tür seçin", "student.chooseTopic": "Konu seçin", "student.topicNotAdded": "Konu eklenmedi", "student.fileSelected": "Dosya seçildi", "student.dropFile": "Dosyayı seçin veya buraya sürükleyin", "student.maxFile25": "Maksimum dosya boyutu 25 MB", "student.submit": "Teslim et", "student.submitSuccess": "Ödev başarıyla teslim edildi.", "student.chooseTypeError": "Ödev türünü seçin.", "student.chooseTopicError": "Konuyu seçin.", "student.chooseFileError": "Dosya seçin.", "student.fileTooLarge": "Dosya boyutu 25 MB'dan büyük olamaz.", "student.topicNotFound": "Seçilen konu bulunamadı.", "student.topicAlreadySubmitted": "Bu konu için zaten teslim yaptınız.", "student.independentLimit": "Bağımsız çalışma için boş teslim satırı yok. En fazla 2 çalışma zaten teslim edildi.", "student.courseWorkDisabled": "Bu ders için ders projesi etkin değil.", "student.courseWorkMissing": "Ders projesi satırı oluşturulmadı.", "student.alreadySubmitted": "Zaten teslim ettiniz.", "student.notLaboratoryCourse": "Bu ders laboratuvar türünde değil.", "student.noOpenLabSession": "Bu konu için açık laboratuvar oturumu bulunamadı.", "student.noLabRecord": "Bu laboratuvar oturumu için öğrenci kaydı bulunamadı.", "student.limitFull": "limit dolu", "student.submitted": "teslim edildi",
  "teacher.noCourses": "course_teachers üzerinden size atanmış ders yok.", "teacher.courseLessonSelection": "Ders ve oturum seçimi", "teacher.activeWindowHint": "Aktif değerlendirme penceresi olan ders otomatik olarak vurgulanır.", "teacher.activeLessonNow": "Şu anda aktif ders var", "teacher.noActiveLesson": "Aktif ders yok", "teacher.gradingTypeMissing": "Değerlendirme türü seçilmedi", "teacher.session": "Ders oturumu", "teacher.chooseSession": "Ders oturumu seçin", "teacher.gradingOpen": "Değerlendirme açık", "teacher.gradingClosed": "Zaman penceresi kapalı", "teacher.dailyTab": "Günlük değerlendirme", "teacher.worksTab": "Bağımsız / Ders projesi", "teacher.noSessions": "Bu ders için ders oturumu yok.", "teacher.dailyTitle": "Günlük ders değerlendirmesi", "teacher.lockedHint": "Bu ders onaylandı. Konu, devamlılık ve notlar artık değiştirilemez.", "teacher.windowClosedHint": "Değerlendirme penceresi kapalıdır. Alanlar yalnızca ders başlangıcından 5 dakika önce başlayıp bitişten 5 dakika sonrasına kadar aktiftir.", "teacher.courseConfigHint": "Bu ders için değerlendirme türü seçilmedi. Yönetici/danışman dersi “Uygulama” veya “Laboratuvar” olarak yapılandırmalıdır.", "teacher.topicPlaceholder": "Bugün işlenen konuyu yazın...", "teacher.noStudentRecords": "Bu oturum için öğrenci kaydı yok.", "teacher.labSubmitted": "Laboratuvar teslim edildi", "teacher.confirmAll": "Tümünü Onayla", "teacher.confirmTitle": "Dersi onaylayıp kilitlemek istiyor musunuz?", "teacher.confirmDescription": "Konu, tüm öğrencilerin devamlılığı ve değerlendirmeleri kaydedilecek. Onaydan sonra öğretmen bu oturumu değiştiremeyecek.", "teacher.topicRequired": "Ders konusunu girin.", "teacher.attendanceRequired": "Tüm öğrenciler için devamlılık seçin.", "teacher.studentGradeRange": "{student}: not 0-10 aralığında olmalıdır.", "teacher.confirmFailed": "Ders onaylanamadı.", "teacher.confirmSuccess": "Ders onaylandı ve günlük kilitlendi.", "teacher.worksTitle": "Bağımsız çalışma / Ders projesi değerlendirmesi", "teacher.worksHint": "Bu bölüm ders zamanı penceresine bağlı değildir. Yalnızca teslim edilmiş çalışmalar gösterilir.", "teacher.noSubmittedWork": "Değerlendirilecek teslim edilmiş dosya yok.", "teacher.independentLabel": "Bağımsız çalışma {n}", "teacher.gradeRequired": "Not girin.", "teacher.gradeRange": "Not 0-{max} aralığında olmalıdır.", "teacher.workGraded": "{work} değerlendirildi.", "teacher.colloquiumPanel": "Kolokyum paneli", "teacher.colloquiumHint": "Her öğrenci için 3 kolokyum. Dosya veya konu alanı yoktur.", "teacher.noColloquium": "Kolokyum kaydı yok.", "teacher.colloquiumRange": "Kolokyum {n}: not 0-10 aralığında olmalıdır.", "teacher.colloquiumSaved": "Kolokyum bilgileri kaydedildi.",
};

const en: Record<JournalKey, string> = {
  "page.title": "Electronic journal", "page.description": "Attendance and daily assessment journal.", "page.loading": "Loading electronic journal", "page.roleOnly": "The daily electronic journal view is available to teacher and student roles.",
  "common.view": "View", "common.save": "Save", "common.cancel": "Cancel", "common.confirm": "Confirm", "common.score": "Score", "common.scoreUnit": "pts", "common.date": "Date", "common.topic": "Topic", "common.file": "File", "common.attendance": "Attendance", "common.grade": "Grade", "common.student": "Student", "common.group": "Group", "common.status": "Status", "common.fileOpenError": "The file could not be opened.", "common.present": "Present", "common.absent": "Absent", "common.practice": "Practice", "common.laboratory": "Laboratory", "common.independentWork": "Independent work", "common.courseWork": "Coursework", "common.colloquium": "Colloquium", "common.active": "Active", "common.confirmed": "Confirmed", "common.locked": "Locked", "common.notConfigured": "Not configured", "common.currentSemester": "Current semester", "common.none": "None", "teacher.work": "Work", "teacher.activeLesson": "Active lesson",
  "student.noCourses": "No course has been assigned to the electronic journal for the current semester.", "student.currentCourse": "Current course", "student.chooseCourse": "Choose a course", "student.changeCourse": "Change course", "student.courseCount": "{count} courses", "student.uploadAssignment": "Upload assignment", "student.academicResult": "Academic result", "student.currentEvaluation": "Current assessment", "student.hideBreakdown": "Hide breakdown", "student.detailedBreakdown": "Detailed breakdown", "student.semester": "Semester", "student.exam": "Exam", "student.final": "Final", "student.max50": "Maximum 50 points", "student.examResult": "Exam result", "student.totalResult": "Overall result", "student.scoreComposition": "Semester score breakdown", "student.liveFormula": "Calculated live by the formula engine", "student.gradingNotConfigured": "The grading type for this course has not been configured yet. The current semester score is shown; the detailed breakdown will become available once configuration is complete.", "student.lessons": "Lessons", "student.independentWork": "Independent work", "student.courseWork": "Coursework", "student.colloquium": "Colloquium", "student.dailyLessons": "Daily lessons", "student.confirmedLessons": "Lessons confirmed by the teacher", "student.independentWorks": "Independent works", "student.max2Submissions": "Maximum 2 submissions", "student.finalCourseWork": "Final coursework for the course", "student.colloquiums": "Colloquiums", "student.threeAssessments": "3 assessments during the semester", "student.absenceSummary": "{absent} absent • {percent}% attendance", "student.attendanceNormal": "Attendance is normal", "student.attendanceRisk": "Attendance risk", "student.noLessons": "No lessons yet", "student.noConfirmedLessons": "No confirmed lessons yet", "student.confirmedLessonHint": "It will appear here immediately after the teacher confirms the lesson.", "student.topicMissing": "Topic not specified", "student.labSubmitted": "Lab submitted", "student.independentOrdinal": "Independent work {n}", "student.ordinal": "#{n}", "student.submitAssignment": "Submit assignment", "student.uploadDescription": "Securely upload laboratory, independent-work and coursework files.", "student.uploadFile": "Upload file", "student.submitDialogTitle": "Submit assignment", "student.submitDialogDescription": "Choose the assignment type and topic for {course}, then securely upload your file.", "student.assignmentType": "Assignment type", "student.chooseType": "Choose type", "student.chooseTopic": "Choose topic", "student.topicNotAdded": "No topic added", "student.fileSelected": "File selected", "student.dropFile": "Choose a file or drag it here", "student.maxFile25": "Maximum file size 25 MB", "student.submit": "Submit", "student.submitSuccess": "Assignment submitted successfully.", "student.chooseTypeError": "Choose an assignment type.", "student.chooseTopicError": "Choose a topic.", "student.chooseFileError": "Choose a file.", "student.fileTooLarge": "The file cannot be larger than 25 MB.", "student.topicNotFound": "The selected topic was not found.", "student.topicAlreadySubmitted": "You have already submitted work for this topic.", "student.independentLimit": "There is no empty independent-work submission slot. The maximum of 2 works has already been submitted.", "student.courseWorkDisabled": "Coursework is not enabled for this course.", "student.courseWorkMissing": "The coursework row has not been created.", "student.alreadySubmitted": "You have already submitted this.", "student.notLaboratoryCourse": "This is not a laboratory course.", "student.noOpenLabSession": "No open laboratory session was found for this topic.", "student.noLabRecord": "No student record was found for this laboratory session.", "student.limitFull": "limit reached", "student.submitted": "submitted",
  "teacher.noCourses": "No course is assigned to you in course_teachers.", "teacher.courseLessonSelection": "Course and lesson selection", "teacher.activeWindowHint": "A lesson with an active grading window is highlighted automatically.", "teacher.activeLessonNow": "There is an active lesson now", "teacher.noActiveLesson": "No active lesson", "teacher.gradingTypeMissing": "Grading type is not configured", "teacher.session": "Lesson session", "teacher.chooseSession": "Choose a lesson session", "teacher.gradingOpen": "Grading is open", "teacher.gradingClosed": "Time window is closed", "teacher.dailyTab": "Daily grading", "teacher.worksTab": "Independent / Coursework", "teacher.noSessions": "There is no lesson session for this course.", "teacher.dailyTitle": "Daily lesson grading", "teacher.lockedHint": "This lesson has been confirmed. The topic, attendance and grades can no longer be changed.", "teacher.windowClosedHint": "The grading window is closed. Fields are active only from 5 minutes before the lesson starts until 5 minutes after it ends.", "teacher.courseConfigHint": "The grading type for this course is not configured. An admin/tutor must configure the course as “Practice” or “Laboratory”.", "teacher.topicPlaceholder": "Enter the topic covered today...", "teacher.noStudentRecords": "There is no student record for this session.", "teacher.labSubmitted": "Lab submitted", "teacher.confirmAll": "Confirm All", "teacher.confirmTitle": "Confirm and lock this lesson?", "teacher.confirmDescription": "The topic, attendance and assessments for all students will be saved. After confirmation, the teacher will not be able to change this session.", "teacher.topicRequired": "Enter the lesson topic.", "teacher.attendanceRequired": "Select attendance for every student.", "teacher.studentGradeRange": "{student}: grade must be between 0 and 10.", "teacher.confirmFailed": "The lesson could not be confirmed.", "teacher.confirmSuccess": "The lesson was confirmed and the journal was locked.", "teacher.worksTitle": "Independent work / Coursework grading", "teacher.worksHint": "This section is not restricted by the lesson-time window. Only submitted work is shown.", "teacher.noSubmittedWork": "There is no submitted file to grade.", "teacher.independentLabel": "Independent work {n}", "teacher.gradeRequired": "Enter a grade.", "teacher.gradeRange": "Grade must be between 0 and {max}.", "teacher.workGraded": "{work} was graded.", "teacher.colloquiumPanel": "Colloquium panel", "teacher.colloquiumHint": "3 colloquiums per student. There are no file or topic fields.", "teacher.noColloquium": "No colloquium records.", "teacher.colloquiumRange": "Colloquium {n}: grade must be between 0 and 10.", "teacher.colloquiumSaved": "Colloquium data was saved.",
};

const ru: Record<JournalKey, string> = {
  "page.title": "Электронный журнал", "page.description": "Журнал посещаемости и ежедневного оценивания.", "page.loading": "Загрузка электронного журнала", "page.roleOnly": "Ежедневный электронный журнал доступен для ролей преподавателя и студента.",
  "common.view": "Открыть", "common.save": "Сохранить", "common.cancel": "Отмена", "common.confirm": "Подтвердить", "common.score": "Балл", "common.scoreUnit": "балл", "common.date": "Дата", "common.topic": "Тема", "common.file": "Файл", "common.attendance": "Посещаемость", "common.grade": "Оценка", "common.student": "Студент", "common.group": "Группа", "common.status": "Статус", "common.fileOpenError": "Не удалось открыть файл.", "common.present": "Присутствовал", "common.absent": "Отсутствовал", "common.practice": "Практика", "common.laboratory": "Лабораторная", "common.independentWork": "Самостоятельная работа", "common.courseWork": "Курсовая работа", "common.colloquium": "Коллоквиум", "common.active": "Активно", "common.confirmed": "Подтверждено", "common.locked": "Заблокировано", "common.notConfigured": "Не настроено", "common.currentSemester": "Текущий семестр", "common.none": "Нет", "teacher.work": "Работа", "teacher.activeLesson": "Активное занятие",
  "student.noCourses": "Для текущего семестра в электронном журнале не назначены дисциплины.", "student.currentCourse": "Текущая дисциплина", "student.chooseCourse": "Выберите дисциплину", "student.changeCourse": "Сменить дисциплину", "student.courseCount": "Дисциплин: {count}", "student.uploadAssignment": "Загрузить задание", "student.academicResult": "Академический результат", "student.currentEvaluation": "Текущее оценивание", "student.hideBreakdown": "Скрыть детализацию", "student.detailedBreakdown": "Подробная разбивка", "student.semester": "Семестр", "student.exam": "Экзамен", "student.final": "Итог", "student.max50": "Максимум 50 баллов", "student.examResult": "Результат экзамена", "student.totalResult": "Общий результат", "student.scoreComposition": "Состав семестрового балла", "student.liveFormula": "Рассчитывается формулой в реальном времени", "student.gradingNotConfigured": "Тип оценивания для этой дисциплины ещё не настроен. Текущий семестровый балл отображается; подробная разбивка станет доступна после завершения настройки.", "student.lessons": "Занятия", "student.independentWork": "Самостоятельная работа", "student.courseWork": "Курсовая работа", "student.colloquium": "Коллоквиум", "student.dailyLessons": "Ежедневные занятия", "student.confirmedLessons": "Занятия, подтверждённые преподавателем", "student.independentWorks": "Самостоятельные работы", "student.max2Submissions": "Максимум 2 работы", "student.finalCourseWork": "Итоговая курсовая работа по дисциплине", "student.colloquiums": "Коллоквиумы", "student.threeAssessments": "3 оценивания за семестр", "student.absenceSummary": "Пропусков: {absent} • посещаемость {percent}%", "student.attendanceNormal": "Посещаемость в норме", "student.attendanceRisk": "Риск по посещаемости", "student.noLessons": "Занятий пока нет", "student.noConfirmedLessons": "Подтверждённых занятий пока нет", "student.confirmedLessonHint": "После подтверждения преподавателем занятие сразу появится здесь.", "student.topicMissing": "Тема не указана", "student.labSubmitted": "Лабораторная сдана", "student.independentOrdinal": "Самостоятельная работа {n}", "student.ordinal": "№{n}", "student.submitAssignment": "Сдать задание", "student.uploadDescription": "Безопасно загружайте файлы лабораторных, самостоятельных и курсовых работ.", "student.uploadFile": "Загрузить файл", "student.submitDialogTitle": "Сдать задание", "student.submitDialogDescription": "Выберите тип задания и тему по дисциплине {course}, затем безопасно загрузите файл.", "student.assignmentType": "Тип задания", "student.chooseType": "Выберите тип", "student.chooseTopic": "Выберите тему", "student.topicNotAdded": "Тема не добавлена", "student.fileSelected": "Файл выбран", "student.dropFile": "Выберите файл или перетащите его сюда", "student.maxFile25": "Максимальный размер файла — 25 МБ", "student.submit": "Сдать", "student.submitSuccess": "Задание успешно сдано.", "student.chooseTypeError": "Выберите тип задания.", "student.chooseTopicError": "Выберите тему.", "student.chooseFileError": "Выберите файл.", "student.fileTooLarge": "Размер файла не может превышать 25 МБ.", "student.topicNotFound": "Выбранная тема не найдена.", "student.topicAlreadySubmitted": "По этой теме работа уже сдана.", "student.independentLimit": "Нет свободного слота для самостоятельной работы. Максимум 2 работы уже сданы.", "student.courseWorkDisabled": "Курсовая работа для этой дисциплины не включена.", "student.courseWorkMissing": "Строка курсовой работы не создана.", "student.alreadySubmitted": "Работа уже сдана.", "student.notLaboratoryCourse": "Эта дисциплина не является лабораторной.", "student.noOpenLabSession": "Для этой темы не найдено открытое лабораторное занятие.", "student.noLabRecord": "Для этого лабораторного занятия не найдена запись студента.", "student.limitFull": "лимит исчерпан", "student.submitted": "сдано",
  "teacher.noCourses": "В course_teachers вам не назначены дисциплины.", "teacher.courseLessonSelection": "Выбор дисциплины и занятия", "teacher.activeWindowHint": "Занятие с активным окном оценивания выделяется автоматически.", "teacher.activeLessonNow": "Сейчас есть активное занятие", "teacher.noActiveLesson": "Активных занятий нет", "teacher.gradingTypeMissing": "Тип оценивания не настроен", "teacher.session": "Занятие", "teacher.chooseSession": "Выберите занятие", "teacher.gradingOpen": "Оценивание открыто", "teacher.gradingClosed": "Временное окно закрыто", "teacher.dailyTab": "Ежедневное оценивание", "teacher.worksTab": "Самостоятельная / Курсовая", "teacher.noSessions": "Для этой дисциплины нет занятий.", "teacher.dailyTitle": "Ежедневное оценивание занятия", "teacher.lockedHint": "Занятие подтверждено. Тему, посещаемость и оценки больше нельзя изменить.", "teacher.windowClosedHint": "Окно оценивания закрыто. Поля активны только с 5 минут до начала занятия и до 5 минут после его окончания.", "teacher.courseConfigHint": "Для этой дисциплины не выбран тип оценивания. Администратор/тьютор должен настроить дисциплину как «Практика» или «Лабораторная».", "teacher.topicPlaceholder": "Введите тему сегодняшнего занятия...", "teacher.noStudentRecords": "Для этого занятия нет записей студентов.", "teacher.labSubmitted": "Лабораторная сдана", "teacher.confirmAll": "Подтвердить всё", "teacher.confirmTitle": "Подтвердить и заблокировать занятие?", "teacher.confirmDescription": "Тема, посещаемость и оценки всех студентов будут сохранены. После подтверждения преподаватель не сможет изменить это занятие.", "teacher.topicRequired": "Введите тему занятия.", "teacher.attendanceRequired": "Укажите посещаемость для каждого студента.", "teacher.studentGradeRange": "{student}: оценка должна быть от 0 до 10.", "teacher.confirmFailed": "Не удалось подтвердить занятие.", "teacher.confirmSuccess": "Занятие подтверждено, журнал заблокирован.", "teacher.worksTitle": "Оценивание самостоятельной / курсовой работы", "teacher.worksHint": "Этот раздел не зависит от временного окна занятия. Отображаются только сданные работы.", "teacher.noSubmittedWork": "Нет сданных файлов для оценивания.", "teacher.independentLabel": "Самостоятельная работа {n}", "teacher.gradeRequired": "Введите оценку.", "teacher.gradeRange": "Оценка должна быть от 0 до {max}.", "teacher.workGraded": "{work}: оценка сохранена.", "teacher.colloquiumPanel": "Панель коллоквиумов", "teacher.colloquiumHint": "По 3 коллоквиума на студента. Полей файла и темы нет.", "teacher.noColloquium": "Записей коллоквиума нет.", "teacher.colloquiumRange": "Коллоквиум {n}: оценка должна быть от 0 до 10.", "teacher.colloquiumSaved": "Данные коллоквиума сохранены.",
};

export const journalMessages: Record<Locale, Record<JournalKey, string>> = { az, tr, en, ru };

const localeTags: Record<Locale, string> = { az: "az-AZ", tr: "tr-TR", en: "en-GB", ru: "ru-RU" };

function interpolate(template: string, vars?: Vars) {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (full, key: string) => (vars[key] === undefined ? full : String(vars[key])));
}

export function journalTranslate(locale: Locale, key: JournalKey, vars?: Vars) {
  return interpolate(journalMessages[locale][key], vars);
}

export function useJournalI18n() {
  const { locale } = useI18n();
  const t = useCallback((key: JournalKey, vars?: Vars) => journalTranslate(locale, key, vars), [locale]);
  const localeTag = localeTags[locale];
  const formatDate = useCallback((value: string | null | undefined) => {
    if (!value) return "—";
    const date = value.length === 10 ? new Date(`${value}T00:00:00`) : new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return new Intl.DateTimeFormat(localeTag, { timeZone: "Asia/Baku", day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
  }, [localeTag]);
  const formatTime = useCallback((value: string | null | undefined) => {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return new Intl.DateTimeFormat(localeTag, { timeZone: "Asia/Baku", hour: "2-digit", minute: "2-digit", hour12: false }).format(date);
  }, [localeTag]);
  const semesterLabel = useCallback((value: string | null | undefined) => {
    const normalized = (value ?? "").toLocaleLowerCase("az-AZ").replaceAll("ə", "e").replaceAll("ı", "i");
    if (normalized.includes("payiz") || normalized.includes("fall") || normalized.includes("autumn")) {
      return { az: "Payız", tr: "Güz", en: "Fall", ru: "Осень" }[locale];
    }
    if (normalized.includes("yaz") || normalized.includes("spring")) {
      return { az: "Yaz", tr: "Bahar", en: "Spring", ru: "Весна" }[locale];
    }
    return value || t("common.currentSemester");
  }, [locale, t]);
  return useMemo(() => ({ locale, localeTag, t, formatDate, formatTime, semesterLabel }), [locale, localeTag, t, formatDate, formatTime, semesterLabel]);
}
