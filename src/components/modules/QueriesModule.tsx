import React, { useState } from 'react';
import {
  MessageSquareWarning,
  Plus,
  CheckCircle2,
  Send,
  Search,
  User,
  X,
  Clock,
  AlertTriangle,
  Building2,
  HelpCircle,
  Trash2
} from 'lucide-react';
import { useAcademicData } from '../../context/AcademicDataContext';
import { useAuth } from '../../context/AuthContext';
import { AcademicQuery } from '../../types';

export const QueriesModule: React.FC = () => {
  const { currentUser, currentRole } = useAuth();
  const { queries, submitQuery, replyToQuery, updateQueryStatus, deleteQuery, purgeAllDemoData, users, departments } = useAcademicData();

  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [search, setSearch] = useState<string>('');
  const [selectedQueryId, setSelectedQueryId] = useState<string | null>(queries[0]?.id || null);
  const [replyText, setReplyText] = useState<string>('');
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // New Query Form State
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<AcademicQuery['category']>('academic');
  const [newPriority, setNewPriority] = useState<AcademicQuery['priority']>('medium');
  const [newDescription, setNewDescription] = useState('');
  const [assignedToStaff, setAssignedToStaff] = useState('');

  const facultyAndStaff = users.filter(u => u.role === 'faculty' || u.role === 'hod' || u.role === 'lab_assistant');

  // Synchronize selected ticket
  React.useEffect(() => {
    if (!selectedQueryId && queries.length > 0) {
      setSelectedQueryId(queries[0].id);
    }
  }, [queries, selectedQueryId]);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const filteredQueries = queries.filter(q => {
    const matchesCat = filterCategory === 'all' || q.category === filterCategory;
    const matchesStatus = filterStatus === 'all' || q.status === filterStatus;
    const matchesSearch =
      q.title.toLowerCase().includes(search.toLowerCase()) ||
      q.ticketId.toLowerCase().includes(search.toLowerCase()) ||
      q.studentName.toLowerCase().includes(search.toLowerCase()) ||
      (q.department && q.department.toLowerCase().includes(search.toLowerCase()));
    return matchesCat && matchesStatus && matchesSearch;
  });

  const selectedQuery = queries.find(q => q.id === selectedQueryId) || filteredQueries[0] || null;

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedQuery) return;

    try {
      await replyToQuery(selectedQuery.id, currentUser.name, currentUser.role, replyText.trim());
      setReplyText('');
      showNotification('success', 'Response recorded to ticket thread.');
    } catch (err) {
      showNotification('error', 'Failed to record response.');
    }
  };

  const handleCreateQuery = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDescription.trim()) {
      showNotification('error', 'Please provide a title and detailed description.');
      return;
    }

    try {
      const assigned = assignedToStaff.trim() ||
        (newCategory === 'lab' ? 'Central Lab In-Charge' : facultyAndStaff[0]?.name || 'Academic Dean Office');

      await submitQuery({
        title: newTitle.trim(),
        category: newCategory,
        studentId: currentUser.id,
        studentName: currentUser.name,
        usn: currentUser.regId,
        department: currentUser.departmentCode || currentUser.department || 'General Academic',
        priority: newPriority,
        description: newDescription.trim(),
        assignedTo: assigned
      });

      setIsSubmitModalOpen(false);
      setNewTitle('');
      setNewDescription('');
      showNotification('success', 'Grievance inquiry ticket submitted successfully!');
    } catch (err) {
      showNotification('error', 'Failed to submit inquiry.');
    }
  };

  const [deletingQueryId, setDeletingQueryId] = useState<string | null>(null);

  const handleDeleteQuery = async (queryId: string) => {
    try {
      await deleteQuery(queryId);
      setDeletingQueryId(null);
      if (selectedQueryId === queryId) {
        const remaining = queries.filter(q => q.id !== queryId);
        setSelectedQueryId(remaining[0]?.id || null);
      }
      showNotification('success', 'Inquiry ticket removed permanently.');
    } catch (err) {
      showNotification('error', 'Failed to delete inquiry ticket.');
    }
  };

  const handlePurgeAllDemo = async () => {
    try {
      const res = await purgeAllDemoData();
      showNotification('success', `Database cleansed: ${res.purgedTotal} demo records deleted.`);
    } catch (err) {
      showNotification('error', 'Failed to purge demo tickets.');
    }
  };

  const handleStatusChange = async (queryId: string, status: 'open' | 'in_progress' | 'resolved') => {
    try {
      await updateQueryStatus(queryId, status);
      showNotification('success', `Ticket status updated to ${status.replace('_', ' ')}.`);
    } catch (err) {
      showNotification('error', 'Failed to update ticket status.');
    }
  };

  return (
    <div className="space-y-5">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`p-3 rounded-lg text-xs font-semibold flex items-center justify-between shadow-xs transition-all ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
              : 'bg-red-50 text-red-800 border border-red-300'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{notification.message}</span>
          </div>
          <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-slate-700 p-1">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-lg border border-[#E2E8F0] shadow-xs">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
            <MessageSquareWarning className="w-4 h-4 text-[#4F46E5]" />
          </div>
          <div>
            <h1 className="text-base font-bold text-[#0F172A]">Grievance Redressal & Academic Queries</h1>
            <p className="text-[11px] text-slate-500">
              Direct student-faculty escalation channel with SLA monitoring and verified resolution logs
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {currentRole === 'admin' && queries.length > 0 && (
            <button
              onClick={handlePurgeAllDemo}
              className="text-xs text-red-600 hover:text-red-700 font-semibold px-2.5 py-1.5 rounded bg-red-50 hover:bg-red-100 border border-red-200 transition-colors cursor-pointer"
            >
              Purge Demo Tickets
            </button>
          )}
          <button
            onClick={() => setIsSubmitModalOpen(true)}
            className="px-3.5 py-1.5 rounded-md bg-[#0F172A] hover:bg-slate-800 text-white font-semibold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            Raise Inquiry
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white p-3 rounded-lg border border-[#E2E8F0] text-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          <input
            type="text"
            placeholder="Search tickets by ID, title, student, department..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full text-xs pl-8 pr-3 py-1.5 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1">
            <span className="text-slate-500 font-medium mr-0.5">Category:</span>
            {['all', 'academic', 'lab', 'exam'].map(cat => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-2 py-0.5 rounded text-xs font-medium capitalize cursor-pointer ${
                  filterCategory === cat ? 'bg-[#0F172A] text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 ml-2">
            <span className="text-slate-500 font-medium mr-0.5">Status:</span>
            {['all', 'open', 'in_progress', 'resolved'].map(st => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-2 py-0.5 rounded text-xs font-medium capitalize cursor-pointer ${
                  filterStatus === st ? 'bg-[#0F172A] text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {st.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Empty State for 0 Total Queries */}
      {queries.length === 0 ? (
        <div className="bg-white rounded-lg border border-[#E2E8F0] p-10 sm:p-14 text-center shadow-xs">
          <div className="w-16 h-16 mx-auto rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-4">
            <MessageSquareWarning className="w-8 h-8 text-slate-400" />
          </div>
          <h2 className="text-base font-bold text-[#0F172A] mb-1">
            0 Grievances or Academic Inquiries
          </h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed mb-5">
            No academic or laboratory grievances have been raised in the database yet. Students and faculty can initiate inquiries regarding marks evaluation, timetable clashes, or equipment readiness.
          </p>
          <button
            onClick={() => setIsSubmitModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-[#0F172A] hover:bg-slate-800 text-white font-semibold text-xs shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            Raise First Inquiry Ticket
          </button>
        </div>
      ) : (
        /* 2-Column Layout: Ticket List & Conversation Thread */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Tickets List */}
          <div className="lg:col-span-1 bg-white rounded-lg border border-[#E2E8F0] overflow-hidden max-h-[640px] flex flex-col shadow-2xs">
            <div className="p-3 border-b border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between text-xs font-bold text-slate-700">
              <span>Inquiries ({filteredQueries.length})</span>
              <span className="text-[10px] text-slate-400 font-normal">Select ticket</span>
            </div>

            <div className="divide-y divide-slate-100 overflow-y-auto flex-1">
              {filteredQueries.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs">
                  No tickets match selected filters.
                </div>
              ) : (
                filteredQueries.map(q => {
                  const isSelected = selectedQuery?.id === q.id;
                  return (
                    <div
                      key={q.id}
                      onClick={() => setSelectedQueryId(q.id)}
                      className={`p-3 cursor-pointer transition-colors text-xs ${
                        isSelected ? 'bg-indigo-50/60 border-l-3 border-[#4F46E5]' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-mono text-[10px] font-bold text-slate-600 bg-white px-1.5 py-0.2 rounded border border-slate-200">
                          {q.ticketId}
                        </span>
                        <span
                          className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded ${
                            q.status === 'resolved'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              : q.status === 'in_progress'
                              ? 'bg-blue-50 text-blue-800 border border-blue-200'
                              : 'bg-amber-50 text-amber-800 border border-amber-200'
                          }`}
                        >
                          {q.status.replace('_', ' ')}
                        </span>
                      </div>

                      <h3 className="font-bold text-slate-900 truncate">{q.title}</h3>
                      <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{q.description}</p>

                      <div className="mt-2 flex items-center justify-between text-[10px] text-slate-400">
                        <span>{q.studentName}</span>
                        <span className="capitalize text-slate-600 font-medium">{q.category}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Selected Ticket Conversation Thread */}
          <div className="lg:col-span-2 bg-white rounded-lg border border-[#E2E8F0] flex flex-col justify-between overflow-hidden shadow-2xs">
            {selectedQuery ? (
              <>
                {/* Header */}
                <div className="p-4 border-b border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#F8FAFC]">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-800 font-mono text-xs font-bold">
                        {selectedQuery.ticketId}
                      </span>
                      <span className="text-[10px] uppercase font-bold text-slate-600 bg-white border border-slate-200 px-1.5 py-0.2 rounded">
                        {selectedQuery.category}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase px-1.5 py-0.2 rounded ${
                          selectedQuery.priority === 'high'
                            ? 'bg-red-50 text-red-800 border border-red-200'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {selectedQuery.priority} Priority
                      </span>
                    </div>
                    <h2 className="text-sm font-bold text-[#0F172A] mt-1.5">{selectedQuery.title}</h2>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Submitted by: <strong className="text-slate-800">{selectedQuery.studentName}</strong> ({selectedQuery.usn}) • {selectedQuery.createdAt} • Assigned to: <strong className="text-slate-800">{selectedQuery.assignedTo}</strong>
                    </p>
                  </div>

                  {/* Status Toggle Action */}
                  <div className="shrink-0 flex items-center gap-2">
                    {selectedQuery.status !== 'resolved' ? (
                      <button
                        onClick={() => handleStatusChange(selectedQuery.id, 'resolved')}
                        className="px-3 py-1 rounded-md bg-[#10B981] hover:bg-emerald-700 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Mark Resolved
                      </button>
                    ) : (
                      <button
                        onClick={() => handleStatusChange(selectedQuery.id, 'in_progress')}
                        className="px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        Reopen Ticket
                      </button>
                    )}

                    <button
                      onClick={() => setDeletingQueryId(selectedQuery.id)}
                      title="Delete Ticket"
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Thread Body */}
                <div className="p-4 flex-1 overflow-y-auto space-y-3 max-h-[440px] text-xs">
                  {/* Initial Query Description */}
                  <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                    <div className="flex items-center justify-between text-slate-500 mb-1.5 text-[11px]">
                      <span className="font-semibold text-slate-800">{selectedQuery.studentName} (Student)</span>
                      <span>{selectedQuery.createdAt}</span>
                    </div>
                    <p className="text-slate-700 leading-relaxed text-xs">{selectedQuery.description}</p>
                  </div>

                  {/* Response Messages */}
                  {selectedQuery.replies && selectedQuery.replies.map(reply => (
                    <div
                      key={reply.id}
                      className={`p-3.5 rounded-lg border text-xs ${
                        reply.authorRole === 'faculty' || reply.authorRole === 'hod' || reply.authorRole === 'admin'
                          ? 'bg-indigo-50/50 border-indigo-200 ml-4'
                          : 'bg-white border-slate-200 mr-4'
                      }`}
                    >
                      <div className="flex items-center justify-between text-slate-500 mb-1 text-[11px]">
                        <span className="font-semibold text-slate-900">
                          {reply.authorName} ({reply.authorRole.toUpperCase()})
                        </span>
                        <span>{reply.timestamp}</span>
                      </div>
                      <p className="text-slate-800 leading-relaxed">{reply.message}</p>
                    </div>
                  ))}
                </div>

                {/* Reply Box */}
                <form onSubmit={handleSendReply} className="p-3 border-t border-[#E2E8F0] bg-white flex gap-2">
                  <input
                    type="text"
                    placeholder="Type official response or escalation note..."
                    value={replyText}
                    onChange={e => setReplyText(e.target.value)}
                    className="flex-1 text-xs p-2 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
                  />
                  <button
                    type="submit"
                    disabled={!replyText.trim()}
                    className="px-3.5 py-2 bg-[#0F172A] hover:bg-slate-800 disabled:opacity-50 text-white rounded-md font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Reply
                  </button>
                </form>
              </>
            ) : (
              <div className="p-12 text-center text-slate-400 text-xs">
                Select an inquiry ticket to view conversation details.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Submit Query Modal */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <MessageSquareWarning className="w-4 h-4 text-[#4F46E5]" />
                <h3 className="font-bold text-slate-900 text-sm">Raise Academic Grievance or Inquiry</h3>
              </div>
              <button
                onClick={() => setIsSubmitModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateQuery} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Inquiry Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CIA-1 Evaluation Recheck / Timetable Clash"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  className="w-full text-xs p-2 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] font-medium text-slate-900 focus:bg-white focus:ring-1 focus:ring-[#4F46E5]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={newCategory}
                    onChange={e => setNewCategory(e.target.value as any)}
                    className="w-full text-xs p-2 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] font-medium text-slate-900 focus:bg-white focus:ring-1 focus:ring-[#4F46E5]"
                  >
                    <option value="academic">Academic & Syllabus</option>
                    <option value="exam">Internal Assessment / Exam</option>
                    <option value="lab">Lab Operations & Systems</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Priority</label>
                  <select
                    value={newPriority}
                    onChange={e => setNewPriority(e.target.value as any)}
                    className="w-full text-xs p-2 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] font-medium text-slate-900 focus:bg-white focus:ring-1 focus:ring-[#4F46E5]"
                  >
                    <option value="low">Low Priority (Routine)</option>
                    <option value="medium">Medium Priority (Standard)</option>
                    <option value="high">High Priority (Urgent)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Assign To Faculty / Staff</label>
                <select
                  value={assignedToStaff}
                  onChange={e => setAssignedToStaff(e.target.value)}
                  className="w-full text-xs p-2 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] font-medium text-slate-900 focus:bg-white focus:ring-1 focus:ring-[#4F46E5]"
                >
                  <option value="">Department Academic Office (General Escalation)</option>
                  {facultyAndStaff.map(u => (
                    <option key={u.id} value={u.name}>
                      {u.name} ({u.designation || u.role.toUpperCase()})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Detailed Description *</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Provide precise details regarding your inquiry, including course code, date of test, or lab workstation number..."
                  value={newDescription}
                  onChange={e => setNewDescription(e.target.value)}
                  className="w-full text-xs p-2 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] font-medium text-slate-900 focus:bg-white focus:ring-1 focus:ring-[#4F46E5]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsSubmitModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-md text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-md bg-[#0F172A] hover:bg-slate-800 text-white font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Submit Inquiry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Query Confirmation Modal */}
      {deletingQueryId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-xl max-w-sm w-full p-5 text-xs">
            <div className="flex items-center gap-2.5 text-red-600 font-bold text-sm mb-2">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>Confirm Ticket Deletion</span>
            </div>
            <p className="text-slate-600 leading-relaxed mb-4">
              Are you sure you want to permanently delete this inquiry ticket and all discussion replies from the live database?
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeletingQueryId(null)}
                className="px-3 py-1.5 rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteQuery(deletingQueryId)}
                className="px-3 py-1.5 rounded-md bg-red-600 hover:bg-red-700 text-white font-semibold cursor-pointer"
              >
                Delete Ticket
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
