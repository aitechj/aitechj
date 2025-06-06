import { NextRequest, NextResponse } from 'next/server';
import { db, mediaFiles } from '../../../../lib/db';
import { requireCSRF } from '../../../../lib/security/csrf';
import { eq, desc } from 'drizzle-orm';

async function getMediaFiles(request: NextRequest) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl || databaseUrl.includes('127.0.0.1') || databaseUrl.includes('localhost')) {
    return NextResponse.json(
      { error: 'Database not available during build' },
      { status: 503 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const mimeType = searchParams.get('mimeType');

    if (mimeType) {
      const filesList = await db.select().from(mediaFiles)
        .where(eq(mediaFiles.mimeType, mimeType))
        .limit(limit)
        .offset(offset)
        .orderBy(desc(mediaFiles.createdAt));
      return NextResponse.json({ files: filesList });
    }

    const filesList = await db.select().from(mediaFiles)
      .limit(limit)
      .offset(offset)
      .orderBy(desc(mediaFiles.createdAt));

    return NextResponse.json({ files: filesList });
  } catch (error) {
    console.error('Error fetching media files:', error);
    return NextResponse.json(
      { error: 'Failed to fetch media files' },
      { status: 500 }
    );
  }
}

async function uploadMedia(request: NextRequest) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl || databaseUrl.includes('127.0.0.1') || databaseUrl.includes('localhost')) {
    return NextResponse.json(
      { error: 'Database not available during build' },
      { status: 503 }
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const altText = formData.get('altText') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File size exceeds 10MB limit' },
        { status: 400 }
      );
    }

    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf',
      'text/plain',
      'text/markdown'
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'File type not allowed' },
        { status: 400 }
      );
    }

    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const extension = file.name.split('.').pop();
    const filename = `${timestamp}-${randomString}.${extension}`;

    const storageUrl = `/uploads/${filename}`;

    const newFile = await db.insert(mediaFiles).values({
      filename,
      originalName: file.name,
      fileSize: file.size,
      mimeType: file.type,
      storageUrl,
      altText,
      uploadedBy: null, // TODO: Get from auth context
    }).returning();

    return NextResponse.json({ file: newFile[0] }, { status: 201 });
  } catch (error) {
    console.error('Error uploading media:', error);
    return NextResponse.json(
      { error: 'Failed to upload media' },
      { status: 500 }
    );
  }
}

export const GET = getMediaFiles;
export const POST = requireCSRF(uploadMedia);
