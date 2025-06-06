import { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://aitechj.com';
  
  let topicUrls: Array<{
    url: string;
    lastModified: Date;
    changeFrequency: 'weekly';
    priority: number;
  }> = [];

  const isLocalDev = process.env.NODE_ENV === 'development';
  const databaseUrl = process.env.DATABASE_URL;
  
  if (isLocalDev || databaseUrl) {
    try {
      const { db, topics } = await import('../lib/db');
      const topicsList = await db.select({
        slug: topics.slug,
        category: topics.category,
        updatedAt: topics.createdAt,
      }).from(topics);

      topicUrls = topicsList.map((topic: any) => ({
        url: `${baseUrl}/learn/${topic.category}/${topic.slug}`,
        lastModified: topic.updatedAt || new Date(),
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      }));
    } catch (error) {
      console.warn('Failed to fetch topics for sitemap, using static sitemap:', error);
    }
  }

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
