import { NextRequest, NextResponse } from 'next/server';
import { rejectAction } from '@/lib/approvals/service';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const result = await rejectAction(id);

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: { code: 'REJECTION_FAILED', message: result.error } },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        approval: {
          id: result.approval!.id,
          status: result.approval!.status,
          toolName: result.approval!.toolName,
        },
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'REJECTION_FAILED',
          message: error instanceof Error ? error.message : 'Failed to reject action.',
        },
      },
      { status: 500 }
    );
  }
}
