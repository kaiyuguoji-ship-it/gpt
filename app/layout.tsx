import type { Metadata } from 'next';
import { SidebarNavigation } from '@/components/sidebar-navigation';
import '@fontsource-variable/inter';
import './globals.css';
import './navigation.css';
import './workspace.css';
import './theme.css';

export const metadata: Metadata = {
  title: 'SWANYO OS · Amazon Business Platform',
  description: '面向亚马逊卖家的九大专业业务应用平台。',
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <SidebarNavigation />
        <div className="workspace">
          <header className="topbar">
            <div className="breadcrumb"><span>Workspace</span><b>/</b><strong>Amazon Business Platform</strong></div>
            <div className="topbar-right"><span className="workspace-label">PERSONAL WORKSPACE</span><span className="top-avatar" aria-label="用户账户">S</span></div>
          </header>
          {children}
          <footer className="site-footer"><span>SWANYO OS © 2026</span><span>NINE APPLICATIONS · ONE WORKSPACE</span></footer>
        </div>
      </body>
    </html>
  );
}
