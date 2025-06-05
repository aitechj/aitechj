import { NextRequest, NextResponse } from 'next/server';
import { db, topics } from '../../../../lib/db';
import { eq, desc, and } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    if (!process.env.DATABASE_URL) {
      return NextResponse.json({ 
        topics: [],
        pagination: {
          limit: 12,
          offset: 0,
          total: 0
        }
      });
    }

    const { searchParams } = request.nextUrl;
    const category = searchParams.get('category');
    const difficulty = searchParams.get('difficulty');
    const limit = parseInt(searchParams.get('limit') || '12');
    const offset = parseInt(searchParams.get('offset') || '0');

    const conditions = [];
    if (category) {
      conditions.push(eq(topics.category, category));
    }
    if (difficulty) {
      conditions.push(eq(topics.difficultyLevel, parseInt(difficulty)));
    }

    const baseQuery = db.select({
      id: topics.id,
      title: topics.title,
      description: topics.description,
      difficultyLevel: topics.difficultyLevel,
      category: topics.category,
      estimatedTime: topics.estimatedTime,
      slug: topics.slug,
      tags: topics.tags,
      createdAt: topics.createdAt,
    }).from(topics);

    const topicsList = await (conditions.length > 0 
      ? baseQuery.where(and(...conditions))
      : baseQuery)
      .limit(limit)
      .offset(offset)
      .orderBy(desc(topics.createdAt));

    return NextResponse.json({ 
      topics: topicsList,
      pagination: {
        limit,
        offset,
        total: topicsList.length
      }
    });
  } catch (error) {
    console.error('Error fetching public topics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch topics' },
      { status: 500 }
    );
  }
}
