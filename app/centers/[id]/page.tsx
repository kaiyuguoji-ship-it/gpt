import { notFound } from 'next/navigation';
import { Workbench } from '@/components/workbench';
export default async function Page({params}:{params:Promise<{id:string}>}){const {id}=await params;if(!/^[1-8]$/.test(id))notFound();return <Workbench centerId={Number(id)}/>}
