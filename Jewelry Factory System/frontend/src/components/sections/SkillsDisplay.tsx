// src/components/sections/SkillsDisplay.tsx
import { useState } from 'react';
import { mySkills, type SkillCategory, type SkillItem } from '../../config/SkillsConfig';

export default function SkillsDisplay() {
    const [activeTab, setActiveTab] = useState<SkillCategory | 'all'>('all');

    const categories: { key: SkillCategory | 'all'; label: string }[] = [
        { key: 'all', label: 'ทั้งหมด' },
        { key: 'frontend', label: 'Frontend' },
        { key: 'backend', label: 'Backend' },
        { key: 'database', label: 'Database' },
        { key: 'infrastructure', label: 'IT Support / Infra' },
        { key: 'tools', label: 'Tools' },
    ];

    const filteredSkills = activeTab === 'all'
        ? mySkills
        : mySkills.filter(s => s.category === activeTab);

    return (
        <div className="w-full max-w-5xl mx-auto p-6 bg-[var(--color-surface-0)] rounded-2xl border border-[var(--color-border-light)] shadow-sm">
            <div className="mb-6">
                <h2 className="text-xl font-bold text-[var(--color-text-primary)]">ทักษะและความเชี่ยวชาญ</h2>
                <p className="text-xs text-[var(--color-text-tertiary)] mt-1">รายการทักษะทางเทคนิคและการจัดการระบบไอที</p>
            </div>

            {/* Tabs Filter */}
            <div className="flex flex-wrap gap-1.5 border-b border-[var(--color-border-light)] pb-3 mb-6">
                {categories.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${activeTab === tab.key
                                ? 'bg-[var(--color-brand-500)] text-white shadow-sm'
                                : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-2)]'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Skills Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredSkills.map((skill: SkillItem) => {
                    const IconComponent = skill.icon;
                    return (
                        <div
                            key={skill.id}
                            className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${skill.isHighlight
                                    ? 'border-[var(--color-brand-300)] bg-[var(--color-brand-50)]/20'
                                    : 'border-[var(--color-border-default)] bg-[var(--color-surface-1)] hover:bg-[var(--color-surface-2)]/50'
                                }`}
                        >
                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2.5">
                                        <div className={`p-1.5 rounded-lg ${skill.isHighlight ? 'bg-[var(--color-brand-500)] text-white' : 'bg-[var(--color-surface-2)] text-[var(--color-text-secondary)]'}`}>
                                            <IconComponent size={16} />
                                        </div>
                                        <span className="text-sm font-semibold text-[var(--color-text-primary)]">{skill.name}</span>
                                    </div>
                                    <span className="text-xs font-mono font-bold text-[var(--color-brand-600)]">{skill.level}%</span>
                                </div>

                                {skill.description && (
                                    <p className="text-[11px] text-[var(--color-text-secondary)] mb-3 pl-9 line-clamp-2 leading-relaxed">
                                        {skill.description}
                                    </p>
                                )}
                            </div>

                            {/* Progress Bar */}
                            <div className="w-full bg-[var(--color-surface-2)] h-1.5 rounded-full overflow-hidden pl-9 mt-1">
                                <div
                                    className="h-full bg-[var(--color-brand-500)] rounded-full transition-all duration-500"
                                    style={{ width: `${skill.level}%` }}
                                />
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}