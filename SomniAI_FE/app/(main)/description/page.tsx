'use client';

/**
 * Description Page
 * Unified page for viewing, creating, and editing descriptions
 */

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { descriptionAPI } from '@/lib/api';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { TiptapEditor } from '@/components/editor/TiptapEditor';
import { Plus, FileText, Save, Trash2, X, Edit2 } from 'lucide-react';

interface Description {
  id: string;
  title: string;
  content: any;
  status: 'DRAFT' | 'PUBLISHED';
  updatedAt: string;
  version: number;
  author: {
    id: string;
    username: string;
  };
}

type ViewMode = 'list' | 'view' | 'edit' | 'create';

export default function DescriptionPage() {
  const { user } = useAuth();
  const [descriptions, setDescriptions] = useState<Description[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<ViewMode>('list');
  const [selectedDesc, setSelectedDesc] = useState<Description | null>(null);

  // Edit/Create form state
  const [title, setTitle] = useState('');
  const [content, setContent] = useState<any>({});
  const [saving, setSaving] = useState(false);

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

  const handleSelectDescription = async (id: string) => {
    try {
      const response = await descriptionAPI.getById(id);
      if (response.data.success) {
        const desc = response.data.data;
        setSelectedDesc(desc);
        setTitle(desc.title);
        setContent(desc.content);
        setMode('view');
      }
    } catch (error) {
      console.error('Failed to fetch description:', error);
    }
  };

  const handleNewDescription = () => {
    setSelectedDesc(null);
    setTitle('');
    setContent({});
    setMode('create');
  };

  const handleEdit = () => {
    setMode('edit');
  };

  const handleCancelEdit = () => {
    if (selectedDesc) {
      setTitle(selectedDesc.title);
      setContent(selectedDesc.content);
      setMode('view');
    } else {
      setMode('list');
    }
  };

  const handleCreate = async () => {
    if (!title.trim()) {
      alert('Please enter a title');
      return;
    }

    setSaving(true);
    try {
      const response = await descriptionAPI.create(title, content);
      if (response.data.success) {
        await fetchDescriptions();
        const newDesc = response.data.data;
        setSelectedDesc(newDesc);
        setMode('view');
        alert('Created successfully!');
      }
    } catch (error) {
      console.error('Create failed:', error);
      alert('Failed to create description');
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!selectedDesc) return;

    setSaving(true);
    try {
      await descriptionAPI.update(selectedDesc.id, title, content);
      await fetchDescriptions();
      const response = await descriptionAPI.getById(selectedDesc.id);
      if (response.data.success) {
        setSelectedDesc(response.data.data);
      }
      setMode('view');
      alert('Saved successfully!');
    } catch (error) {
      console.error('Save failed:', error);
      alert('Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedDesc) return;
    if (!confirm('Delete this description? This cannot be undone!')) return;

    try {
      await descriptionAPI.delete(selectedDesc.id);
      await fetchDescriptions();
      setSelectedDesc(null);
      setMode('list');
    } catch (error) {
      console.error('Delete failed:', error);
      alert('Delete failed');
    }
  };

  const canEdit = selectedDesc && (user?.id === selectedDesc.author.id);

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      {/* Left Sidebar - List */}
      <div className="w-80 border-r border-gray-200 flex flex-col bg-gray-50">
        <div className="p-6 border-b border-gray-200 bg-white">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Descriptions
          </h1>
          {user && (
            <button
              onClick={handleNewDescription}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              <Plus className="w-5 h-5" />
              New Description
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : descriptions.length === 0 ? (
            <div className="text-center py-12 px-4">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-sm text-gray-600">No descriptions yet</p>
              {user && (
                <button
                  onClick={handleNewDescription}
                  className="mt-4 text-sm text-blue-600 hover:underline"
                >
                  Create your first description
                </button>
              )}
            </div>
          ) : (
            descriptions.map((desc) => (
              <button
                key={desc.id}
                onClick={() => handleSelectDescription(desc.id)}
                className={`w-full text-left p-3 rounded-lg transition-colors ${
                  selectedDesc?.id === desc.id
                    ? 'bg-blue-50 border-2 border-blue-500'
                    : 'bg-white hover:bg-gray-100 border-2 border-transparent'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-gray-900 line-clamp-1 text-sm">
                    {desc.title}
                  </h3>
                  {desc.status === 'DRAFT' && (
                    <Badge label="Draft" variant="default" size="sm" />
                  )}
                </div>
                <p className="text-xs text-gray-600">By {desc.author.username}</p>
                <p className="text-xs text-gray-500">
                  {new Date(desc.updatedAt).toLocaleDateString()}
                </p>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden bg-white">
        {mode === 'list' || (!selectedDesc && mode !== 'create') ? (
          // Empty state
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center max-w-md">
              <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Welcome to Descriptions
              </h2>
              <p className="text-gray-600 mb-6">
                Select a description from the list or create a new one to get started.
              </p>
              {user && (
                <button
                  onClick={handleNewDescription}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Create New Description
                </button>
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="border-b border-gray-200 p-6 bg-white">
              <div className="flex justify-between items-start">
                <div className="flex-1 mr-4">
                  {mode === 'view' ? (
                    <>
                      <h1 className="text-3xl font-bold text-gray-900 mb-2">
                        {title}
                      </h1>
                      {selectedDesc && (
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span>By {selectedDesc.author.username}</span>
                          <span>•</span>
                          <span>
                            Updated: {new Date(selectedDesc.updatedAt).toLocaleString()}
                          </span>
                          <span>•</span>
                          <Badge
                            label={selectedDesc.status}
                            variant={selectedDesc.status === 'PUBLISHED' ? 'success' : 'default'}
                          />
                          <span>•</span>
                          <span>v{selectedDesc.version}</span>
                        </div>
                      )}
                    </>
                  ) : (
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="text-3xl font-bold w-full border-b-2 border-gray-300 focus:border-blue-600 outline-none pb-2"
                      placeholder="Enter title..."
                      autoFocus
                    />
                  )}
                </div>

                <div className="flex gap-2">
                  {mode === 'view' && canEdit && (
                    <>
                      <button
                        onClick={handleEdit}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
                      >
                        <Edit2 className="w-4 h-4" />
                        Edit
                      </button>
                      <button
                        onClick={handleDelete}
                        className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        Delete
                      </button>
                    </>
                  )}

                  {(mode === 'edit' || mode === 'create') && (
                    <>
                      <button
                        onClick={mode === 'create' ? handleCreate : handleSave}
                        disabled={saving}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                      >
                        <Save className="w-4 h-4" />
                        {saving ? 'Saving...' : mode === 'create' ? 'Create' : 'Save'}
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="bg-gray-200 px-4 py-2 rounded-lg hover:bg-gray-300 flex items-center gap-2"
                      >
                        <X className="w-4 h-4" />
                        Cancel
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Editor Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="max-w-4xl mx-auto">
                <TiptapEditor
                  content={content}
                  onChange={setContent}
                  editable={mode === 'edit' || mode === 'create'}
                  placeholder={mode === 'create' ? 'Start writing your description...' : ''}
                />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
