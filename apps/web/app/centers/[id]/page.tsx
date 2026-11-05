import { notFound } from 'next/navigation';
import { Workbench } from '@/components/workbench';

export const dynamicParams = false;
export function generateStaticParams() {
  return Array.from({ length: 9 }, (_, index) => ({ id: String(index + 1) }));
}
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[1-9]$/.test(id)) notFound();
  return <Workbench centerId={Number(id)} />;
}
