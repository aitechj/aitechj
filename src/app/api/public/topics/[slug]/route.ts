import { NextRequest, NextResponse } from 'next/server';
import { db, topics, sections } from '../../../../../lib/db';
import { eq, and } from 'drizzle-orm';

export async function GET(request: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const slug = params.slug;
    
    const topic = await db.select().from(topics).where(eq(topics.slug, slug)).limit(1);
    
    if (topic.length === 0) {
      return NextResponse.json(
        { error: 'Topic not found' },
        { status: 404 }
      );
    }

    const topicSections = await db.select({
      id: sections.id,
      title: sections.title,
      orderIndex: sections.orderIndex,
      readingTime: sections.readingTime,
      summary: sections.summary,
    })
    .from(sections)
    .where(and(
      eq(sections.topicId, topic[0].id),
      eq(sections.status, 'published')
    ))
    .orderBy(sections.orderIndex);

    return NextResponse.json({ 
      topic: topic[0],
      sections: topicSections
    });
  } catch (error) {
    console.error('Error fetching topic:', error);
    return NextResponse.json(
      { error: 'Failed to fetch topic' },
      { status: 500 }
    );
  }
}
