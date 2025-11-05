# 24HR Attendance System

ระบบบันทึกเวลาเข้า-ออกงานสำหรับองค์กร พร้อมระบบจัดการพนักงานหลายหน่วยงาน

## คุณสมบัติหลัก

- ✅ บันทึกเวลาเข้า-ออกงานพร้อมรูปหลักฐาน
- ✅ จัดการพนักงาน 4 หน่วยงาน (หมอ, ตำรวจ, สภา, แอดมิน)
- ✅ ระบบยืนยันตัวตนด้วย PIN
- ✅ รองรับการ Paste รูปภาพ (Ctrl+V)
- ✅ จัดเก็บข้อมูลถาวรด้วย localStorage
- ✅ รายงานการเข้างาน มาสาย ล่วงเวลา และการลา
- ✅ UI มืออาชีพเหมาะกับองค์กร

## ติดตั้งและรัน

```bash
# ติดตั้ง dependencies
npm install

# รันในโหมด development
npm run dev

# Build สำหรับ production
npm run build

# ดู preview ของ production build
npm run preview
```

## Deploy ขึ้น GitHub Pages

1. สร้าง repository ใหม่บน GitHub
2. แก้ไข `vite.config.js` - เปลี่ยน `base` ให้ตรงกับชื่อ repository
3. Push code ขึ้น GitHub:
```bash
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git branch -M main
git push -u origin main
```

4. Deploy ขึ้น GitHub Pages:
```bash
npm run deploy
```

5. เปิดใช้งาน GitHub Pages:
   - ไปที่ Settings > Pages
   - เลือก Branch: `gh-pages`
   - Save

6. เว็บจะพร้อมใช้งานที่: `https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/`

## รหัสเจ้าของระบบ

รหัส PIN สำหรับปลดล็อกฟีเจอร์ผู้ดูแล: **246810**

## เทคโนโลยีที่ใช้

- React 18
- Vite
- Tailwind CSS
- localStorage API

## License

MIT
