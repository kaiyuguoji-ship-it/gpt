'use client';

import Link from 'next/link';
import { ArrowRight, ArrowUpRight, Sparkles, Activity, CircleArrowUpRight, Boxes, Truck, Image as ImageIcon, Search, ShieldCheck, Microscope, Wallet, TrendingUp, Megaphone } from 'lucide-react';
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
    <main className="page-shell overview-shell">
      <section className="hero">
        <div className="eyebrow">AMAZON BUSINESS APPLICATION PLATFORM</div>
        <h1>把复杂经营，<br/>变成清晰的每一步。</h1>
        <p>九大专业应用，覆盖市场研究、产品研发、商业决策与日常运营。</p>
        <div className="hero-note"><Sparkles size={15}/> 一个统一入口，九个独立业务工作空间。</div>
      </section>
      <div className="section-heading"><div><h2>业务应用</h2><p>BUSINESS APPLICATIONS</p></div><span>09 APPLICATIONS</span></div>
      <div className="application-grid">
        {centers.map((center, index) => {
          const Icon = icons[index];
          return (
            <Link href={`/centers/${index + 1}/`} className="application-card" key={center.en}>
              <div className="application-card-top"><span className="application-icon"><Icon size={21} strokeWidth={1.65}/></span><span className="application-index">{String(index + 1).padStart(2, '0')}</span><CircleArrowUpRight size={17} className="application-arrow"/></div>
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
