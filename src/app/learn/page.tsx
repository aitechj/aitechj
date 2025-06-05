import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import { db, topics } from '../../lib/db';
import { desc } from 'drizzle-orm';

export const metadata: Metadata = {
  title: 'Learn - AITechJ | AI-Powered Technical Learning',
  description: 'Discover comprehensive technical tutorials and courses powered by AI. Learn programming, web development, DevOps, and more with personalized guidance.',
  keywords: 'technical learning, programming tutorials, web development, DevOps, AI-powered learning',
  openGraph: {
    title: 'Learn - AITechJ',
    description: 'Discover comprehensive technical tutorials and courses powered by AI.',
    type: 'website',
    url: '/learn',
  },
  alternates: {
    canonical: '/learn',
  },
};

async function getTopics() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl || databaseUrl.includes('127.0.0.1') || databaseUrl.includes('localhost')) {
    return [];
  }

  try {
    const topicsList = await db.select({
      id: topics.id,
      title: topics.title,
      description: topics.description,
      difficultyLevel: topics.difficultyLevel,
      category: topics.category,
      estimatedTime: topics.estimatedTime,
      slug: topics.slug,
      tags: topics.tags,
    })
    .from(topics)
    .orderBy(desc(topics.createdAt))
    .limit(12);

    return topicsList;
  } catch (error) {
    console.error('Failed to fetch topics:', error);
    return [];
  }
}

export default async function LearnPage() {
  const topicsList = await getTopics();
  
  const difficultyLabels = {
    1: 'Novice',
    2: 'Beginner', 
    3: 'Intermediate',
    4: 'Pro'
  };

  const categories = Array.from(new Set(topicsList.map(topic => topic.category))).filter(Boolean);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Learn with AI-Powered Guidance
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Master modern technologies with personalized, adaptive learning experiences. 
            From beginner to pro, our AI tutor guides you every step of the way.
          </p>
        </div>

        {categories.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Categories</h2>
            <div className="flex flex-wrap gap-3">
              {categories.map((category) => (
                <Link
                  key={category}
                  href={`/learn?category=${encodeURIComponent(category || '')}`}
                  className="px-4 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  {category?.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                </Link>
              ))}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {topicsList.map((topic) => (
            <Link
              key={topic.id}
              href={`/learn/${topic.category}/${topic.slug}`}
              className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-6 border border-gray-200"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                  {difficultyLabels[topic.difficultyLevel as keyof typeof difficultyLabels]}
                </span>
                <span className="text-gray-500 text-sm">
                  {topic.estimatedTime} min
                </span>
              </div>
              
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {topic.title}
              </h3>
              
              <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                {topic.description}
              </p>
              
              {Array.isArray(topic.tags) && topic.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {topic.tags.slice(0, 3).map((tag: string, index: number) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs"
                    >
                      {tag}
                    </span>
                  ))}
                  {topic.tags.length > 3 && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                      +{topic.tags.length - 3} more
                    </span>
                  )}
                </div>
              )}
            </Link>
          ))}
        </div>

        {topicsList.length === 0 && (
          <div className="text-center py-12">
            <h3 className="text-xl font-medium text-gray-900 mb-2">
              No topics available yet
            </h3>
            <p className="text-gray-600">
              We're preparing amazing content for you. Check back soon!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
