import { NextRequest, NextResponse } from 'next/server';
import { db, topics } from '../../../../lib/db';
import { requireCSRF } from '../../../../lib/security/csrf';
import { eq, desc } from 'drizzle-orm';
import { validatePrerequisites, validateTags } from '../../../../lib/content/validation';

async function getTopics(request: NextRequest) {
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
    const category = searchParams.get('category');

    let query = db.select().from(topics);
    
    if (category) {
      const filteredQuery = query.where(eq(topics.category, category));
      const topicsList = await filteredQuery
        .limit(limit)
        .offset(offset)
        .orderBy(desc(topics.createdAt));
      return NextResponse.json({ topics: topicsList });
    }

    const topicsList = await query
      .limit(limit)
      .offset(offset)
      .orderBy(desc(topics.createdAt));

    return NextResponse.json({ topics: topicsList });
  } catch (error) {
    console.error('Error fetching topics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch topics' },
      { status: 500 }
    );
  }
}

async function createTopic(request: NextRequest) {
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
      title,
      description,
      difficultyLevel,
      category,
      prerequisites,
      estimatedTime,
      metaTitle,
      metaDescription,
      slug,
      tags,
    } = body;

    if (!title || !difficultyLevel) {
      return NextResponse.json(
        { error: 'Title and difficulty level are required' },
        { status: 400 }
      );
    }

    let validatedPrerequisites: string[] = [];
    let validatedTags: string[] = [];

    if (prerequisites) {
      try {
        validatedPrerequisites = validatePrerequisites(prerequisites);
      } catch (error: any) {
        return NextResponse.json(
          { error: `Invalid prerequisites: ${error.message}` },
          { status: 400 }
        );
      }
    }

    if (tags) {
      try {
        validatedTags = validateTags(tags);
      } catch (error: any) {
        return NextResponse.json(
          { error: `Invalid tags: ${error.message}` },
          { status: 400 }
        );
      }
    }

    const newTopic = await db.insert(topics).values({
      title,
      description,
      difficultyLevel,
      category,
      prerequisites: validatedPrerequisites,
      estimatedTime,
      metaTitle,
      metaDescription,
      slug,
      tags: validatedTags,
    }).returning();

    return NextResponse.json({ topic: newTopic[0] }, { status: 201 });
  } catch (error) {
    console.error('Error creating topic:', error);
    return NextResponse.json(
      { error: 'Failed to create topic' },
      { status: 500 }
    );
  }
}

export const GET = getTopics;
export const POST = requireCSRF(createTopic);
