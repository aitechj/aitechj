import { NextRequest, NextResponse } from 'next/server';
import { db, topics } from '../../../../lib/db';
import { eq, desc, and } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const difficulty = searchParams.get('difficulty');
    const limit = parseInt(searchParams.get('limit') || '12');
    const offset = parseInt(searchParams.get('offset') || '0');

    let query = db.select({
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

    const conditions = [];
    if (category) {
      conditions.push(eq(topics.category, category));
    }
    if (difficulty) {
      conditions.push(eq(topics.difficultyLevel, parseInt(difficulty)));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const topicsList = await query
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
