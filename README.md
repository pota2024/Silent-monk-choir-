# كورال الراهب الصامت — SILENT MONK'S CHOIR
كنيسة مارجرجس أبوزعبل

تطبيق إدارة الكورال (حضور، نقاط، أحداث، تقارير) بـ Capacitor وFirebase، مطابق وظيفيًا لتطبيق كورال الأنبا كاراس مع هوية وقاعدة بيانات مستقلتين.

- Package ID: `com.silentmonk.choir`
- Firebase: `silent-monk-634e9` على خطة **Spark المجانية** (بدون Cloud Functions).
- الإعداد: `FIREBASE_SETUP.md`.
- بناء APK: GitHub Actions ← **Build Android APK** ← Artifact `Silent-Monk-Choir-APK`.
- لا توجد أسرار في المستودع. كود الخدام يُخزَّن في Firestore (`secrets/servant`) ومحمي بالقواعد.

## الرفع على GitHub (فرع main)
```bash
git init && git add . && git commit -m "Silent Monk Choir"
git branch -M main
git remote add origin https://github.com/<USER>/<REPO>.git
git push -u origin main
```
بعد الـ push يبدأ Workflow **Build Android APK** تلقائيًا. من تبويب Actions نزّل Artifact `Silent-Monk-Choir-APK`.
لا ترفع ملف `firestore-with-code.rules` (فيه كود الخدام)؛ يُنشر من Firebase Console فقط.
