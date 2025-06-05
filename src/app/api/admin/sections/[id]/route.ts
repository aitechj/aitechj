import { NextRequest, NextResponse } from 'next/server';
import { db, sections, contentVersions, contentReviews } from '../../../../../lib/db';
import { requireCSRF } from '../../../../../lib/security/csrf';
import { eq } from 'drizzle-orm';
import { performQualityChecks } from '../../../../../lib/content/validation';

async function getSection(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const section = await db.select().from(sections).where(eq(sections.id, params.id)).limit(1);
    
    if (section.length === 0) {
      return NextResponse.json(
        { error: 'Section not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ section: section[0] });
  } catch (error) {
    console.error('Error fetching section:', error);
    return NextResponse.json(
      { error: 'Failed to fetch section' },
      { status: 500 }
    );
  }
}

async function updateSection(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const {
      title,
      content,
      orderIndex,
      metaTitle,
      metaDescription,
      summary,
      status,
    } = body;

    const currentSection = await db.select().from(sections).where(eq(sections.id, params.id)).limit(1);
    
    if (currentSection.length === 0) {
      return NextResponse.json(
        { error: 'Section not found' },
        { status: 404 }
      );
    }

    let qualityResult = null;
    if (content) {
      qualityResult = performQualityChecks({
        title: title || currentSection[0].title,
        content,
        metaTitle,
        metaDescription,
      });
    }

    let readingTime = currentSection[0].readingTime;
    if (content) {
      const wordCount = content.split(/\s+/).length;
      readingTime = Math.ceil(wordCount / 200);
    }

    if (content && content !== currentSection[0].content) {
      await db.insert(contentVersions).values({
        sectionId: params.id,
        content: currentSection[0].content || '',
        versionNumber: currentSection[0].versionNumber || 1,
        createdBy: null, // TODO: Get from auth context
      });
    }

    const updatedSection = await db.update(sections)
      .set({
        title,
        content,
        orderIndex,
        metaTitle,
        metaDescription,
        readingTime,
        summary,
        status,
        versionNumber: content ? (currentSection[0].versionNumber || 1) + 1 : currentSection[0].versionNumber,
        updatedAt: new Date(),
      })
      .where(eq(sections.id, params.id))
      .returning();

    return NextResponse.json({ 
      section: updatedSection[0],
      qualityCheck: qualityResult 
    });
  } catch (error) {
    console.error('Error updating section:', error);
    return NextResponse.json(
      { error: 'Failed to update section' },
      { status: 500 }
    );
  }
}

async function deleteSection(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const deletedSection = await db.delete(sections)
      .where(eq(sections.id, params.id))
      .returning();

    if (deletedSection.length === 0) {
      return NextResponse.json(
        { error: 'Section not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: 'Section deleted successfully' });
  } catch (error) {
    console.error('Error deleting section:', error);
    return NextResponse.json(
      { error: 'Failed to delete section' },
      { status: 500 }
    );
  }
}

export const GET = getSection;
export const PUT = requireCSRF(updateSection);
export const DELETE = requireCSRF(deleteSection);
