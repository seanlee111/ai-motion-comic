import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { validateRequest, handleError } from '@/lib/api/middleware';
import { DeepSeekProvider } from '@/lib/api/providers/deepseek';
import { logger } from '@/lib/api/core/logger';
import { v4 as uuidv4 } from 'uuid';

export const runtime = 'nodejs';

const ScriptGenerateSchema = z.object({
  idea: z.string().min(1)
});

export async function POST(req: NextRequest) {
  const traceId = uuidv4();
  
  try {
    const body = await validateRequest(req, ScriptGenerateSchema);
    
    logger.info(`Script Generate Request [${traceId}]`, { ideaLength: body.idea.length });

    const provider = new DeepSeekProvider();
    const script = await provider.generateScript(body.idea);

    return NextResponse.json({
        code: 0,
        message: 'Success',
        data: { script },
        traceId
    });

  } catch (error: any) {
    if (error.detail) error.detail = { ...error.detail, traceId };
    return handleError(error);
  }
}
