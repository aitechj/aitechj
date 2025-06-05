import { NextRequest, NextResponse } from 'next/server';
import { db, sections, topics } from '../../../../lib/db';
import { requireCSRF } from '../../../../lib/security/csrf';
import { eq, desc, and } from 'drizzle-orm';
import { performQualityChecks } from '../../../../lib/content/validation';

async function getSections(request: NextRequest) {
  try {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl || databaseUrl.includes('127.0.0.1') || databaseUrl.includes('localhost')) {
      return NextResponse.json(
        { error: 'Database not available during build' },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');
    const topicId = searchParams.get('topicId');
    const status = searchParams.get('status');

    if (topicId && status) {
      const sectionsList = await db.select({
        id: sections.id,
        title: sections.title,
        content: sections.content,
        orderIndex: sections.orderIndex,
        status: sections.status,
        publishAt: sections.publishAt,
        metaTitle: sections.metaTitle,
        metaDescription: sections.metaDescription,
        readingTime: sections.readingTime,
        versionNumber: sections.versionNumber,
        summary: sections.summary,
        createdAt: sections.createdAt,
        updatedAt: sections.updatedAt,
        topicId: sections.topicId,
        topicTitle: topics.title,
      }).from(sections)
        .leftJoin(topics, eq(sections.topicId, topics.id))
        .where(and(eq(sections.topicId, topicId), eq(sections.status, status)))
        .limit(limit)
        .offset(offset)
        .orderBy(desc(sections.createdAt));
      return NextResponse.json({ sections: sectionsList });
    }

    if (topicId) {
      const sectionsList = await db.select({
        id: sections.id,
        title: sections.title,
        content: sections.content,
        orderIndex: sections.orderIndex,
        status: sections.status,
        publishAt: sections.publishAt,
        metaTitle: sections.metaTitle,
        metaDescription: sections.metaDescription,
        readingTime: sections.readingTime,
        versionNumber: sections.versionNumber,
        summary: sections.summary,
        createdAt: sections.createdAt,
        updatedAt: sections.updatedAt,
        topicId: sections.topicId,
        topicTitle: topics.title,
      }).from(sections)
        .leftJoin(topics, eq(sections.topicId, topics.id))
        .where(eq(sections.topicId, topicId))
        .limit(limit)
        .offset(offset)
        .orderBy(desc(sections.createdAt));
      return NextResponse.json({ sections: sectionsList });
    }

    if (status) {
      const sectionsList = await db.select({
        id: sections.id,
        title: sections.title,
        content: sections.content,
        orderIndex: sections.orderIndex,
        status: sections.status,
        publishAt: sections.publishAt,
        metaTitle: sections.metaTitle,
        metaDescription: sections.metaDescription,
        readingTime: sections.readingTime,
        versionNumber: sections.versionNumber,
        summary: sections.summary,
        createdAt: sections.createdAt,
        updatedAt: sections.updatedAt,
        topicId: sections.topicId,
        topicTitle: topics.title,
      }).from(sections)
        .leftJoin(topics, eq(sections.topicId, topics.id))
        .where(eq(sections.status, status))
        .limit(limit)
        .offset(offset)
        .orderBy(desc(sections.createdAt));
      return NextResponse.json({ sections: sectionsList });
    }

    const sectionsList = await db.select({
      id: sections.id,
      title: sections.title,
      content: sections.content,
      orderIndex: sections.orderIndex,
      status: sections.status,
      publishAt: sections.publishAt,
      metaTitle: sections.metaTitle,
      metaDescription: sections.metaDescription,
      readingTime: sections.readingTime,
      versionNumber: sections.versionNumber,
      summary: sections.summary,
      createdAt: sections.createdAt,
      updatedAt: sections.updatedAt,
      topicId: sections.topicId,
      topicTitle: topics.title,
    }).from(sections)
      .leftJoin(topics, eq(sections.topicId, topics.id))
      .limit(limit)
      .offset(offset)
      .orderBy(desc(sections.createdAt));

    return NextResponse.json({ sections: sectionsList });
  } catch (error) {
    console.error('Error fetching sections:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sections' },
      { status: 500 }
    );
  }
}

async function createSection(request: NextRequest) {
  try {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl || databaseUrl.includes('127.0.0.1') || databaseUrl.includes('localhost')) {
      return NextResponse.json(
        { error: 'Database not available during build' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const {
      topicId,
      title,
      content,
      orderIndex,
      metaTitle,
      metaDescription,
      summary,
    } = body;

    if (!topicId || !title || !content) {
      return NextResponse.json(
        { error: 'Topic ID, title, and content are required' },
        { status: 400 }
      );
    }

    const qualityResult = performQualityChecks({
      title,
      content,
      metaTitle,
      metaDescription,
    });

    const wordCount = content.split(/\s+/).length;
    const readingTime = Math.ceil(wordCount / 200);

    const newSection = await db.insert(sections).values({
      topicId,
      title,
      content,
      orderIndex,
      metaTitle,
      metaDescription,
      readingTime,
      summary,
      status: 'draft',
      versionNumber: 1,
    }).returning();

    return NextResponse.json({ 
      section: newSection[0],
      qualityCheck: qualityResult 
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating section:', error);
    return NextResponse.json(
      { error: 'Failed to create section' },
      { status: 500 }
    );
  }
}

export const GET = getSections;
export const POST = requireCSRF(createSection);
