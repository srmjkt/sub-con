import { NextResponse, type NextRequest } from 'next/server';
import { redisSetResourceKey, isRedisAvailable } from '@/lib/pusiknas/redis';

export async function POST(req: NextRequest) {
  try {
    const adminToken = process.env.PUSIKNAS_ADMIN_TOKEN || process.env.ADMIN_TOKEN || '';
    const auth = req.headers.get('authorization');
    if (!adminToken) {
      return NextResponse.json({ error: 'admin_token_not_configured' }, { status: 403 });
    }
    if (!auth || !auth.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'missing_authorization' }, { status: 401 });
    }
    const provided = auth.replace('Bearer ', '').trim();
    if (provided !== adminToken) {
      return NextResponse.json({ error: 'invalid_admin_token' }, { status: 401 });
    }

    const body = await req.json();
    const resourceKey = body?.resource_key;
    if (!resourceKey) return NextResponse.json({ error: 'missing_resource_key' }, { status: 400 });

    if (isRedisAvailable()) {
      const ok = await redisSetResourceKey(resourceKey);
      if (!ok) return NextResponse.json({ error: 'redis_set_failed' }, { status: 500 });
      return NextResponse.json({ ok: true, stored_in: 'redis' });
    }

    // fallback: set in process env (ephemeral)
    process.env.PUSIKNAS_POWERBI_RESOURCE_KEY = resourceKey;
    return NextResponse.json({ ok: true, stored_in: 'env_ephemeral', warning: 'resource_key_saved_in_process_env_only' });
  } catch (e: any) {
    return NextResponse.json({ error: String(e.message || e) }, { status: 500 });
  }
}
