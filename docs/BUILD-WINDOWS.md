# بناء نسخة ويندوز (Portable و EXE)

## 1) نسخة Portable — بدون تثبيت

```bash
npm ci
npm run build:windows:portable
```

الناتج:

```
dist-portable/LocalNote-1.2.0-windows-x64-portable/
├── LocalNote.exe
└── README.txt
dist-portable/LocalNote-1.2.0-windows-x64-portable.zip
```

- لا مثبّت، لا صلاحيات مدير، لا كتابة في الريجستري.
- البيانات تُحفظ في `%LOCALAPPDATA%\LocalNote\Data\localnote.db` (نفس مكان النسخة المثبّتة)،
  فحذف هذا المجلد يعيد التطبيق إلى حالة نظيفة تمامًا.
- المتطلب الوحيد: **Microsoft Edge WebView2 Runtime** (مثبّت مسبقًا في ويندوز 10/11).

## 2) مثبّت EXE (nsis) + ملف exe مباشر

```bash
npm run tauri build
```

الناتج:

```
src-tauri/target/release/bundle/nsis/LocalNote_1.2.0_x64-setup.exe
src-tauri/target/release/LocalNote.exe          ← نفس الملف الذي يُحزم في النسخة المحمولة
```

## 3) البناء من نظام غير ويندوز (Linux CI)

```bash
rustup target add x86_64-pc-windows-msvc
cargo install --locked cargo-xwin
cargo xwin build --release --target x86_64-pc-windows-msvc
```

أو باستخدام السكربت الجاهز:

```bash
CARGO_XWIN=1 npm run build:windows:portable -- --target x86_64-pc-windows-msvc
```

> ملاحظة: بناء ويندوز على لينكس يحتاج ذاكرة كبيرة (حزمة `windows` crate ثقيلة).
> على ماكينات صغيرة استخدم `CARGO_BUILD_JOBS=1` و`CARGO_PROFILE_RELEASE_LTO=false`،
> أو اسندها إلى GitHub Actions (جاهز في `.github/workflows/windows.yml`).

## 4) GitHub Actions

- `.github/workflows/windows.yml`: يبني نسخة Portable + المثبّت على `windows-latest`،
  يرفعهما كـ artifacts، ويُرفقهما تلقائيًا بأي release عند دفع وسم `v*`.
- `.github/workflows/quality.yml`: lint + typecheck + اختبارات الواجهة + بناء، واختبارات Rust.

## 5) قائمة تحقق قبل النشر

- [ ] `npm run lint` و`npm run typecheck` نظيفان.
- [ ] `npm test` (130+ اختبار) و`cargo test --release` (62 اختبار) ناجحة.
- [ ] تشغيل `LocalNote.exe` على ويندوز 10/11 والتأكد من ظهور النافذة (WebView2 مثبّت).
- [ ] تجربة: إنشاء صفحة، كتابة عربية، تبديل اللغة من الإعدادات، إعادة تشغيل التطبيق والتأكد أن اللغة محفوظة.
- [ ] تجربة النسخ الاحتياطي (Backup all notes) والاستيراد من Markdown.

## 6) لماذا `--features custom-protocol` ضروري؟

`tauri.conf.json` يحتوي `build.devUrl = http://localhost:1420` (خادم Vite في وضع التطوير).
`cargo build --release` وحده يبني نسخة **تطوير**: الملف التنفيذي يفتح
`http://localhost:1420` وتظهر رسالة `localhost refused to connect` (ERR_CONNECTION_REFUSED)
لأن لا يوجد خادم يعمل. تفعيل فيتشر `custom-protocol` يجعل Tauri يستخدم بروتوكول
`tauri://localhost` ويضمّن ملفات الواجهة المبنية (`dist/`) داخل الملف التنفيذي.

- `src-tauri/Cargo.toml` يعرّف `custom-protocol = ["tauri/custom-protocol"]`.
- `scripts/build-windows-portable.mjs` يمرّر `--features custom-protocol` تلقائيًا.
- `npm run tauri build` يفعّله من نفسه (لذلك نسخة المثبّت كانت تعمل).

علامة النجاح: حجم `LocalNote.exe` في النسخة المحمولة ≈ الملف الذي ينتجه
`npm run tauri build` (‏11–12 ميجابايت)، وليس أصغر منه بمقدار ملحوظ.
