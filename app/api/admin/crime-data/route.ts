import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET: Fetch all crime data
export async function GET() {
  try {
    const crimeData = await prisma.crimeData.findMany({
      orderBy: { province: 'asc' },
    });
    return NextResponse.json({ crimeData });
  } catch (error: any) {
    // If the table doesn't exist yet, return empty array instead of error
    if (error?.code === 'P2021' || error?.message?.includes('does not exist') || error?.message?.includes('relation')) {
      console.log('CrimeData table does not exist yet, returning empty array');
      return NextResponse.json({ crimeData: [] });
    }
    console.error('Error fetching crime data:', error);
    return NextResponse.json({ error: 'Failed to fetch crime data' }, { status: 500 });
  }
}

// POST: Create or update crime data for a province
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { province, crimeCount, year, notes, updatedById } = body;

    if (!province) {
      return NextResponse.json({ error: 'Province is required' }, { status: 400 });
    }

    // Upsert: create if doesn't exist, update if it does
    const crimeData = await prisma.crimeData.upsert({
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

    return NextResponse.json({ crimeData });
  } catch (error) {
    console.error('Error saving crime data:', error);
    return NextResponse.json({ error: 'Failed to save crime data' }, { status: 500 });
  }
}

// DELETE: Delete crime data for a province
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const province = searchParams.get('province');

    if (!province) {
      return NextResponse.json({ error: 'Province is required' }, { status: 400 });
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