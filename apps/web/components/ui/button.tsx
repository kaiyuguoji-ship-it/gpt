import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';
const variants = cva('inline-flex items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-emerald-400 disabled:opacity-50 disabled:pointer-events-none bg-emerald-400 text-black hover:bg-emerald-300 px-4 py-2');
export function Button({className, asChild=false, ...props}: React.ComponentProps<'button'> & {asChild?:boolean}) { const Comp=asChild?Slot:'button'; return <Comp className={cn(variants(),className)} {...props}/>; }
