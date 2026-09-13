import { NextRequest, NextResponse } from 'next/server';
import { getPendingApprovals, getApproval } from '@/lib/approvals/service';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      const approval = await getApproval(id);
      if (!approval) {
        return NextResponse.json(
          { success: false, error: { code: 'NOT_FOUND', message: 'Approval not found.' } },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true, data: approval });
    }

    const approvals = await getPendingApprovals();
    return NextResponse.json({ success: true, data: approvals });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'Failed to fetch approvals.',
        },
      },
      { status: 500 }
    );
  }
}
