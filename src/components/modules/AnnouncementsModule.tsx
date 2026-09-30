import React, { useState, useEffect } from 'react';
import {
  Megaphone,
  Plus,
  Pin,
  FileText,
  Calendar,
  Search,
  Download,
  X,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Paperclip,
  Upload,
  UserCheck,
  Filter
} from 'lucide-react';
import { useAcademicData } from '../../context/AcademicDataContext';
import { useAuth } from '../../context/AuthContext';
import { Announcement } from '../../types';

export const AnnouncementsModule: React.FC = () => {
  const { currentRole, currentUser } = useAuth();
  const { announcements, createAnnouncement, updateAnnouncement, deleteAnnouncement, purgeAllDemoData, departments } = useAcademicData();

  const canManage = currentRole === 'admin' || currentRole === 'hod';
  const [filterAudience, setFilterAudience] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [search, setSearch] = useState('');

  // Modals & form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState<Announcement | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState<Announcement['category']>('academic');
  const [targetAudience, setTargetAudience] = useState<Announcement['targetAudience']>('all');
  const [department, setDepartment] = useState('All Departments');
  const [isPinned, setIsPinned] = useState(false);
  const [attachmentName, setAttachmentName] = useState('');

  // Check if opened with intent to publish (e.g. from Admin Dashboard)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash === '#publish') {
      openCreateModal();
      window.history.replaceState(null, '', window.location.pathname);
    }
  }, []);

  const openCreateModal = () => {
    setEditingAnnouncement(null);
    setTitle('');
    setContent('');
    setCategory('academic');
    setTargetAudience('all');
    setDepartment('All Departments');
    setIsPinned(false);
    setAttachmentName('');
    setIsModalOpen(true);
  };

  const openEditModal = (anc: Announcement) => {
    setEditingAnnouncement(anc);
    setTitle(anc.title);
    setContent(anc.content);
    setCategory(anc.category);
    setTargetAudience(anc.targetAudience);
    setDepartment(anc.department || 'All Departments');
    setIsPinned(anc.isPinned || false);
    setAttachmentName(anc.attachmentName || '');
    setIsModalOpen(true);
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      showNotification('error', 'Please provide both title and circular content.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingAnnouncement) {
        await updateAnnouncement(editingAnnouncement.id, {
          title: title.trim(),
          content: content.trim(),
          category,
          targetAudience,
          department: department === 'All Departments' ? undefined : department,
          isPinned,
          attachmentName: attachmentName.trim() || undefined
        });
        showNotification('success', 'Circular updated successfully.');
      } else {
        await createAnnouncement({
          title: title.trim(),
          content: content.trim(),
          category,
          targetAudience,
          department: department === 'All Departments' ? undefined : department,
          authorName: currentUser.name,
          authorRole: currentUser.designation || currentUser.role.toUpperCase(),
          isPinned,
          attachmentName: attachmentName.trim() || undefined
        });
        showNotification('success', 'Circular published to official notice board.');
      }
      setIsModalOpen(false);
    } catch (err: any) {
      showNotification('error', err?.message || 'Failed to save circular.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTogglePin = async (anc: Announcement) => {
    try {
      await updateAnnouncement(anc.id, { isPinned: !anc.isPinned });
      showNotification('success', anc.isPinned ? 'Circular unpinned.' : 'Circular pinned to top.');
    } catch (err: any) {
      showNotification('error', 'Failed to update pin status.');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteAnnouncement(id);
      setDeleteConfirmId(null);
      showNotification('success', 'Circular deleted from notice board.');
    } catch (err: any) {
      showNotification('error', 'Failed to delete circular.');
    }
  };

  const filteredAnnouncements = announcements.filter(a => {
    const matchesAudience = filterAudience === 'all' || a.targetAudience === filterAudience || a.targetAudience === 'all';
    const matchesCategory = filterCategory === 'all' || a.category === filterCategory;
    const matchesSearch =
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.content.toLowerCase().includes(search.toLowerCase()) ||
      a.authorName.toLowerCase().includes(search.toLowerCase());
    return matchesAudience && matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-5">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`p-3 rounded-lg text-xs font-semibold flex items-center justify-between shadow-md transition-all animate-in fade-in ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
              : 'bg-red-50 text-red-800 border border-red-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-slate-700 p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Title Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-lg border border-[#E2E8F0] shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 text-[#4F46E5] border border-indigo-200 flex items-center justify-center shrink-0">
            <Megaphone className="w-5 h-5 text-[#4F46E5]" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-[#0F172A]">
              Official Circulars & Senate Notifications
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Controller of Examinations notifications, academic senate circulars, administrative orders, and notices
            </p>
          </div>
        </div>

        {canManage && (
          <div className="flex items-center gap-2 self-start sm:self-auto">
            {currentRole === 'admin' && announcements.length > 0 && (
              <button
                onClick={async () => {
                  const res = await purgeAllDemoData();
                  showNotification('success', `Database cleansed: ${res.purgedTotal} demo records deleted.`);
                }}
                className="text-xs text-red-600 hover:text-red-700 font-semibold px-2.5 py-2 rounded bg-red-50 hover:bg-red-100 border border-red-200 transition-colors cursor-pointer"
              >
                Purge Demo Circulars
              </button>
            )}
            <button
              onClick={openCreateModal}
              className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-[#0F172A] hover:bg-slate-800 text-white font-semibold text-xs shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-amber-400" />
              Publish Circular
            </button>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white p-3 rounded-lg border border-[#E2E8F0] text-xs shadow-2xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          <input
            type="text"
            placeholder="Search circulars by title, keyword, or author..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full text-xs pl-8 pr-3 py-1.5 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Category Filter */}
          <div className="flex items-center gap-1">
            <span className="text-slate-400 font-medium">Category:</span>
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              className="text-xs px-2 py-1 rounded border border-[#E2E8F0] bg-[#F8FAFC] text-slate-700"
            >
              <option value="all">All Categories</option>
              <option value="academic">Academic</option>
              <option value="urgent">Urgent</option>
              <option value="exam">Examination</option>
              <option value="circular">Administrative</option>
              <option value="event">Campus Event</option>
            </select>
          </div>

          {/* Audience Filter Buttons */}
          <div className="flex items-center gap-1">
            <span className="text-slate-400 font-medium ml-1">Audience:</span>
            {['all', 'students', 'faculty', 'lab'].map(aud => (
              <button
                key={aud}
                onClick={() => setFilterAudience(aud)}
                className={`px-2.5 py-1 rounded text-xs font-semibold capitalize transition-colors cursor-pointer ${
                  filterAudience === aud
                    ? 'bg-[#0F172A] text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {aud}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Circulars List */}
      {filteredAnnouncements.length === 0 ? (
        <div className="bg-white rounded-lg border border-[#E2E8F0] p-10 sm:p-14 text-center shadow-xs">
          <div className="w-16 h-16 mx-auto rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-4">
            <Megaphone className="w-8 h-8 text-slate-400" />
          </div>
          {announcements.length === 0 ? (
            <>
              <h2 className="text-base font-bold text-[#0F172A] mb-1">
                No Circulars Published Yet
              </h2>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed mb-5">
                The institutional notice board has no published circulars. Broadcast exam schedules, senate resolutions, and academic notices to the campus community.
              </p>
              {canManage && (
                <button
                  onClick={openCreateModal}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-[#0F172A] hover:bg-slate-800 text-white font-semibold text-xs shadow-xs transition-all active:scale-95 cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-amber-400" />
                  Publish First Circular
                </button>
              )}
            </>
          ) : (
            <>
              <h2 className="text-sm font-bold text-[#0F172A] mb-1">
                No Circulars Match Search
              </h2>
              <p className="text-xs text-slate-500 max-w-md mx-auto mb-3">
                No announcements found matching the current keyword or audience filter.
              </p>
              <button
                onClick={() => {
                  setSearch('');
                  setFilterAudience('all');
                  setFilterCategory('all');
                }}
                className="px-3 py-1.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
              >
                Reset Filters
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredAnnouncements.map(anc => {
            return (
              <div
                key={anc.id}
                className={`bg-white rounded-lg border p-4 sm:p-5 shadow-2xs hover:shadow-xs transition-all text-xs ${
                  anc.isPinned ? 'border-indigo-300 bg-indigo-50/10' : 'border-[#E2E8F0]'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    {anc.isPinned && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
                        <Pin className="w-3 h-3 text-[#4F46E5]" /> Pinned Notice
                      </span>
                    )}
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        anc.category === 'urgent'
                          ? 'bg-red-50 text-red-800 border border-red-200'
                          : anc.category === 'exam'
                          ? 'bg-amber-50 text-amber-800 border border-amber-200'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}
                    >
                      {anc.category}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded uppercase">
                      Audience: {anc.targetAudience}
                    </span>
                    {anc.department && (
                      <span className="text-[10px] font-medium text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                        Dept: {anc.department}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-slate-400">
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>{anc.date}</span>
                    </div>

                    {/* Admin Actions: Pin, Edit, Delete */}
                    {canManage && (
                      <div className="flex items-center gap-1 ml-2 border-l border-slate-200 pl-2">
                        <button
                          onClick={() => handleTogglePin(anc)}
                          className={`p-1 rounded transition-colors ${
                            anc.isPinned
                              ? 'text-indigo-600 hover:bg-indigo-50'
                              : 'text-slate-400 hover:text-indigo-600 hover:bg-slate-100'
                          }`}
                          title={anc.isPinned ? 'Unpin Circular' : 'Pin to Top'}
                        >
                          <Pin className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => openEditModal(anc)}
                          className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                          title="Edit Circular"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(anc.id)}
                          className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Delete Circular"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <h2 className="text-sm sm:text-base font-bold text-[#0F172A] mt-1">{anc.title}</h2>
                <p className="text-slate-600 mt-2 leading-relaxed whitespace-pre-line text-xs sm:text-sm">
                  {anc.content}
                </p>

                <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px]">
                  <span className="text-slate-500">
                    Issued by: <strong className="text-slate-800 font-semibold">{anc.authorName}</strong> ({anc.authorRole})
                  </span>

                  {anc.attachmentName && (
                    <div className="flex items-center gap-1.5 px-3 py-1 rounded bg-[#F8FAFC] text-slate-800 font-medium text-xs border border-[#E2E8F0] self-start sm:self-auto">
                      <FileText className="w-3.5 h-3.5 text-[#4F46E5]" />
                      <span>{anc.attachmentName}</span>
                      <Download className="w-3 h-3 text-slate-400 ml-1" />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-lg max-w-lg w-full p-5 sm:p-6 shadow-xl border border-[#E2E8F0] my-8 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-[#4F46E5]" />
                <h2 className="text-sm font-bold text-[#0F172A] uppercase tracking-wider">
                  {editingAnnouncement ? 'Edit Official Circular' : 'Publish Senate Notification'}
                </h2>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-3.5 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Circular Heading <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Schedule for End Semester Examinations & Submission of Internal Marks"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full p-2 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value as any)}
                    className="w-full p-2 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
                  >
                    <option value="academic">Academic Circular</option>
                    <option value="urgent">Urgent Statutory Notice</option>
                    <option value="exam">Examination Notice</option>
                    <option value="circular">Administrative Notice</option>
                    <option value="event">Campus Event / Hackathon</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Target Audience</label>
                  <select
                    value={targetAudience}
                    onChange={e => setTargetAudience(e.target.value as any)}
                    className="w-full p-2 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
                  >
                    <option value="all">Entire Campus (All Members)</option>
                    <option value="students">Undergraduate Students</option>
                    <option value="faculty">Faculty & Department Chairs</option>
                    <option value="lab">Lab Instructors & Technical Staff</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">Applicable Department</label>
                <select
                  value={department}
                  onChange={e => setDepartment(e.target.value)}
                  className="w-full p-2 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
                >
                  <option value="All Departments">All Departments (Institutional)</option>
                  {departments.map(d => (
                    <option key={d.id} value={d.name}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Circular Content <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={5}
                  required
                  placeholder="Provide circular text, schedule dates, instructions, or hall details..."
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  className="w-full p-2 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Attached Document Name (Optional)
                </label>
                <div className="relative">
                  <Paperclip className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    placeholder="e.g. Senate_Gazette_Notification_2026.pdf"
                    value={attachmentName}
                    onChange={e => setAttachmentName(e.target.value)}
                    className="w-full text-xs pl-8 pr-3 py-1.5 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="pinCheck"
                  checked={isPinned}
                  onChange={e => setIsPinned(e.target.checked)}
                  className="rounded text-[#4F46E5] focus:ring-[#4F46E5] w-3.5 h-3.5 cursor-pointer"
                >
                </input>
                <label htmlFor="pinCheck" className="font-semibold text-slate-700 cursor-pointer text-xs">
                  Pin to Top of Official Notice Board
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-md text-slate-700 hover:bg-slate-100 font-medium transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-md bg-[#0F172A] hover:bg-slate-800 text-white font-semibold flex items-center gap-1.5 shadow-xs transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    'Publishing...'
                  ) : editingAnnouncement ? (
                    'Save Changes'
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5 text-amber-400" />
                      Broadcast Circular
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-sm w-full p-5 shadow-xl border border-[#E2E8F0] animate-in fade-in zoom-in-95">
            <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center mb-3">
              <Trash2 className="w-5 h-5 text-red-600" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">
              Delete Circular?
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Are you sure you want to remove this circular? It will be removed immediately from all student and faculty notice boards.
            </p>
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-3 py-1.5 rounded-md text-slate-700 hover:bg-slate-100 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirmId)}
                className="px-3.5 py-1.5 rounded-md bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-xs"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
