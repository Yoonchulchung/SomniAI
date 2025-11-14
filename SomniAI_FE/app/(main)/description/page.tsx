'use client';

/**
 * Description List Page
 * Shows all descriptions
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { descriptionAPI } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Plus, FileText } from 'lucide-react';

interface Description {
  id: string;
  title: string;
  status: 'DRAFT' | 'PUBLISHED';
  updatedAt: string;
  author: {
    username: string;
  };
}

export default function DescriptionListPage() {
  const { user } = useAuth();
  const [descriptions, setDescriptions] = useState<Description[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDescriptions();
  }, []);

  const fetchDescriptions = async () => {
    try {
      const response = await descriptionAPI.getAll();
      if (response.data.success) {
        setDescriptions(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch descriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Description
          </h1>
          <p className="text-gray-600">프로젝트 설명 및 문서</p>
        </div>

        {user && (
          <Link
            href="/description/new"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            New Description
          </Link>
        )}
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      ) : descriptions.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No descriptions yet</p>
            {user && (
              <Link
                href="/description/new"
                className="inline-block mt-4 text-blue-600 hover:underline"
              >
                Create your first description
              </Link>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {descriptions.map((desc) => (
            <Link
              key={desc.id}
              href={`/description/${desc.id}`}
              className="block"
            >
              <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                <CardContent>
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-lg font-bold text-gray-900 line-clamp-2">
                      {desc.title}
                    </h3>
                    {desc.status === 'DRAFT' && (
                      <Badge
                        label="DRAFT"
                        variant="default"
                        size="sm"
                      />
                    )}
                    {desc.status === 'PUBLISHED' && (
                      <Badge label="Published" variant="success" size="sm" />
                    )}
                  </div>

                  <div className="text-sm text-gray-600 space-y-1">
                    <p>By {desc.author.username}</p>
                    <p>
                      Updated:{' '}
                      {new Date(desc.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
