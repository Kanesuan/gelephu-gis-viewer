# IDC Development Map · Gelephu

เว็บแผนที่ GIS สำหรับดูข้อมูลแผนพัฒนา `IDC_DMP_A` บริเวณ Gelephu, Bhutan บน Mapbox และเผยแพร่ผ่าน GitHub Pages

## ความสามารถ

- Hover เพื่อดู Landuse, Landarea, FAR และ GFA
- สลับแผนที่ฐาน Light, Outdoors, Satellite และ Dark
- มุมมอง 2D / 3D terrain
- เปิด–ปิด contour สีขาว, อาคาร 3D และ Mapbox administrative boundary
- ปรับสีและ opacity ของ polygon
- Isochrone แบบเดิน จักรยาน หรือรถ โดยกำหนดเวลา 1–60 นาที หรือระยะทาง 1–100 กม.
- เลือกจุดเริ่ม isochrone บนแผนที่หรือลาก marker
- หน้ารหัสผ่านจะปรากฏใหม่ทุกครั้งที่เปิดหรือ refresh หน้าเว็บ

## ใช้งานในเครื่อง

ต้องใช้ Node.js 22.13 ขึ้นไป

```bash
npm install
npm run dev
```

## เผยแพร่

Workflow ใน `.github/workflows/pages.yml` จะ build และ deploy GitHub Pages อัตโนมัติเมื่อ push เข้า branch `main`

## หมายเหตุด้านความปลอดภัย

รหัสผ่านบนเว็บ static เป็นเพียง client-side access gate ไม่ใช่ระบบยืนยันตัวตนฝั่ง server ผู้ที่เข้าถึง source code หรือ Mapbox Tileset URL ได้อาจข้ามหน้ารหัสผ่านได้ หากข้อมูลเป็นความลับควรใช้ hosting ที่รองรับ server-side authentication และจำกัดสิทธิ์ Mapbox token/tileset เพิ่มเติม
