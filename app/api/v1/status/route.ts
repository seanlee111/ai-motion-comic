import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { validateRequest, handleError } from '@/lib/api/middleware';
import { JimengProvider } from '@/lib/api/providers/jimeng';
import { KlingProvider } from '@/lib/api/providers/kling';
import { FalProvider } from '@/lib/api/providers/fal';

export const runtime = 'nodejs';

const StatusSchema = z.object({
  provider: z.enum(['JIMENG', 'KLING', 'FAL']),
  taskId: z.string().min(1),
  endpoint: z.string().optional() // For Fal to pass status_url or model endpoint
});

export async function POST(req: NextRequest) {
  try {
    const body = await validateRequest(req, StatusSchema);
    
    let result;
    if (body.provider === 'JIMENG') {
        const provider = new JimengProvider();
        result = await provider.checkStatus(body.taskId);
    } else if (body.provider === 'KLING') {
        const provider = new KlingProvider();
        result = await provider.checkStatus(body.taskId);
    } else if (body.provider === 'FAL') {
        const provider = new FalProvider();
        result = await provider.checkStatus(body.taskId, body.endpoint);
    }

    return NextResponse.json({
        code: 0,
        message: 'Success',
        data: result
    });

  } catch (error) {
    return handleError(error);
  }
}
