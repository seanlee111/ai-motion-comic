import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { validateRequest, handleError } from '@/lib/api/middleware';
import { JimengProvider } from '@/lib/api/providers/jimeng';
import { KlingProvider } from '@/lib/api/providers/kling';
import { FalProvider } from '@/lib/api/providers/fal';
import { logger } from '@/lib/api/core/logger';
import { v4 as uuidv4 } from 'uuid';

export const runtime = 'nodejs'; // Force Node.js runtime for crypto

const GenerateSchema = z.object({
  provider: z.enum(['JIMENG', 'KLING', 'FAL']),
  modelConfig: z.object({
    id: z.string(),
    endpoint: z.string().optional()
  }).optional(), // Optional to allow backend to decide defaults or use minimal config
  prompt: z.string().min(1),
  aspect_ratio: z.string().optional(),
  n: z.number().optional(),
  imageUrl: z.string().optional() // Add support for input image
});

export async function POST(req: NextRequest) {
  const traceId = uuidv4();
  
  try {
    const body = await validateRequest(req, GenerateSchema);
    
    logger.info(`Generate Request [${traceId}]`, { provider: body.provider, model: body.modelConfig?.id });

    let result;
    
    // Standardize request for provider
    const requestData = {
        model: body.modelConfig?.id || '',
        prompt: body.prompt,
        aspect_ratio: body.aspect_ratio,
        n: body.n,
        imageUrl: body.imageUrl
    };

    if (body.provider === 'JIMENG') {
        const provider = new JimengProvider();
        result = await provider.generate(requestData);
    } else if (body.provider === 'KLING') {
        const provider = new KlingProvider();
        result = await provider.generate(requestData);
    } else if (body.provider === 'FAL') {
        const provider = new FalProvider();
        result = await provider.generate(requestData);
    } else {
        throw new Error('Invalid Provider');
    }

    return NextResponse.json({
        code: 0,
        message: 'Success',
        data: result,
        traceId
    });

  } catch (error: any) {
    if (error.detail) error.detail = { ...error.detail, traceId };
    return handleError(error);
  }
}
