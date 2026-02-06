import { z, ZodError } from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { APIError } from '../core/types';

export async function validateRequest<T>(req: NextRequest, schema: z.Schema<T>): Promise<T> {
  try {
    const body = await req.json();
    return schema.parse(body);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new APIError('Validation Failed', 400, {
        message: 'Invalid request parameters',
        raw: (error as any).errors
      });
    }
    throw new APIError('Invalid JSON', 400);
  }
}

export function handleError(error: unknown) {
  if (error instanceof APIError) {
    return NextResponse.json({
      code: error.code,
      message: error.message,
      detail: error.detail,
      traceId: error.traceId
    }, { status: error.code });
  }

  console.error('Unhandled API Error:', error);
  return NextResponse.json({
    code: 500,
    message: 'Internal Server Error',
    detail: error instanceof Error ? error.message : String(error)
  }, { status: 500 });
}
