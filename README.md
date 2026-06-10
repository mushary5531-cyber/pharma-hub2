# Pharma Memory Hub 💊

موقع مذاكرة الفارما — 27 محاضرة بمنمونيكس + بطاقات + كويزات.

## الرفع على GitHub Pages (خطوة بخطوة)

### 1. أنشئ Repository جديد
- افتح [github.com/new](https://github.com/new)
- اسم الـ repo: `pharma-hub` (أو أي اسم)
- اتركه Public
- لا تضف README (الملف موجود)
- اضغط **Create repository**

### 2. ارفع الملفات
افتح Terminal/Command Prompt في فولدر `pharma-site` ثم:

```bash
git init
git add .
git commit -m "Initial commit: Pharma Memory Hub"
git branch -M main
git remote add origin https://github.com/USERNAME/pharma-hub.git
git push -u origin main
```
استبدل `USERNAME` باسم حسابك.

### 3. فعّل GitHub Pages
- افتح الـ repo على GitHub
- Settings → Pages
- Source: **Deploy from a branch**
- Branch: **main** / **(root)**
- Save

### 4. الرابط
بعد دقيقة يصير عندك رابط:
```
https://USERNAME.github.io/pharma-hub/
```

---

## هيكل المشروع

```
pharma-site/
├── index.html          # الصفحة الرئيسية
├── lecture.html        # صفحة المحاضرة
├── assets/
│   ├── css/styles.css  # ثيم داكن
│   └── js/
│       ├── app.js        # بحث وفلترة
│       ├── flashcards.js # منطق البطاقات
│       ├── quiz.js       # منطق الكويز
│       └── lecture.js    # صفحة المحاضرة
└── data/
    ├── index.json        # فهرس المحاضرات
    ├── mid1/             # 9 محاضرات MID1
    ├── mid2/             # 9 محاضرات MID2
    └── final/            # 9 محاضرات Final
```

## الإحصائيات
- 27 محاضرة
- 135+ منمونيك
- 485+ بطاقة Flashcard
- 270 سؤال MCQ
