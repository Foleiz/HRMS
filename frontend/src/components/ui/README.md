# components/ui — ชุด component กลางของระบบ

แก้หน้าตาที่ไฟล์ component ไฟล์เดียว ทุกหน้าที่ใช้จะเปลี่ยนตาม
สีหลักตั้งที่ `src/app/globals.css` (`@theme --color-primary`, `--color-accent`)

```tsx
import { Button, Modal, ModalFooter, FormField, Input, NumberInput,
         SegmentedControl, ActiveStatus, StatusBadge, ToggleSwitch,
         ActiveToggleRow, OptionCheckCard } from '@/components/ui';
```

| ใช้ทำอะไร | component |
|---|---|
| ปุ่ม (บันทึก / ยกเลิก / ลบ / แก้ไข) | `Button` variant: primary, secondary, danger, soft-warning, soft-danger, ghost |
| หน้าต่าง popup | `Modal` + `ModalFooter` |
| ช่องกรอก + หัวข้อ + คำอธิบาย | `FormField` + `Input` |
| ช่องตัวเลข (มีลูกน้ำ, ฿, หน่วย) | `NumberInput` |
| เลือกหนึ่งในหลายแบบ | `SegmentedControl` |
| สถานะ ใช้งาน / ไม่ได้ใช้งาน ในตาราง | `ActiveStatus` / `StatusBadge` |
| สวิตช์เปิด/ปิด, แถว "เปิดใช้งาน" | `ToggleSwitch` / `ActiveToggleRow` |
| ตัวเลือกแบบการ์ด (ติ๊ก + คำอธิบาย) | `OptionCheckCard` |

สีที่ใช้ใน class: `bg-primary`, `hover:bg-primary-hover`, `text-primary`, `border-primary`,
`focus:ring-primary`, `bg-primary-soft`, `bg-accent` — หลีกเลี่ยงการพิมพ์ `#0B2046` ตรงๆ
