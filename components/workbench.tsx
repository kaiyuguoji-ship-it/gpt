'use client';

import Link from 'next/link';
import { ArrowRight, ArrowUpRight, Sparkles, Activity, Boxes, Truck, Image as ImageIcon, Search, ShieldCheck, Microscope, Wallet, TrendingUp, Megaphone } from 'lucide-react';
import { centers } from '@/lib/centers';

const icons = [TrendingUp, Microscope, Wallet, ImageIcon, Search, Megaphone, Boxes, Truck, ShieldCheck];

export function Workbench({ centerId }: { centerId?: number }) {
  const center = centerId ? centers[centerId - 1] : null;
  if (center) {
    const Icon = center.icon;
    return (
      <main className="page-shell">
        <div className="eyebrow">APPLICATION / {String(centerId).padStart(2, '0')}</div>
        <div className="page-heading">
          <div><div className="app-heading-icon"><Icon size={23}/></div><h1>{center.name}</h1><p>{center.description}</p></div>
          <span className="availability"><i/>应用工作区</span>
        </div>
        <div className="module-toolbar"><div><strong>功能模块</strong><span> · {center.en}</span></div><span className="module-count">{center.tags.length} MODULES</span></div>
        <div className="module-grid">
          {center.tags.map((tag, index) => (
            <button className="module-card" key={tag} type="button">
              <span className="module-card-index">{String(index + 1).padStart(2, '0')}</span>
              <strong>{tag}</strong>
              <span className="module-card-foot">进入功能 <ArrowUpRight size={14}/></span>
            </button>
          ))}
        </div>
        <section className="empty-workspace">
          <div className="empty-icon"><Sparkles size={21}/></div>
          <h2>为 {center.name} 准备的专属工作空间</h2>
          <p>功能页面、数据模型与专业 Agent 将按模块逐步接入。当前版本先建立统一导航和应用结构，不展示虚构的经营数据。</p>
          <Link href="/" className="text-link">返回总览 <ArrowRight size={14}/></Link>
        </section>
      </main>
    );
  }

  return (
    <main className="page-shell overview-shell" aria-label="业务应用">
      <div className="application-grid">
        {centers.map((center, index) => {
          const Icon = icons[index];
          return (
            <Link href={`/centers/${index + 1}/`} className="application-card" key={center.en}>
              <div className="application-card-top"><span className="application-icon"><Icon size={21} strokeWidth={1.65}/></span><span className="application-index">{String(index + 1).padStart(2, '0')}</span><ArrowUpRight size={17} className="application-arrow"/></div>
              <h3>{center.name}</h3><p>{center.description}</p>
              <div className="application-card-bottom"><span>进入工作空间</span><ArrowRight size={14}/></div>
            </Link>
          );
        })}
      </div>
      <section className="platform-note">
        <div className="platform-note-icon"><Activity size={19}/></div>
        <div><strong>统一平台 · 独立应用</strong><p>各业务中心拥有自己的功能、数据与工作流程，并通过共享业务标识关联成果。</p></div>
      </section>
    </main>
  );
}
