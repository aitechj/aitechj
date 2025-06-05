import React from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { db, topics, sections } from '../../../../lib/db';
import { eq, and } from 'drizzle-orm';

interface TopicPageProps {
  params: {
    category: string;
    slug: string;
  };
}

async function getTopicData(slug: string) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl || databaseUrl.includes('127.0.0.1') || databaseUrl.includes('localhost')) {
    return null;
  }

  try {
    const topic = await db.select().from(topics).where(eq(topics.slug, slug)).limit(1);
    
    if (topic.length === 0) {
      return null;
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

    return {
      topic: topic[0],
      sections: topicSections
    };
  } catch (error) {
    console.error('Failed to fetch topic data:', error);
    return null;
  }
}

export async function generateMetadata({ params }: TopicPageProps): Promise<Metadata> {
  const data = await getTopicData(params.slug);
  
  if (!data) {
    return {
      title: 'Topic Not Found',
    };
  }

  const { topic } = data;
  
  return {
    title: topic.metaTitle || `${topic.title} - AITechJ`,
    description: topic.metaDescription || topic.description,
    keywords: Array.isArray(topic.tags) ? topic.tags.join(', ') : '',
    openGraph: {
      title: topic.metaTitle || topic.title,
      description: topic.metaDescription || topic.description || undefined,
      type: 'article',
      url: `/learn/${params.category}/${params.slug}`,
    },
    twitter: {
      card: 'summary_large_image',
      title: topic.metaTitle || topic.title,
      description: topic.metaDescription || topic.description || undefined,
    },
    alternates: {
      canonical: `/learn/${params.category}/${params.slug}`,
    },
  };
}

export default async function TopicPage({ params }: TopicPageProps) {
  const data = await getTopicData(params.slug);
  
  if (!data) {
    notFound();
  }

  const { topic, sections } = data;
  
  const difficultyLabels = {
    1: 'Novice',
    2: 'Beginner', 
    3: 'Intermediate',
    4: 'Pro'
  };

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: topic.title,
    description: topic.description,
    keywords: Array.isArray(topic.tags) ? topic.tags.join(', ') : '',
    author: {
      '@type': 'Organization',
      name: 'AITechJ'
    },
    publisher: {
      '@type': 'Organization',
      name: 'AITechJ'
    },
    datePublished: topic.createdAt?.toISOString(),
    url: `/learn/${params.category}/${params.slug}`,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-white rounded-lg shadow-sm p-8">
            <div className="mb-6">
              <div className="flex items-center gap-4 mb-4">
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                  {difficultyLabels[topic.difficultyLevel as keyof typeof difficultyLabels]}
                </span>
                <span className="text-gray-500 text-sm">
                  {topic.estimatedTime} minutes
                </span>
              </div>
              
              <h1 className="text-4xl font-bold text-gray-900 mb-4">
                {topic.title}
              </h1>
              
              <p className="text-xl text-gray-600 leading-relaxed">
                {topic.description}
              </p>
              
              {Array.isArray(topic.tags) && topic.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-6">
                  {topic.tags.map((tag: string, index: number) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t pt-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6">
                Course Content
              </h2>
              
              {sections.length > 0 ? (
                <div className="space-y-4">
                  {sections.map((section, index) => (
                    <div
                      key={section.id}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <span className="flex items-center justify-center w-8 h-8 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                          {index + 1}
                        </span>
                        <div>
                          <h3 className="font-medium text-gray-900">
                            {section.title}
                          </h3>
                          {section.summary && (
                            <p className="text-sm text-gray-600 mt-1">
                              {section.summary}
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-sm text-gray-500">
                        {section.readingTime} min
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600">
                  Content is being prepared. Check back soon!
                </p>
              )}
            </div>

            <div className="border-t pt-8 mt-8">
              <button className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 transition-colors">
                Start Learning
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
