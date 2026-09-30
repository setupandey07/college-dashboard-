import React, { useState } from 'react';
import {
  Lightbulb,
  Plus,
  Search,
  X,
  CheckCircle2,
  Award,
  Users,
  Building2,
  DollarSign,
  Tag,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { useAcademicData } from '../../context/AcademicDataContext';
import { useAuth } from '../../context/AuthContext';
import { InnovationProject } from '../../types';

export const InnovationHubModule: React.FC = () => {
  const { currentUser, currentRole } = useAuth();
  const {
    innovationProjects,
    submitInnovationProject,
    updateProjectStatus,
    deleteProblem,
    purgeAllDemoData,
    users,
    departments
  } = useAcademicData();

  const isHodOrAdmin = currentRole === 'hod' || currentRole === 'admin';
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Proposal Form State
  const [title, setTitle] = useState('');
  const [domain, setDomain] = useState('');
  const [abstract, setAbstract] = useState('');
  const [category, setCategory] = useState<InnovationProject['category']>('research');
  const [mentorName, setMentorName] = useState('');
  const [teamMembersInput, setTeamMembersInput] = useState('');
  const [tagInput, setTagInput] = useState('');

  // Status Update State for Admin / HOD
  const [updatingProjectId, setUpdatingProjectId] = useState<string | null>(null);
  const [newStatus, setNewStatus] = useState<InnovationProject['status']>('ideation');
  const [fundingAmount, setFundingAmount] = useState('');

  const facultyUsers = users.filter(u => u.role === 'faculty' || u.role === 'hod');

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const filteredProjects = innovationProjects.filter(p => {
    const matchesCat = filterCategory === 'all' || p.category === filterCategory;
    const matchesSearch =
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.domain.toLowerCase().includes(search.toLowerCase()) ||
      p.leadStudent.toLowerCase().includes(search.toLowerCase()) ||
      (p.mentorName && p.mentorName.toLowerCase().includes(search.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  const handleCreateProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !domain.trim() || !abstract.trim()) {
      showNotification('error', 'Please fill in title, domain, and abstract.');
      return;
    }

    try {
      const selectedMentor = mentorName.trim() || (facultyUsers[0]?.name || 'Department Research Mentor');
      const teamList = teamMembersInput.trim()
        ? teamMembersInput.split(',').map(m => m.trim()).filter(Boolean)
        : [currentUser.name];

      if (!teamList.includes(currentUser.name)) {
        teamList.unshift(currentUser.name);
      }

      const tags = tagInput.trim()
        ? tagInput.split(',').map(t => t.trim()).filter(Boolean)
        : ['Innovation', domain.split(' ')[0] || 'Research'];

      await submitInnovationProject({
        title: title.trim(),
        domain: domain.trim(),
        abstract: abstract.trim(),
        leadStudent: currentUser.name,
        usn: currentUser.regId,
        teamMembers: teamList,
        mentorName: selectedMentor,
        department: currentUser.departmentCode || currentUser.department || 'Academic Core',
        category,
        tags
      });

      setIsSubmitModalOpen(false);
      setTitle('');
      setDomain('');
      setAbstract('');
      setTeamMembersInput('');
      setTagInput('');
      showNotification('success', 'Innovation proposal submitted to institutional review board!');
    } catch (err) {
      showNotification('error', 'Failed to submit proposal.');
    }
  };

  const handleUpdateStatus = async (projectId: string) => {
    try {
      await updateProjectStatus(projectId, newStatus, fundingAmount.trim() || undefined);
      setUpdatingProjectId(null);
      setFundingAmount('');
      showNotification('success', 'Project status updated successfully.');
    } catch (err) {
      showNotification('error', 'Failed to update project status.');
    }
  };

  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);

  const handleDeleteProject = async (projectId: string) => {
    try {
      await deleteProblem(projectId);
      setDeletingProjectId(null);
      showNotification('success', 'Innovation proposal deleted from database.');
    } catch (err) {
      showNotification('error', 'Failed to delete project proposal.');
    }
  };

  const handlePurgeAllDemo = async () => {
    try {
      const res = await purgeAllDemoData();
      showNotification('success', `Database cleansed: ${res.purgedTotal} demo records deleted.`);
    } catch (err) {
      showNotification('error', 'Failed to purge demo records.');
    }
  };

  // Aggregates
  const totalProjects = innovationProjects.length;
  const fundedProjects = innovationProjects.filter(p => p.status === 'funded');
  const approvedProjects = innovationProjects.filter(p => p.status === 'approved');

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
            <Lightbulb className="w-4 h-4 text-[#4F46E5]" />
          </div>
          <div>
            <h1 className="text-base font-bold text-[#0F172A]">Innovation Cell, R&D & Incubation Hub</h1>
            <p className="text-[11px] text-slate-500">
              Research grants, patent filings, SIH hackathons, and institutional seed venture support
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {currentRole === 'admin' && innovationProjects.length > 0 && (
            <button
              onClick={handlePurgeAllDemo}
              className="text-xs text-red-600 hover:text-red-700 font-semibold px-2.5 py-1.5 rounded bg-red-50 hover:bg-red-100 border border-red-200 transition-colors cursor-pointer"
            >
              Purge Demo Proposals
            </button>
          )}
          <button
            onClick={() => setIsSubmitModalOpen(true)}
            className="px-3.5 py-1.5 rounded-md bg-[#0F172A] hover:bg-slate-800 text-white font-semibold text-xs flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            Submit Proposal
          </button>
        </div>
      </div>

      {/* Aggregate KPI Summary - 100% Real Database */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg border border-[#E2E8F0] shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-xs font-semibold text-slate-600">Total Innovation Proposals</span>
            <Lightbulb className="w-4 h-4 text-slate-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#0F172A]">{totalProjects}</span>
            <span className="text-xs text-slate-500 font-medium">Submissions</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Patents, hackathons & research papers</p>
        </div>

        <div className="bg-white p-4 rounded-lg border border-[#E2E8F0] shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-xs font-semibold text-slate-600">Approved & Validated</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#0F172A]">{approvedProjects.length}</span>
            <span className="text-xs text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
              IRB Cleared
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Institutional review board approved</p>
        </div>

        <div className="bg-white p-4 rounded-lg border border-[#E2E8F0] shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-xs font-semibold text-slate-600">Funded Ventures & Grants</span>
            <Award className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#4F46E5]">{fundedProjects.length}</span>
            <span className="text-xs text-amber-700 font-semibold bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
              Seed Funded
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Institutional & external seed grants</p>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-lg border border-[#E2E8F0] text-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          <input
            type="text"
            placeholder="Search projects, domains, student investigators, mentors..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full text-xs pl-8 pr-3 py-1.5 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
          />
        </div>

        <div className="flex items-center gap-1 text-xs">
          <span className="text-slate-500 font-medium mr-1">Category:</span>
          {['all', 'research', 'patent', 'hackathon', 'capstone'].map(cat => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-2.5 py-1 rounded text-xs font-semibold capitalize transition-colors cursor-pointer ${
                filterCategory === cat ? 'bg-[#0F172A] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Empty State when 0 Projects */}
      {innovationProjects.length === 0 ? (
        <div className="bg-white rounded-lg border border-[#E2E8F0] p-10 sm:p-14 text-center shadow-xs">
          <div className="w-16 h-16 mx-auto rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-4">
            <Lightbulb className="w-8 h-8 text-slate-400" />
          </div>
          <h2 className="text-base font-bold text-[#0F172A] mb-1">
            0 Innovation & Research Proposals
          </h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed mb-5">
            No research papers, patent filings, or incubation ventures have been submitted to the database yet. Students and faculty can submit prototype proposals, AICTE/DST grant requests, and Smart India Hackathon entries.
          </p>
          <button
            onClick={() => setIsSubmitModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-[#0F172A] hover:bg-slate-800 text-white font-semibold text-xs shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4 text-amber-400" />
            Submit First Proposal
          </button>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="bg-white rounded-lg border border-[#E2E8F0] p-8 text-center text-slate-500">
          <p className="font-semibold text-slate-700">No innovation proposals match selected filters.</p>
          <p className="text-xs text-slate-400 mt-1">Try resetting the category filter or search query.</p>
        </div>
      ) : (
        /* Project Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map(proj => {
            const isEditingStatus = updatingProjectId === proj.id;
            return (
              <div
                key={proj.id}
                className="bg-white rounded-lg border border-[#E2E8F0] p-4 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between text-xs"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-800 border border-slate-200">
                      {proj.category}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                        proj.status === 'funded'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-300'
                          : proj.status === 'approved'
                          ? 'bg-blue-50 text-blue-800 border border-blue-300'
                          : 'bg-amber-50 text-amber-800 border border-amber-300'
                      }`}
                    >
                      ● {proj.status.replace('_', ' ')}
                    </span>
                  </div>

                  <h3 className="text-xs sm:text-sm font-bold text-[#0F172A] leading-snug line-clamp-2">
                    {proj.title}
                  </h3>
                  <p className="text-[11px] font-medium text-[#4F46E5] mt-1">{proj.domain}</p>
                  <p className="text-slate-600 mt-2 line-clamp-3 leading-relaxed text-[11px]">
                    {proj.abstract}
                  </p>

                  {/* Team & Mentor */}
                  <div className="mt-3.5 pt-2.5 border-t border-slate-100 text-[11px] space-y-1">
                    <div className="flex items-center justify-between text-slate-600">
                      <span>Lead Investigator:</span>
                      <strong className="text-slate-900">{proj.leadStudent} ({proj.usn})</strong>
                    </div>
                    <div className="flex items-center justify-between text-slate-600">
                      <span>Faculty Mentor:</span>
                      <strong className="text-slate-900">{proj.mentorName || 'Department Mentor'}</strong>
                    </div>
                    {proj.teamMembers && proj.teamMembers.length > 1 && (
                      <div className="flex items-center justify-between text-slate-600 text-[10px]">
                        <span>Co-Investigators:</span>
                        <span className="truncate max-w-[160px] text-slate-800">
                          {proj.teamMembers.filter(m => m !== proj.leadStudent).join(', ')}
                        </span>
                      </div>
                    )}
                    {proj.fundingAmount && (
                      <div className="flex items-center justify-between text-emerald-800 font-bold pt-0.5">
                        <span>Grant Allocated:</span>
                        <span>{proj.fundingAmount}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Tags and Admin Actions */}
                <div className="mt-3 pt-2.5 border-t border-slate-100">
                  <div className="flex flex-wrap items-center gap-1 mb-2">
                    {proj.tags && proj.tags.map((t, idx) => (
                      <span
                        key={idx}
                        className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 text-[10px] font-medium"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>

                  {isHodOrAdmin && (
                    isEditingStatus ? (
                      <div className="p-2 bg-slate-50 rounded border border-slate-200 space-y-2 mt-2">
                        <div className="flex gap-2">
                          <select
                            value={newStatus}
                            onChange={e => setNewStatus(e.target.value as any)}
                            className="p-1 rounded border text-xs bg-white flex-1"
                          >
                            <option value="ideation">Ideation</option>
                            <option value="approved">Approved</option>
                            <option value="funded">Funded</option>
                            <option value="completed">Completed</option>
                            <option value="rejected">Rejected</option>
                          </select>
                          <input
                            type="text"
                            placeholder="Grant (e.g. ₹ 1.5L)"
                            value={fundingAmount}
                            onChange={e => setFundingAmount(e.target.value)}
                            className="p-1 rounded border text-xs bg-white w-28"
                          />
                        </div>
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => handleUpdateStatus(proj.id)}
                            className="px-2 py-0.5 bg-emerald-600 text-white rounded text-[11px] font-semibold cursor-pointer"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setUpdatingProjectId(null)}
                            className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded text-[11px] cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setUpdatingProjectId(proj.id);
                          setNewStatus(proj.status);
                          setFundingAmount(proj.fundingAmount || '');
                        }}
                        className="text-[11px] font-semibold text-[#4F46E5] hover:underline cursor-pointer"
                      >
                        Update Review / Grant Status
                      </button>
                    )
                  )}

                  {isHodOrAdmin && (
                    <button
                      onClick={() => setDeletingProjectId(proj.id)}
                      title="Delete Proposal"
                      className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors cursor-pointer ml-auto"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Submit Proposal Modal */}
      {isSubmitModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-[#4F46E5]" />
                <h3 className="font-bold text-slate-900 text-sm">Submit R&D / Innovation Proposal</h3>
              </div>
              <button
                onClick={() => setIsSubmitModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateProposal} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Proposal Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Autonomous Campus Navigation Drone with LiDAR"
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full text-xs p-2 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] font-medium text-slate-900 focus:bg-white focus:ring-1 focus:ring-[#4F46E5]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Domain / Technology *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Robotics & Computer Vision"
                    value={domain}
                    onChange={e => setDomain(e.target.value)}
                    className="w-full text-xs p-2 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] font-medium text-slate-900 focus:bg-white focus:ring-1 focus:ring-[#4F46E5]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={e => setCategory(e.target.value as any)}
                    className="w-full text-xs p-2 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] font-medium text-slate-900 focus:bg-white focus:ring-1 focus:ring-[#4F46E5]"
                  >
                    <option value="research">Academic Research Paper</option>
                    <option value="patent">Intellectual Property / Patent</option>
                    <option value="hackathon">Hackathon / SIH Prototype</option>
                    <option value="capstone">Final Year Capstone Project</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Faculty Mentor</label>
                <select
                  value={mentorName}
                  onChange={e => setMentorName(e.target.value)}
                  className="w-full text-xs p-2 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] font-medium text-slate-900 focus:bg-white focus:ring-1 focus:ring-[#4F46E5]"
                >
                  <option value="">Select Designated Faculty Mentor</option>
                  {facultyUsers.map(u => (
                    <option key={u.id} value={u.name}>
                      {u.name} ({u.departmentCode || u.department || 'Faculty'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Team Members (Comma-Separated)</label>
                <input
                  type="text"
                  placeholder="e.g. Rahul S. (CSE), Ananya K. (ECE)"
                  value={teamMembersInput}
                  onChange={e => setTeamMembersInput(e.target.value)}
                  className="w-full text-xs p-2 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] font-medium text-slate-900 focus:bg-white focus:ring-1 focus:ring-[#4F46E5]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Project Abstract & Objectives *</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Summarize the core technical problem, proposed methodology, and expected prototype deliverables..."
                  value={abstract}
                  onChange={e => setAbstract(e.target.value)}
                  className="w-full text-xs p-2 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] font-medium text-slate-900 focus:bg-white focus:ring-1 focus:ring-[#4F46E5]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Keywords / Tags (Comma-Separated)</label>
                <input
                  type="text"
                  placeholder="e.g. AI, Edge Computing, IoT"
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
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
                  Submit Proposal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Proposal Confirmation Modal */}
      {deletingProjectId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-xl max-w-sm w-full p-5 text-xs">
            <div className="flex items-center gap-2.5 text-red-600 font-bold text-sm mb-2">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span>Confirm Proposal Deletion</span>
            </div>
            <p className="text-slate-600 leading-relaxed mb-4">
              Are you sure you want to permanently delete this innovation / research proposal from the institutional database?
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeletingProjectId(null)}
                className="px-3 py-1.5 rounded-md border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteProject(deletingProjectId)}
                className="px-3 py-1.5 rounded-md bg-red-600 hover:bg-red-700 text-white font-semibold cursor-pointer"
              >
                Delete Proposal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
