import { ImageResponse } from 'next/og';
import { IconArt } from '@/components/IconArt';

export const dynamic = 'force-static';
export function generateStaticParams() {
  return [{ size: '192' }, { size: '512' }, { size: '180' }];
}

export async function GET(_: Request, ctx: { params: Promise<{ size: string }> }) {
  const n = Math.min(1024, Math.max(16, Number((await ctx.params).size) || 192));
  return new ImageResponse(<IconArt size={n} />, { width: n, height: n });
}
