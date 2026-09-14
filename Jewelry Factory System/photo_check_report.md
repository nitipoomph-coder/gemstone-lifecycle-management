# 📷 Photo Check Report — Items Missing Photos

> ตรวจสอบจาก orders ภายใน 2 ปีล่าสุด เทียบกับรูปใน Network Share (`\\chongdts\Chong Photo\`)

## Summary

| สถานะ | จำนวน Items |
|---|---:|
| ✅ มีรูปครบทั้ง PS + CAD | **7,332** |
| ⚠️ ไม่มีรูป PS (มี CAD อย่างเดียว) | **3** |
| ⚠️ ไม่มีรูป CAD (มี PS อย่างเดียว) | **21,879** |
| ❌ **ไม่มีรูปเลย** (ทั้ง PS + CAD) | **1,002** |
| **รวม Items ทั้งหมด** | **30,216** |

> [!IMPORTANT]
> มี **1,002 items ที่ไม่มีรูปเลย** ทั้ง PS และ CAD — items เหล่านี้จะแสดงเป็น placeholder ในระบบ

> [!NOTE]
> Items ที่ "ไม่มีรูป CAD" จำนวน 21,879 ถือว่าปกติ เพราะส่วนใหญ่มี PS photo แล้ว ระบบ fallback จาก PS → CAD อยู่แล้ว ดังนั้น **items ที่เป็นปัญหาจริงคือ 1,002 items ที่ไม่มีรูปทั้งคู่**

## ❌ Items ที่ไม่มีรูปเลย (ตัวอย่าง 30 รายการแรก)

| # | Item No |
|---|---------|
| 1 | BAS03622B |
| 2 | BAS03622C |
| 3 | BAS03838A |
| 4 | BAS03859A |
| 5 | BAS03960A |
| 6 | BAS04038A |
| 7 | BAS04038B |
| 8 | BAS04039A |
| 9 | BBS0241110 |
| 10 | BBS02702A |
| 11 | BBS02706B |
| 12 | BBS02960B |
| 13 | BNS14701A |
| 14 | BNS14709A |
| 15 | BNS14780A |
| 16 | BNS14813A |
| 17 | BNS14862A |
| 18 | BNS14892A |
| 19 | BNS14893A |
| 20 | BNS14895A |
| 21 | BNS14905A |
| 22 | BNS14907A |
| 23 | BNS14912A |
| 24 | BNS14937A |
| 25 | BNS14942A |
| 26 | BNS14950A |
| 27 | BNS14951A |
| 28 | BNS14954A |
| 29 | BNS14974A |
| 30 | BNS14979A |

> รายการเต็ม 1,002 items อยู่ใน log: [task-35.log](file:///C:/Users/ITSP/.gemini/antigravity-ide/brain/ab0cf207-a71b-4e7a-a136-1d76c86fecdc/.system_generated/tasks/task-35.log) (บรรทัด 18-1022)

## ⚠️ Items ที่มี CAD อย่างเดียว (ไม่มี PS)

เพียง 3 items:
- `BNS15362A`
- `BNS15442A`
- `BTS08983B`

## ข้อมูลเพิ่มเติม

- **Photo paths ที่เช็ค:**
  - PS: `\\chongdts\Chong Photo\Cost\{ItemNo}.{jpg|jpeg|png}`
  - CAD: `\\chongdts\Chong Photo\Mold\{ItemNo}.{jpg|jpeg|png}` + `\\chongdts\Chong Photo\MoldCAD\{ItemNo}.{jpg|jpeg|png}`
- **Script:** [check-missing-photos.js](file:///d:/gemstone-lifecycle-management/Jewelry%20Factory%20System/backend/check-missing-photos.js)
