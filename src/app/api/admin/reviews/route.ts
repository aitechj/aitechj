import { NextRequest, NextResponse } from 'next/server';
import { db, contentReviews, sections, users, reviewAssignments } from '../../../../lib/db';
import { requireCSRF } from '../../../../lib/security/csrf';
import { eq, desc, and } from 'drizzle-orm';

async function getReviews(request: NextRequest) {
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
    const status = searchParams.get('status');
    const reviewerId = searchParams.get('reviewerId');

    if (status && reviewerId) {
      const reviewsList = await db.select({
        id: contentReviews.id,
        sectionId: contentReviews.sectionId,
        reviewerId: contentReviews.reviewerId,
        status: contentReviews.status,
        comments: contentReviews.comments,
        automatedChecks: contentReviews.automatedChecks,
        createdAt: contentReviews.createdAt,
        updatedAt: contentReviews.updatedAt,
        sectionTitle: sections.title,
        reviewerName: users.email,
      }).from(contentReviews)
        .leftJoin(sections, eq(contentReviews.sectionId, sections.id))
        .leftJoin(users, eq(contentReviews.reviewerId, users.id))
        .where(and(eq(contentReviews.status, status), eq(contentReviews.reviewerId, reviewerId)))
        .limit(limit)
        .offset(offset)
        .orderBy(desc(contentReviews.createdAt));
      return NextResponse.json({ reviews: reviewsList });
    }

    if (status) {
      const reviewsList = await db.select({
        id: contentReviews.id,
        sectionId: contentReviews.sectionId,
        reviewerId: contentReviews.reviewerId,
        status: contentReviews.status,
        comments: contentReviews.comments,
        automatedChecks: contentReviews.automatedChecks,
        createdAt: contentReviews.createdAt,
        updatedAt: contentReviews.updatedAt,
        sectionTitle: sections.title,
        reviewerName: users.email,
      }).from(contentReviews)
        .leftJoin(sections, eq(contentReviews.sectionId, sections.id))
        .leftJoin(users, eq(contentReviews.reviewerId, users.id))
        .where(eq(contentReviews.status, status))
        .limit(limit)
        .offset(offset)
        .orderBy(desc(contentReviews.createdAt));
      return NextResponse.json({ reviews: reviewsList });
    }

    if (reviewerId) {
      const reviewsList = await db.select({
        id: contentReviews.id,
        sectionId: contentReviews.sectionId,
        reviewerId: contentReviews.reviewerId,
        status: contentReviews.status,
        comments: contentReviews.comments,
        automatedChecks: contentReviews.automatedChecks,
        createdAt: contentReviews.createdAt,
        updatedAt: contentReviews.updatedAt,
        sectionTitle: sections.title,
        reviewerName: users.email,
      }).from(contentReviews)
        .leftJoin(sections, eq(contentReviews.sectionId, sections.id))
        .leftJoin(users, eq(contentReviews.reviewerId, users.id))
        .where(eq(contentReviews.reviewerId, reviewerId))
        .limit(limit)
        .offset(offset)
        .orderBy(desc(contentReviews.createdAt));
      return NextResponse.json({ reviews: reviewsList });
    }

    const reviewsList = await db.select({
      id: contentReviews.id,
      sectionId: contentReviews.sectionId,
      reviewerId: contentReviews.reviewerId,
      status: contentReviews.status,
      comments: contentReviews.comments,
      automatedChecks: contentReviews.automatedChecks,
      createdAt: contentReviews.createdAt,
      updatedAt: contentReviews.updatedAt,
      sectionTitle: sections.title,
      reviewerName: users.email,
    }).from(contentReviews)
      .leftJoin(sections, eq(contentReviews.sectionId, sections.id))
      .leftJoin(users, eq(contentReviews.reviewerId, users.id))
      .limit(limit)
      .offset(offset)
      .orderBy(desc(contentReviews.createdAt));

    return NextResponse.json({ reviews: reviewsList });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reviews' },
      { status: 500 }
    );
  }
}

async function createReview(request: NextRequest) {
  try {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl || databaseUrl.includes('127.0.0.1') || databaseUrl.includes('localhost')) {
      return NextResponse.json(
        { error: 'Database not available during build' },
        { status: 503 }
      );
    }

    const body = await request.json();
    const { sectionId, reviewerId, comments, automatedChecks } = body;

    if (!sectionId) {
      return NextResponse.json(
        { error: 'Section ID is required' },
        { status: 400 }
      );
    }

    const newReview = await db.insert(contentReviews).values({
      sectionId,
      reviewerId,
      status: 'pending',
      comments,
      automatedChecks,
    }).returning();

    return NextResponse.json({ review: newReview[0] }, { status: 201 });
  } catch (error) {
    console.error('Error creating review:', error);
    return NextResponse.json(
      { error: 'Failed to create review' },
      { status: 500 }
    );
  }
}

export const GET = getReviews;
export const POST = requireCSRF(createReview);
