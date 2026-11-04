import { TrendingUp, Microscope, Wallet, Image, Search, Megaphone, Boxes, Truck, ShieldCheck } from 'lucide-react';

export const centers = [
  { name: '市场情报中心', en: 'Market Intelligence', description: '自动发现、筛选与分析亚马逊细分市场。', tags: ['市场发现', '竞争分析', '细分市场', '机会评估'], icon: TrendingUp },
  { name: '产品研发中心', en: 'Product R&D', description: '从市场类目节点出发，完成选品、消费者研究与产品创新。', tags: ['类目节点选品', 'ASIN 产品池', '竞品研究', '消费者洞察', '产品规格', '供应链研究'], icon: Microscope },
  { name: '商业决策中心', en: 'Business Decision', description: '建立利润模型、资金预算与产品投资评估。', tags: ['成本模型', '利润分析', '盈亏平衡', '资金预测', '风险评估'], icon: Wallet },
  { name: '视觉创意中心', en: 'Creative Studio', description: '以无限画布为核心的 AI 图片创作、编辑与 3D 视觉工作台。', tags: ['AI 创作工作台', '无限画布', '元素拆解', '图片生成编辑', '3D 产品预览', 'A+ 页面设计'], icon: Image },
  { name: 'Listing 与 SEO', en: 'Listing & SEO', description: '关键词研究、Listing 内容生产与 SEO 审核。', tags: ['关键词研究', '关键词库', 'Listing 编辑器', 'SEO 审核'], icon: Search },
  { name: '广告运营中心', en: 'Advertising Operations', description: '读取广告表现数据，提供诊断与优化建议，不直接修改广告活动。', tags: ['广告总览', 'Campaign 分析', '搜索词分析', '预算诊断', '优化建议'], icon: Megaphone },
  { name: '库存管理中心', en: 'FBA Inventory', description: '专注 Amazon FBA 库存、库龄、库存健康与补货预测。', tags: ['FBA 库存总览', '站点库存', 'SKU 库存', '库龄分析', '补货预测', '库存对账'], icon: Boxes },
  { name: '运营管理中心', en: 'Operations & Supply Chain', description: '管理采购、生产、包装、3D 装箱、发货、物流、出口与 FBA 入仓。', tags: ['供应商管理', '采购订单', '生产管理', '包装管理', '3D 智能装箱', '发货物流', '出口单证', 'FBA 入仓'], icon: Truck },
  { name: '数据审计中心', en: 'Data Audit', description: '统一管理数据质量、来源追溯、Agent 执行与系统监控。', tags: ['数据源管理', '数据质量', '指标字典', '数据溯源', 'Agent 审计'], icon: ShieldCheck },
] as const;
