// src/config/skillsConfig.ts
import {
    Code2, Server, Database, ShieldAlert, Cpu, Terminal, GitBranch, Wrench
} from 'lucide-react';

export type SkillCategory = 'frontend' | 'backend' | 'database' | 'infrastructure' | 'tools';

export interface SkillItem {
    id: string;
    name: string;
    category: SkillCategory;
    level: number; // 0 - 100 สำหรับทำ Progress Bar หรือวงกลมเรนเดอร์
    icon: any;     // เก็บ Component ของ Lucide Icon โดยตรง
    isHighlight: boolean; // ทักษะเด่นที่ต้องการโชว์เป็นพิเศษในหน้าแรก
    description?: string; // คำอธิบายสั้นๆ เพิ่มเติม
}

export const mySkills: SkillItem[] = [
    // ─── FRONTEND ──────────────────────────────────────
    { id: 'react', name: 'React / TypeScript', category: 'frontend', level: 85, icon: Code2, isHighlight: true, description: 'พัฒนาฟอร์มระดับใช้งานในองค์กร และจัดการ State แบบซับซ้อน' },

    // ─── BACKEND ───────────────────────────────────────
    { id: 'nodejs', name: 'Node.js (Express)', category: 'backend', level: 80, icon: Server, isHighlight: true, description: 'ออกแบบ RESTful API และเชื่อมต่อ Stored Procedures' },
    { id: 'java', name: 'Java Programming', category: 'backend', level: 75, icon: Terminal, isHighlight: false },


    // ─── DATABASE ──────────────────────────────────────
    {
        id: 'sqlserver',
        name: 'MS SQL Server 2012',
        category: 'database',
        level: 80,
        icon: Database,
        isHighlight: true,
        description: 'จัดการฐานข้อมูล Relational, ออกแบบคำสั่งคิวรี และทำงานร่วมกับ Stored Procedures ของระบบองค์กร'
    },
    // ─── INFRASTRUCTURE & SUPPORT ──────────────────────
    { id: 'it-support', name: 'IT Support & Troubleshooting', category: 'infrastructure', level: 90, icon: Cpu, isHighlight: true, description: 'แก้ปัญหา Hardware, เครือข่าย และอุปกรณ์ต่อพ่วงในออฟฟิศ' },
    { id: 'it-security', name: 'IT Security Frameworks', category: 'infrastructure', level: 75, icon: ShieldAlert, isHighlight: false, description: 'เข้าใจสถาปัตยกรรมความปลอดภัย เช่น McCumber Cube' },

    // ─── TOOLS ─────────────────────────────────────────
    { id: 'git', name: 'Git Version Control', category: 'tools', level: 80, icon: GitBranch, isHighlight: false },
    { id: 'productivity-ai', name: 'AI Productivity Tools', category: 'tools', level: 85, icon: Wrench, isHighlight: false, description: 'ประยุกต์ใช้ AI ในการเพิ่มความเร็วการเขียนโค้ดและดีไซน์ UI' }
];

// Helper Functions สำหรับดึงไปใช้งานบนหน้าประกอบ UI
export const getSkillsByCategory = (category: SkillCategory) => mySkills.filter(s => s.category === category);
export const getHighlightSkills = () => mySkills.filter(s => s.isHighlight);