'use client';

/**
 * Create New Description Page
 * Admin-only page for creating new descriptions
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { descriptionAPI } from '@/lib/api';
import { TiptapEditor } from '@/components/editor/TiptapEditor';
import { ArrowLeft, Save } from 'lucide-react';
import Link from 'next/link';

export default function NewDescriptionPage() {
  const router = useRouter();
  const { isAdmin } = useAuth();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState<any>({});
  const [saving, setSaving] = useState(false);

  if (!isAdmin) {
    router.push('/description');
    return null;
  }

  const handleCreate = async () => {
    if (!title.trim()) {
      alert('Please enter a title');
      return;
    }

    setSaving(true);
    try {
      const response = await descriptionAPI.create(title, content);
      if (response.data.success) {
        const newId = response.data.data.id;
        router.push(`/description/${newId}`);
      }
    } catch (error) {
      console.error('Create failed:', error);
      alert('Failed to create description');
    } finally {
      setSaving(false);
    }
  };

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
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-3xl font-bold w-full border-b-2 border-gray-300 focus:border-blue-600 outline-none pb-2"
              placeholder="Enter title..."
              autoFocus
            />
          </div>

          <button
            onClick={handleCreate}
            disabled={saving}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>

      {/* Editor */}
      <div className="bg-white rounded-lg shadow-sm">
        <TiptapEditor
          content={content}
          onChange={setContent}
          editable={true}
          placeholder="Start writing your description..."
        />
      </div>

      <p className="mt-4 text-sm text-gray-600 text-center">
        Description will be created as DRAFT. You can publish it later.
      </p>
    </div>
  );
}
