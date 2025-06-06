'use client';

import React, { useState, useEffect } from 'react';
import { TopicForm } from '../../components/admin/TopicForm';
import { Button } from '../../components/ui/Button';

interface Topic {
  id: string;
  title: string;
  description: string;
  difficultyLevel: number;
  category: string;
  prerequisites: string[];
  estimatedTime: number;
  metaTitle: string;
  metaDescription: string;
  slug: string;
  tags: string[];
  createdAt: string;
}

export default function AdminDashboard() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [csrfToken, setCsrfToken] = useState('');

  useEffect(() => {
    fetchTopics();
    fetchCSRFToken();
  }, []);

  const fetchCSRFToken = async () => {
    try {
      const response = await fetch('/api/csrf');
      const data = await response.json();
      setCsrfToken(data.token);
    } catch (error) {
      console.error('Failed to fetch CSRF token:', error);
    }
  };

  const fetchTopics = async () => {
    try {
      const response = await fetch('/api/admin/topics');
      const data = await response.json();
      setTopics(data.topics || []);
    } catch (error) {
      console.error('Failed to fetch topics:', error);
    }
  };

  const handleCreateTopic = async (formData: any) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/topics', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        await fetchTopics();
        setShowCreateForm(false);
        await fetchCSRFToken(); // Refresh CSRF token
      } else {
        const error = await response.json();
        alert(`Error: ${error.error}`);
      }
    } catch (error) {
      console.error('Failed to create topic:', error);
      alert('Failed to create topic');
    } finally {
      setIsLoading(false);
    }
  };

  const getDifficultyLabel = (level: number) => {
    const labels = { 1: 'Novice', 2: 'Beginner', 3: 'Intermediate', 4: 'Pro' };
    return labels[level as keyof typeof labels] || 'Unknown';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="mt-2 text-gray-600">Manage topics, sections, and content</p>
        </div>

        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Topics</h2>
              <Button onClick={() => setShowCreateForm(true)}>
                Create New Topic
              </Button>
            </div>
          </div>

          {showCreateForm && (
            <div className="px-6 py-6 border-b border-gray-200 bg-gray-50">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Topic</h3>
              <TopicForm
                onSubmit={handleCreateTopic}
                isLoading={isLoading}
              />
            </div>
          )}

          <div className="px-6 py-4">
            {topics.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500">No topics found. Create your first topic to get started.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {topics.map((topic) => (
                  <div key={topic.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-lg font-medium text-gray-900 truncate">{topic.title}</h3>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        topic.difficultyLevel === 1 ? 'bg-green-100 text-green-800' :
                        topic.difficultyLevel === 2 ? 'bg-blue-100 text-blue-800' :
                        topic.difficultyLevel === 3 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {getDifficultyLabel(topic.difficultyLevel)}
                      </span>
                    </div>
                    
                    {topic.category && (
                      <p className="text-sm text-gray-600 mb-2">Category: {topic.category}</p>
                    )}
                    
                    {topic.description && (
                      <p className="text-sm text-gray-700 mb-3 line-clamp-2">{topic.description}</p>
                    )}
                    
                    {topic.estimatedTime > 0 && (
                      <p className="text-xs text-gray-500 mb-2">Est. time: {topic.estimatedTime} min</p>
                    )}
                    
                    {topic.tags && topic.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {topic.tags.slice(0, 3).map((tag, index) => (
                          <span key={index} className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                            {tag}
                          </span>
                        ))}
                        {topic.tags.length > 3 && (
                          <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                            +{topic.tags.length - 3} more
                          </span>
                        )}
                      </div>
                    )}
                    
                    <div className="flex justify-between items-center text-xs text-gray-500">
                      <span>Created: {new Date(topic.createdAt).toLocaleDateString()}</span>
                      <Button size="sm" variant="outline">
                        Edit
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
