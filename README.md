# FiveM Attendance System v1.0

ระบบบันทึกเวลาเข้า-ออกงานสำหรับ FiveM พร้อมการจัดการตารางกะ การลา และการคำนวณล่วงเวลา

## ✨ คุณสมบัติ

- 📊 **แดชบอร์ด**: สรุปข้อมูลเข้างานพร้อมส่งออก CSV
- 👥 **พนักงาน**: จัดการรายชื่อพนักงาน
- 📅 **ตารางกะ**: ดูตารางกะแยกตามหน่วยงาน
- ⏰ **เข้า-ออกงาน**: ระบบบันทึกเวลาเข้า-ออกงาน
- 📋 **การลา**: จัดการคำขอลา
- ⏳ **ล่วงเวลา**: คำนวณและแสดงเวลาล่วงเวลา

## 🚀 การติดตั้ง

```bash
# ติดตั้ง dependencies
npm install

# รันโหมดพัฒนา
npm run dev

# Build สำหรับ production
npm run build

# Preview build
npm run preview
```

## 🎨 เทคโนโลยีที่ใช้

- **React 18** - UI Library
- **Vite** - Build Tool
- **Tailwind CSS** - CSS Framework
- **Dark Mode** - รองรับ Dark/Light Mode อัตโนมัติ

## 📦 โครงสร้างโปรเจค

```
fivem-attendance-v1/
├── src/
│   ├── components/       # Component ต่างๆ
│   ├── data/            # ไฟล์ข้อมูล JSON
│   ├── App.jsx          # Component หลัก
│   ├── main.jsx         # Entry point
│   └── index.css        # Global styles
├── index.html
├── vite.config.js
├── tailwind.config.js
└── package.json
```

## 🌐 Deploy

```bash
npm run deploy
```

## 📝 License

MIT License - สามารถนำไปใช้และแก้ไขได้ตามต้องการ

