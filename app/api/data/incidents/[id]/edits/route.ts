import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  // Check for authorization using user ID existence
  if (!session?.userId) { 
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params;

  try {
    // Ensure the incidentId passed to Prisma is valid before querying
    if (!id) {
        return NextResponse.json({ error: 'Missing Incident ID' }, { status: 400 });
    }

    const edits = await prisma.incidentReportEdit.findMany({
      where: { incidentReportId: id },
      include: {
        editedBy: {
          select: {
            id: true,
            name: true,
            username: true,
            email: true,
          },
        },
      },
      orderBy: { editedAt: 'desc' },
    })

    return NextResponse.json({ edits })
  } catch (error) {
    console.error('[INCIDENT_EDITS] Error fetching edits:', error)
    return NextResponse.json(
      { error: 'Failed to fetch edit history' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  // Check for authorization using user ID existence
  if (!session?.userId) { 
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json();
    // Validate payload structure and required fields for update.
    if (!body) {
      return NextResponse.json({ error: 'Invalid request or missing parameters' }, { status: 400 });
    }

    const { id: incidentId } = await params;
    const { changes } = body; // The raw changes payload from the client
    // Filter out null, undefined, or empty strings before passing to Prisma
    const filteredChanges: any = {};
    for (const key in changes) {
        if (changes[key] !== null && changes[key] !== undefined && String(changes[key]) !== '') {
            filteredChanges[key] = changes[key];
        }
    }
    // Use filtered data for the update logic

    // Start database transaction for atomicity
    await prisma.$transaction(async (tx) => {
        // 1. Update the main incident record based on 'filteredChanges' payload
        await tx.incidentReport.update({
            where: { id: incidentId }, // Assuming the primary key of IncidentReport is available or inferable
            data: filteredChanges, 
            select: {}
        });

        // 2. Log the edit history entry (Only if session user ID is available)
        const userId = session.userId;
        await tx.incidentReportEdit.create({
            data: {
                incidentReportId: incidentId,
                editedById: userId,
                fieldName: Object.keys(changes).join(', '),
                oldValue: null,
                newValue: JSON.stringify(changes),
            },
        });
    });

    return NextResponse.json({ success: true, message: 'Incident record updated and edit history logged.' }, { status: 200 });

  } catch (error) {
    console.error('[INCIDENT_EDITS] Error updating incident record:', error);
    // Provide detailed error feedback to the user on client side if possible
    const errorMessage = error instanceof Error ? error.message : 'Failed to update record';
    return NextResponse.json(
      { error: errorMessage }, 
      { status: 500 }
    );
  }
}