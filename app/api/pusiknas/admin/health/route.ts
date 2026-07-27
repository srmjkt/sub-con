import { NextResponse, type NextRequest } from 'next/server';
import { redisGetResourceKey, isRedisAvailable } from '@/lib/pusiknas/redis';

export async function GET(req: NextRequest) {
  try {
    const test = req.nextUrl.searchParams.get('test') === '1';

    // prefer redis-stored resource key
    let resourceKey = null;
    if (isRedisAvailable()) {
      resourceKey = await redisGetResourceKey();
    }
    if (!resourceKey) resourceKey = process.env.PUSIKNAS_POWERBI_RESOURCE_KEY || null;

    const result: any = { ok: true, resourceKeyPresent: !!resourceKey, resourceKeySource: isRedisAvailable() ? 'redis' : 'env' };

    if (test && resourceKey) {
      // do a light test query to PowerBI (not implemented heavy) — return that we would attempt it.
      result.test = 'skipped';
      result.note = 'Test execution requires making a PowerBI query; pass ?test=1 to attempt (may fail if invalid key)';
    }

    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: String(e.message || e) }, { status: 500 });
  }
}
