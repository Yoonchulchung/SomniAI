'use client';

/**
 * Description View/Edit Page
 * Shows description with Notion-like editor for admins
 */

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { descriptionAPI } from '@/lib/api';
import { TiptapEditor } from '@/components/editor/TiptapEditor';
import { Badge } from '@/components/ui/Badge';
import { ArrowLeft, Save, Eye, EyeOff, Trash2 } from 'lucide-react';
import Link from 'next/link';

interface Description {
  id: string;
  title: string;
  content: any;
  status: 'DRAFT' | 'PUBLISHED';
  version: number;
  updatedAt: string;
  publishedAt: string | null;
  author: {
    id: string;
    username: string;
  };
}

export default function DescriptionPage() {
  const router = useRouter();
  const params = useParams();
  const { isAdmin, user } = useAuth();
  const [description, setDescription] = useState<Description | null>(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const id = params.id as string;

  useEffect(() => {
    fetchDescription();
  }, [id]);

  const fetchDescription = async () => {
    try {
      const response = await descriptionAPI.getById(id);
      if (response.data.success) {
        const desc = response.data.data;
        setDescription(desc);
        setTitle(desc.title);
        setContent(desc.content);
      }
    } catch (error) {
      console.error('Failed to fetch description:', error);
      router.push('/description');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await descriptionAPI.update(id, title, content);
      alert('Saved successfully!');
      fetchDescription();
    } catch (error) {
      console.error('Save failed:', error);
      alert('Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!confirm('Publish this description?')) return;

    try {
      await descriptionAPI.publish(id);
      alert('Published successfully!');
      fetchDescription();
    } catch (error) {
      console.error('Publish failed:', error);
      alert('Publish failed');
    }
  };

  const handleUnpublish = async () => {
    if (!confirm('Unpublish this description?')) return;

    try {
      await descriptionAPI.unpublish(id);
      alert('Unpublished successfully!');
      fetchDescription();
    } catch (error) {
      console.error('Unpublish failed:', error);
      alert('Unpublish failed');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this description? This cannot be undone!')) return;

    try {
      await descriptionAPI.delete(id);
      router.push('/description');
    } catch (error) {
      console.error('Delete failed:', error);
      alert('Delete failed');
    }
  };

  const canEdit = isAdmin || user?.id === description?.author.id;

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!description) {
    return null;
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/description"
          className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to list
        </Link>

        <div className="flex justify-between items-start">
          <div className="flex-1">
            {canEdit && isEditing ? (
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="text-3xl font-bold w-full border-b-2 border-gray-300 focus:border-blue-600 outline-none pb-2"
                placeholder="Title"
              />
            ) : (
              <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
            )}

            <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
              <span>By {description.author.username}</span>
              <span>•</span>
              <span>
                Updated: {new Date(description.updatedAt).toLocaleString()}
              </span>
              <span>•</span>
              <Badge
                label={description.status}
                variant={
                  description.status === 'PUBLISHED' ? 'success' : 'default'
                }
              />
              <span>•</span>
              <span>v{description.version}</span>
            </div>
          </div>

          {canEdit && (
            <div className="flex gap-2">
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                >
                  Edit
                </button>
              ) : (
                <>
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="bg-gray-200 px-4 py-2 rounded-lg hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </>
              )}

              {description.status === 'DRAFT' ? (
                <button
                  onClick={handlePublish}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  Publish
                </button>
              ) : (
                <button
                  onClick={handleUnpublish}
                  className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 flex items-center gap-2"
                >
                  <EyeOff className="w-4 h-4" />
                  Unpublish
                </button>
              )}

              <button
                onClick={handleDelete}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Editor */}
      <div className="bg-white rounded-lg shadow-sm">
        <TiptapEditor
          content={content}
          onChange={setContent}
          editable={canEdit && isEditing}
          placeholder="Start writing your description..."
        />
      </div>

      {description.publishedAt && (
        <p className="mt-4 text-sm text-gray-600 text-center">
          Published: {new Date(description.publishedAt).toLocaleString()}
        </p>
      )}
    </div>
  );
}
