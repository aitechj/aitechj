import { MetadataRoute } from 'next';
import { db, topics } from '../lib/db';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://aitechj.com';
  
  const topicsList = await db.select({
    slug: topics.slug,
    category: topics.category,
    updatedAt: topics.createdAt,
  }).from(topics);

  const topicUrls = topicsList.map((topic) => ({
    url: `${baseUrl}/learn/${topic.category}/${topic.slug}`,
    lastModified: topic.updatedAt || new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }));

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1,
    },
    {
      url: `${baseUrl}/learn`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    ...topicUrls,
  ];
}
