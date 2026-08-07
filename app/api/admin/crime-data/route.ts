import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET: Fetch crime data, optionally filtered by year/level/city
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const year = url.searchParams.get('year');
    const level = url.searchParams.get('level');
    const province = url.searchParams.get('province');
    const city = url.searchParams.get('city');

    if (level === 'regency') {
      const where: any = {};
      if (province) where.province = province;
      if (city) where.city = city;
      if (year) where.year = Number(year);

      const data = await prisma.regencyCrimeData.findMany({
        where,
        orderBy: { province: 'asc' },
      });
      return NextResponse.json({ crimeData: data });
    }

    const where: any = {};
    if (province) where.province = province;
    if (year) where.year = Number(year);

    const crimeData = await prisma.crimeData.findMany({
      where,
      orderBy: { province: 'asc' },
    });
    return NextResponse.json({ crimeData });
  } catch (error: any) {
    if (error?.code === 'P2021' || error?.message?.includes('does not exist') || error?.message?.includes('relation')) {
      console.log('CrimeData table does not exist yet, returning empty array');
      return NextResponse.json({ crimeData: [] });
    }
    console.error('Error fetching crime data:', error);
    return NextResponse.json({ error: 'Failed to fetch crime data' }, { status: 500 });
  }
}

// POST: Create or update crime data
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { province, crimeCount, year, notes, updatedById, level, city } = body;

    if (!province) {
      return NextResponse.json({ error: 'Province is required' }, { status: 400 });
    }

    if (level === 'regency') {
      if (!city) {
        return NextResponse.json({ error: 'City is required for regency-level data' }, { status: 400 });
      }

      const data = await prisma.regencyCrimeData.upsert({
        where: {
          province_city_year: {
            province,
            city,
            year: Number(year) || new Date().getFullYear(),
          },
        },
        update: {
          crimeCount: Number(crimeCount) || 0,
          notes: notes || null,
          updatedById: updatedById || null,
        },
        create: {
          province,
          city,
          crimeCount: Number(crimeCount) || 0,
          year: Number(year) || new Date().getFullYear(),
          notes: notes || null,
          updatedById: updatedById || null,
        },
      });
      return NextResponse.json({ crimeData: data });
    }

    const data = await prisma.crimeData.upsert({
      where: { province: province },
      update: {
        crimeCount: Number(crimeCount) || 0,
        year: Number(year) || new Date().getFullYear(),
        notes: notes || null,
        updatedById: updatedById || null,
      },
      create: {
        province: province,
        crimeCount: Number(crimeCount) || 0,
        year: Number(year) || new Date().getFullYear(),
        notes: notes || null,
        updatedById: updatedById || null,
      },
    });

    return NextResponse.json({ crimeData: data });
  } catch (error) {
    console.error('Error saving crime data:', error);
    return NextResponse.json({ error: 'Failed to save crime data' }, { status: 500 });
  }
}

// DELETE: Delete crime data
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const province = searchParams.get('province');
    const level = searchParams.get('level');
    const city = searchParams.get('city');

    if (!province) {
      return NextResponse.json({ error: 'Province is required' }, { status: 400 });
    }

    if (level === 'regency' && city) {
      await prisma.regencyCrimeData.deleteMany({
        where: { province, city },
      });
      return NextResponse.json({ success: true });
    }

    await prisma.crimeData.delete({
      where: { province: province },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting crime data:', error);
    return NextResponse.json({ error: 'Failed to delete crime data' }, { status: 500 });
  }
}
