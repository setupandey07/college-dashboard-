import React, { useState, useEffect } from 'react';
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
  Trash2,
  ShieldCheck,
  ArrowRight
} from 'lucide-react';
import { useAcademicData } from '../../context/AcademicDataContext';
import { useAuth } from '../../context/AuthContext';
import { AcademicQuery, UserRole } from '../../types';
import { filterQueriesForUser, canUserAccessQuery } from '../../lib/queryPrivacy';

export const QueriesModule: React.FC = () => {
  const { currentUser, currentRole } = useAuth();
  const { queries, submitQuery, replyToQuery, updateQueryStatus, deleteQuery, purgeAllDemoData, users, departments } = useAcademicData();

  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [search, setSearch] = useState<string>('');
  const [replyText, setReplyText] = useState<string>('');
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Strict Authoritative Privacy Filter:
  // A student sees ONLY their own queries.
  // An HOD sees queries specifically addressed to them or their department HOD.
  // Other students / faculty / HODs CANNOT see it.
  const authorizedQueries = filterQueriesForUser(queries, currentUser, currentRole);

  const [selectedQueryId, setSelectedQueryId] = useState<string | null>(authorizedQueries[0]?.id || null);

  // Form State for raising query
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<AcademicQuery['category']>('academic');
  const [newPriority, setNewPriority] = useState<AcademicQuery['priority']>('medium');
  const [newDescription, setNewDescription] = useState('');

  // Explicit Recipient Architecture
  const [recipientTarget, setRecipientTarget] = useState<'hod' | 'faculty' | 'lab_assistant' | 'admin'>('hod');
  const defaultDeptCode = currentUser.departmentCode && currentUser.departmentCode !== 'UNASSIGNED'
    ? currentUser.departmentCode
    : (departments[0]?.code || 'EEE');
  const [recipientDeptCode, setRecipientDeptCode] = useState<string>(defaultDeptCode);
  const [recipientFacultyId, setRecipientFacultyId] = useState<string>('');

  // Keep selected department aligned with default if not initialized
  useEffect(() => {
    if (!recipientDeptCode && departments.length > 0) {
      setRecipientDeptCode(departments[0].code);
    }
  }, [departments, recipientDeptCode]);

  // Available faculty for currently selected recipient department
  const deptFaculty = users.filter(u =>
    (u.role === 'faculty' || u.role === 'hod') &&
    (u.departmentCode?.toUpperCase() === recipientDeptCode.toUpperCase() ||
     (u.department && u.department.toLowerCase().includes(recipientDeptCode.toLowerCase())))
  );

  // Synchronize selected ticket smoothly when list changes or filter updates
  useEffect(() => {
    if (!selectedQueryId && authorizedQueries.length > 0) {
      setSelectedQueryId(authorizedQueries[0].id);
    } else if (selectedQueryId && !authorizedQueries.some(q => q.id === selectedQueryId)) {
      setSelectedQueryId(authorizedQueries[0]?.id || null);
    }
  }, [authorizedQueries, selectedQueryId]);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const filteredQueries = authorizedQueries.filter(q => {
    const matchesCat = filterCategory === 'all' || q.category === filterCategory;
    const matchesStatus = filterStatus === 'all' || q.status === filterStatus;
    const matchesSearch =
      q.title.toLowerCase().includes(search.toLowerCase()) ||
      q.ticketId.toLowerCase().includes(search.toLowerCase()) ||
      q.studentName.toLowerCase().includes(search.toLowerCase()) ||
      (q.department && q.department.toLowerCase().includes(search.toLowerCase())) ||
      (q.recipientDepartment && q.recipientDepartment.toLowerCase().includes(search.toLowerCase())) ||
      (q.recipientName && q.recipientName.toLowerCase().includes(search.toLowerCase()));
    return matchesCat && matchesStatus && matchesSearch;
  });

  const selectedQuery = authorizedQueries.find(q => q.id === selectedQueryId) || filteredQueries[0] || null;

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedQuery) return;

    // Defense: verify user can access this ticket before replying
    if (!canUserAccessQuery(selectedQuery, currentUser, currentRole)) {
      showNotification('error', 'Unauthorized to respond to this ticket.');
      return;
    }

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
      showNotification('error', 'Please provide an inquiry title and detailed description.');
      return;
    }

    // Resolve explicit recipient metadata
    let recipientType: AcademicQuery['recipientType'] = recipientTarget;
    let recipientRole: UserRole = recipientTarget;
    let targetDept = recipientDeptCode.toUpperCase().trim();
    let recipientId: string | undefined = undefined;
    let recipientName = '';

    if (recipientTarget === 'hod') {
      recipientRole = 'hod';
      recipientType = 'hod';
      recipientName = `Head of Department (${targetDept})`;
      // Check if there is an authoritative HOD user for this department
      const hodUser = users.find(u => u.role === 'hod' && u.departmentCode?.toUpperCase() === targetDept);
      if (hodUser) {
        recipientId = hodUser.id;
        recipientName = `HOD of ${targetDept} (${hodUser.name})`;
      }
    } else if (recipientTarget === 'faculty') {
      recipientRole = 'faculty';
      if (recipientFacultyId) {
        const facUser = deptFaculty.find(f => f.id === recipientFacultyId);
        if (facUser) {
          recipientType = 'specific_user';
          recipientId = facUser.id;
          recipientName = `Prof. ${facUser.name} (${targetDept})`;
        } else {
          recipientType = 'faculty';
          recipientName = `Faculty of ${targetDept}`;
        }
      } else {
        recipientType = 'faculty';
        recipientName = `Faculty of ${targetDept}`;
      }
    } else if (recipientTarget === 'lab_assistant') {
      recipientRole = 'lab_assistant';
      recipientType = 'lab_assistant';
      recipientName = `Laboratory In-Charge (${targetDept})`;
    } else if (recipientTarget === 'admin') {
      recipientRole = 'admin';
      recipientType = 'admin';
      targetDept = 'ADMIN';
      recipientName = 'Office of the Dean / Academic Governance';
    }

    try {
      await submitQuery({
        title: newTitle.trim(),
        category: newCategory,
        createdByUserId: currentUser.id,
        createdByRole: currentUser.role,
        createdByName: currentUser.name,
        createdBy: currentUser.id,
        studentId: currentUser.id,
        studentName: currentUser.name,
        senderRole: currentUser.role,
        senderEmail: currentUser.email,
        senderDepartment: currentUser.departmentCode || currentUser.department || 'General',
        usn: currentUser.regId || '',
        recipientUserId: recipientId,
        recipientType,
        recipientRole,
        recipientDepartment: targetDept,
        recipientId,
        recipientName,
        departmentId: targetDept,
        department: targetDept,
        priority: newPriority,
        description: newDescription.trim(),
        message: newDescription.trim(),
        assignedTo: recipientName
      });

      setIsSubmitModalOpen(false);
      setNewTitle('');
      setNewDescription('');
      setRecipientFacultyId('');
      showNotification('success', `Grievance inquiry ticket submitted directly to ${recipientName}!`);
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
        const remaining = authorizedQueries.filter(q => q.id !== queryId);
        setSelectedQueryId(remaining[0]?.id || null);
      }
      showNotification('success', 'Inquiry ticket deleted from database.');
    } catch (err) {
      showNotification('error', 'Failed to delete inquiry ticket.');
    }
  };

  const handleStatusChange = async (queryId: string, status: 'open' | 'in_progress' | 'resolved') => {
    try {
      await updateQueryStatus(queryId, status, currentUser.name);
      showNotification('success', `Ticket status updated to ${status.replace('_', ' ')}.`);
    } catch (err) {
      showNotification('error', 'Failed to update ticket status.');
    }
  };

  const isQueryCreator = Boolean(
    selectedQuery && (
      selectedQuery.createdByUserId === currentUser.id ||
      selectedQuery.createdBy === currentUser.id ||
      selectedQuery.studentId === currentUser.id ||
      (selectedQuery.senderEmail && selectedQuery.senderEmail.toLowerCase() === currentUser.email?.toLowerCase())
    )
  );

  const canManageSelectedTicket = Boolean(
    currentRole === 'admin' ||
    isQueryCreator ||
    (selectedQuery ? canUserAccessQuery(selectedQuery, currentUser, currentRole) : false)
  );
  const canDeleteSelectedTicket = Boolean(currentRole === 'admin' || isQueryCreator);

  return (
    <div className="space-y-6">
      {/* Notifications */}
      {notification && (
        <div
          className={`p-3.5 rounded-lg border text-xs font-semibold flex items-center justify-between gap-3 animate-in fade-in ${
            notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{notification.message}</span>
          </div>
          <button
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top Banner & Action Bar */}
      <div className="bg-white rounded-lg p-5 border border-[#E2E8F0] shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-[#0F172A]">Grievance Redressal & Academic Queries</h1>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 uppercase flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-600" />
                Data Isolated
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl">
              {currentUser.role === 'student' ? (
                <>
                  Private inquiry portal for <strong className="text-slate-800">{currentUser.name}</strong> ({currentUser.regId}).
                  Queries you raise are confidential and visible exclusively to you and the designated department authority.
                </>
              ) : currentUser.role === 'hod' ? (
                <>
                  Department Inquiries Inbox for <strong className="text-slate-800">{currentUser.name}</strong> (HOD {currentUser.departmentCode}).
                  Viewing queries addressed to the HOD of {currentUser.departmentCode}.
                </>
              ) : (
                <>
                  Institutional grievance and query handling console for authorized faculty and administrators.
                </>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsSubmitModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-[#0F172A] hover:bg-slate-800 text-white font-semibold text-xs transition-colors shadow-xs cursor-pointer active:scale-95"
            >
              <Plus className="w-3.5 h-3.5 text-amber-400" />
              Raise New Inquiry
            </button>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="relative w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by ticket ID, title, or recipient..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] text-slate-800 text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
            <select
              value={filterCategory}
              onChange={e => setFilterCategory(e.target.value)}
              className="p-1.5 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] text-xs font-medium text-slate-700 focus:bg-white"
            >
              <option value="all">All Categories</option>
              <option value="academic">Academic</option>
              <option value="exam">Internal Assessment</option>
              <option value="lab">Lab Operations</option>
              <option value="admin">Administration</option>
            </select>

            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="p-1.5 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] text-xs font-medium text-slate-700 focus:bg-white"
            >
              <option value="all">All Statuses</option>
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
            </select>
          </div>
        </div>
      </div>

      {/* Empty State for 0 Total Queries */}
      {authorizedQueries.length === 0 ? (
        <div className="bg-white rounded-lg border border-[#E2E8F0] p-10 sm:p-14 text-center shadow-xs">
          <div className="w-16 h-16 mx-auto rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-4">
            <MessageSquareWarning className="w-8 h-8 text-slate-400" />
          </div>
          <h2 className="text-base font-bold text-[#0F172A] mb-1">
            0 Grievances or Academic Inquiries
          </h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed mb-5">
            {currentUser.role === 'student'
              ? 'You have not submitted any queries yet. Any inquiry you submit will be displayed here securely.'
              : 'No open grievances or inquiries addressed to your account or department at this time.'}
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
              <span>Your Accessible Inquiries ({filteredQueries.length})</span>
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

                      <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                        <span className="truncate">To: <strong className="text-slate-700">{q.recipientName || q.assignedTo || 'Department'}</strong></span>
                        <span className="font-mono font-semibold px-1 py-0.2 rounded bg-slate-100 text-slate-600 shrink-0">
                          {q.recipientDepartment || q.department}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Selected Ticket Conversation Thread */}
          <div className="lg:col-span-2 bg-white rounded-lg border border-[#E2E8F0] flex flex-col justify-between overflow-hidden shadow-2xs min-h-[500px]">
            {selectedQuery ? (
              <>
                {/* Header */}
                <div className="p-4 border-b border-[#E2E8F0] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#F8FAFC]">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
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

                    <div className="text-[11px] text-slate-500 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span>From: <strong className="text-slate-800">{selectedQuery.studentName}</strong> ({selectedQuery.usn || selectedQuery.senderRole})</span>
                      <span>•</span>
                      <span>Target Authority: <strong className="text-indigo-700">{selectedQuery.recipientName || selectedQuery.assignedTo}</strong></span>
                      <span>•</span>
                      <span>Department: <strong className="font-mono text-slate-800">{selectedQuery.recipientDepartment || selectedQuery.department}</strong></span>
                      <span>•</span>
                      <span>{selectedQuery.createdAt}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="shrink-0 flex items-center gap-2">
                    {canManageSelectedTicket && (
                      selectedQuery.status !== 'resolved' ? (
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
                      )
                    )}

                    {canDeleteSelectedTicket && (
                      <button
                        onClick={() => setDeletingQueryId(selectedQuery.id)}
                        title="Delete Ticket"
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Thread Body */}
                <div className="p-4 flex-1 overflow-y-auto space-y-3 max-h-[440px] text-xs">
                  {/* Initial Query Description */}
                  <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200">
                    <div className="flex items-center justify-between text-slate-500 mb-1.5 text-[11px]">
                      <span className="font-semibold text-slate-800">
                        {selectedQuery.studentName} ({selectedQuery.senderRole?.toUpperCase() || 'SENDER'})
                      </span>
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

      {/* Submit Query Modal with Explicit Recipient Architecture */}
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
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer"
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
                    <option value="admin">Institutional Administration</option>
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

              {/* Explicit Ownership & Target Recipient Selection */}
              <div className="p-3.5 rounded-lg bg-indigo-50/50 border border-indigo-100 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-indigo-950 uppercase tracking-wider flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-[#4F46E5]" />
                    Designated Recipient & Authority *
                  </span>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-800">
                    Confidential
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Whom are you addressing?</label>
                    <select
                      value={recipientTarget}
                      onChange={e => setRecipientTarget(e.target.value as any)}
                      className="w-full text-xs p-2 rounded-md border border-[#CBD5E1] bg-white font-semibold text-slate-900 focus:ring-1 focus:ring-[#4F46E5]"
                    >
                      <option value="hod">Head of Department (HOD)</option>
                      <option value="faculty">Specific Faculty Member / Teacher</option>
                      <option value="lab_assistant">Laboratory In-Charge</option>
                      <option value="admin">Office of the Academic Dean</option>
                    </select>
                  </div>

                  {recipientTarget !== 'admin' && (
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Target Department</label>
                      <select
                        value={recipientDeptCode}
                        onChange={e => {
                          setRecipientDeptCode(e.target.value);
                          setRecipientFacultyId('');
                        }}
                        className="w-full text-xs p-2 rounded-md border border-[#CBD5E1] bg-white font-semibold text-slate-900 focus:ring-1 focus:ring-[#4F46E5]"
                      >
                        {departments.map(d => (
                          <option key={d.id} value={d.code}>
                            {d.code} — {d.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* If addressing faculty, offer dropdown of faculty in chosen department */}
                {recipientTarget === 'faculty' && (
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Select Faculty Member ({recipientDeptCode})
                    </label>
                    <select
                      value={recipientFacultyId}
                      onChange={e => setRecipientFacultyId(e.target.value)}
                      className="w-full text-xs p-2 rounded-md border border-[#CBD5E1] bg-white font-medium text-slate-900 focus:ring-1 focus:ring-[#4F46E5]"
                    >
                      <option value="">All Faculty of {recipientDeptCode} (General)</option>
                      {deptFaculty.map(f => (
                        <option key={f.id} value={f.id}>
                          Prof. {f.name} ({f.designation || 'Faculty Member'})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <p className="text-[10px] text-slate-500 leading-relaxed italic">
                  Privacy Guarantee: Only you and the designated {recipientTarget === 'hod' ? `HOD of ${recipientDeptCode}` : recipientTarget === 'faculty' ? `Faculty of ${recipientDeptCode}` : recipientTarget === 'lab_assistant' ? `Lab In-Charge of ${recipientDeptCode}` : 'Dean'} will be able to view this query.
                </p>
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
