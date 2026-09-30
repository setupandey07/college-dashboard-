import React, { useState } from 'react';
import {
  FlaskConical,
  Search,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  X,
  HardDrive,
  Wrench,
  ShieldAlert,
  Calendar
} from 'lucide-react';
import { useAcademicData } from '../../context/AcademicDataContext';
import { useAuth } from '../../context/AuthContext';
import { LabEquipment } from '../../types';

export const LabOperationsModule: React.FC = () => {
  const { currentRole, currentUser } = useAuth();
  const { labEquipment, updateEquipmentStatus, createLabEquipment, deleteLabEquipment, departments, users } = useAcademicData();
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [editingId, setEditingId] = useState<string | null>(null);

  // Edit State
  const [workingCount, setWorkingCount] = useState<number>(0);
  const [maintenanceCount, setMaintenanceCount] = useState<number>(0);
  const [status, setStatus] = useState<LabEquipment['status']>('operational');

  // Register New Asset Modal State
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // New Equipment Form State
  const [newEquipmentName, setNewEquipmentName] = useState('');
  const [newAssetCode, setNewAssetCode] = useState('');
  const [newLabName, setNewLabName] = useState('');
  const [newDepartment, setNewDepartment] = useState(departments[0]?.name || 'Computer Science & Engineering');
  const [newInCharge, setNewInCharge] = useState(currentUser.name || '');
  const [newQuantity, setNewQuantity] = useState<number>(30);
  const [newWorkingCount, setNewWorkingCount] = useState<number>(30);
  const [newStatus, setNewStatus] = useState<LabEquipment['status']>('operational');

  const canEdit = currentRole === 'lab_assistant' || currentRole === 'hod' || currentRole === 'admin';

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const filteredEquipment = labEquipment.filter(eq => {
    const matchesSearch =
      eq.equipmentName.toLowerCase().includes(search.toLowerCase()) ||
      eq.labName.toLowerCase().includes(search.toLowerCase()) ||
      eq.assetCode.toLowerCase().includes(search.toLowerCase()) ||
      (eq.department && eq.department.toLowerCase().includes(search.toLowerCase()));
    const matchesStatus = filterStatus === 'all' || eq.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const startEdit = (eq: LabEquipment) => {
    setEditingId(eq.id);
    setWorkingCount(eq.workingCount);
    setMaintenanceCount(eq.maintenanceCount);
    setStatus(eq.status);
  };

  const handleSave = async (eq: LabEquipment) => {
    try {
      await updateEquipmentStatus(eq.id, workingCount, maintenanceCount, status);
      setEditingId(null);
      showNotification('success', `Status for ${eq.equipmentName} updated successfully.`);
    } catch (err) {
      showNotification('error', 'Failed to update equipment status.');
    }
  };

  const handleRegisterAsset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEquipmentName.trim() || !newAssetCode.trim() || !newLabName.trim()) {
      showNotification('error', 'Please fill in equipment name, asset code, and laboratory.');
      return;
    }

    setIsSubmitting(true);
    try {
      const generatedId = `lab-eq-${Date.now()}`;
      const maintCount = Math.max(0, newQuantity - newWorkingCount);

      const newItem: LabEquipment = {
        id: generatedId,
        assetCode: newAssetCode.trim().toUpperCase(),
        equipmentName: newEquipmentName.trim(),
        labName: newLabName.trim(),
        department: newDepartment,
        quantity: Number(newQuantity) || 1,
        workingCount: Number(newWorkingCount) || 1,
        maintenanceCount: maintCount,
        status: newStatus,
        lastServiced: new Date().toISOString().split('T')[0],
        inCharge: newInCharge.trim() || currentUser.name
      };

      await createLabEquipment(newItem);
      setIsRegisterModalOpen(false);
      showNotification('success', `Lab asset ${newItem.equipmentName} successfully registered!`);

      // Reset form
      setNewEquipmentName('');
      setNewAssetCode('');
      setNewLabName('');
      setNewQuantity(30);
      setNewWorkingCount(30);
      setNewStatus('operational');
    } catch (err: any) {
      showNotification('error', err?.message || 'Failed to register lab asset.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteEquipment = async (id: string) => {
    try {
      await deleteLabEquipment(id);
      setDeleteConfirmId(null);
      showNotification('success', 'Lab asset removed from inventory.');
    } catch (err) {
      showNotification('error', 'Failed to remove equipment.');
    }
  };

  // Real-time aggregates
  const totalAssetsCount = labEquipment.length;
  const totalUnits = labEquipment.reduce((acc, eq) => acc + (eq.quantity || 0), 0);
  const operationalUnits = labEquipment.reduce((acc, eq) => acc + (eq.workingCount || 0), 0);
  const maintenanceUnits = labEquipment.reduce((acc, eq) => acc + (eq.maintenanceCount || 0), 0);
  const operationalHealthPct = totalUnits > 0 ? Math.round((operationalUnits / totalUnits) * 100) : 0;

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
            <FlaskConical className="w-4 h-4 text-[#4F46E5]" />
          </div>
          <div>
            <h1 className="text-base font-bold text-[#0F172A]">Laboratory Operations & Hardware Asset Log</h1>
            <p className="text-[11px] text-slate-500">
              Hardware inventory health, periodic calibration tracking, and workstation readiness
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {canEdit && (
            <button
              onClick={() => setIsRegisterModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-[#0F172A] hover:bg-slate-800 text-white font-semibold text-xs transition-all shadow-xs cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4 text-amber-400" />
              Register Lab Asset
            </button>
          )}
        </div>
      </div>

      {/* Aggregate KPI Summary - 100% Real Database */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border border-[#E2E8F0] shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-xs font-semibold text-slate-600">Registered Lab Assets</span>
            <HardDrive className="w-4 h-4 text-slate-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#0F172A]">{totalAssetsCount}</span>
            <span className="text-xs text-slate-500 font-medium">Unique Equipment Types</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {totalUnits === 0 ? '0 physical units in inventory' : `${totalUnits} total physical workstations/units`}
          </p>
        </div>

        <div className="bg-white p-4 rounded-lg border border-[#E2E8F0] shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-xs font-semibold text-slate-600">Operational Health</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#0F172A]">
              {totalUnits === 0 ? '0%' : `${operationalHealthPct}%`}
            </span>
            <span className="text-xs text-emerald-700 font-semibold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
              {operationalUnits} Operational
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Ready for scheduled practical sessions</p>
        </div>

        <div className="bg-white p-4 rounded-lg border border-[#E2E8F0] shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-xs font-semibold text-slate-600">Under Maintenance</span>
            <Wrench className="w-4 h-4 text-amber-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-2xl font-bold ${maintenanceUnits > 0 ? 'text-amber-700' : 'text-slate-900'}`}>
              {maintenanceUnits}
            </span>
            <span className="text-xs text-slate-500 font-medium">Units servicing</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {maintenanceUnits === 0 ? 'Zero hardware defects logged' : 'Calibration / repair tickets logged'}
          </p>
        </div>

        <div className="bg-white p-4 rounded-lg border border-[#E2E8F0] shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 mb-1.5">
            <span className="text-xs font-semibold text-slate-600">Critical Status</span>
            <ShieldAlert className="w-4 h-4 text-red-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#0F172A]">
              {labEquipment.filter(e => e.status === 'critical').length}
            </span>
            <span className="text-xs text-slate-500 font-medium">Assets Critical</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Requires immediate replacement</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-lg border border-[#E2E8F0] text-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          <input
            type="text"
            placeholder="Search equipment, asset code, laboratory or department..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full text-xs pl-8 pr-3 py-1.5 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#4F46E5]"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-slate-500 font-medium mr-1">Status:</span>
          {['all', 'operational', 'maintenance', 'critical'].map(st => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-2.5 py-1 rounded text-xs font-semibold capitalize transition-colors cursor-pointer ${
                filterStatus === st
                  ? 'bg-[#0F172A] text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Equipment Table / Empty State */}
      {labEquipment.length === 0 ? (
        <div className="bg-white rounded-lg border border-[#E2E8F0] p-10 sm:p-14 text-center shadow-xs">
          <div className="w-16 h-16 mx-auto rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mb-4">
            <FlaskConical className="w-8 h-8 text-slate-400" />
          </div>
          <h2 className="text-base font-bold text-[#0F172A] mb-1">
            0 Laboratory Equipment Assets Registered
          </h2>
          <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed mb-5">
            No laboratory equipment, computing workstations, or test instruments exist in the database yet. Click below to register lab assets with workstation counts, operational status, and faculty in-charge.
          </p>
          {canEdit && (
            <button
              onClick={() => setIsRegisterModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-[#0F172A] hover:bg-slate-800 text-white font-semibold text-xs shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-amber-400" />
              Register First Lab Asset
            </button>
          )}
        </div>
      ) : filteredEquipment.length === 0 ? (
        <div className="bg-white rounded-lg border border-[#E2E8F0] p-8 text-center text-slate-500">
          <p className="font-semibold text-slate-700">No laboratory assets match your search or filter.</p>
          <p className="text-xs text-slate-400 mt-1">Try resetting the status filter or search query.</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-xs overflow-hidden">
          <div className="p-3.5 border-b border-[#E2E8F0] flex items-center justify-between bg-white">
            <h2 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
              Institutional Laboratory Equipment Roster
            </h2>
            <span className="text-[11px] text-slate-500 font-medium">
              {filteredEquipment.length} Registered Lab Asset{filteredEquipment.length === 1 ? '' : 's'}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-slate-600 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-2.5 px-3">Equipment / Asset</th>
                  <th className="py-2.5 px-3">Laboratory & Dept</th>
                  <th className="py-2.5 px-3 text-center">Total Units</th>
                  <th className="py-2.5 px-3 text-center">Operational</th>
                  <th className="py-2.5 px-3 text-center">Maintenance</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-center">Last Serviced</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEquipment.map(eq => {
                  const isEditing = editingId === eq.id;
                  return (
                    <tr key={eq.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-3 font-semibold text-slate-900">
                        <p>{eq.equipmentName}</p>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">{eq.assetCode}</p>
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        <p className="font-semibold text-slate-800">{eq.labName}</p>
                        <p className="text-[10px] text-slate-400">In Charge: {eq.inCharge || 'Not Assigned'}</p>
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-slate-800">{eq.quantity}</td>
                      <td className="py-3 px-3 text-center font-bold text-emerald-700">
                        {isEditing ? (
                          <input
                            type="number"
                            value={workingCount}
                            onChange={e => setWorkingCount(Number(e.target.value))}
                            className="w-14 p-1 border rounded text-center text-xs font-bold"
                            max={eq.quantity}
                            min={0}
                          />
                        ) : (
                          eq.workingCount
                        )}
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-amber-700">
                        {isEditing ? (
                          <input
                            type="number"
                            value={maintenanceCount}
                            onChange={e => setMaintenanceCount(Number(e.target.value))}
                            className="w-14 p-1 border rounded text-center text-xs font-bold"
                            max={eq.quantity}
                            min={0}
                          />
                        ) : (
                          eq.maintenanceCount
                        )}
                      </td>
                      <td className="py-3 px-3">
                        {isEditing ? (
                          <select
                            value={status}
                            onChange={e => setStatus(e.target.value as any)}
                            className="p-1 border rounded text-xs bg-white font-medium"
                          >
                            <option value="operational">Operational</option>
                            <option value="maintenance">Maintenance</option>
                            <option value="critical">Critical</option>
                          </select>
                        ) : (
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              eq.status === 'operational'
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : eq.status === 'maintenance'
                                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                : 'bg-red-50 text-red-800 border border-red-200'
                            }`}
                          >
                            {eq.status}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-[11px] text-slate-500">
                        {eq.lastServiced || 'Pending'}
                      </td>
                      <td className="py-3 px-3 text-right">
                        {canEdit && (
                          <div className="flex items-center justify-end gap-1.5">
                            {isEditing ? (
                              <>
                                <button
                                  onClick={() => handleSave(eq)}
                                  className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-semibold transition-colors cursor-pointer"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => setEditingId(null)}
                                  className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-[11px] font-medium transition-colors cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  onClick={() => startEdit(eq)}
                                  className="p-1 text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer"
                                  title="Edit Counts / Status"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setDeleteConfirmId(eq.id)}
                                  className="p-1 text-slate-400 hover:text-red-600 transition-colors cursor-pointer"
                                  title="Remove Asset"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Register New Asset Modal */}
      {isRegisterModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <FlaskConical className="w-4 h-4 text-[#4F46E5]" />
                <h3 className="font-bold text-slate-900 text-sm">Register New Laboratory Asset</h3>
              </div>
              <button
                onClick={() => setIsRegisterModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRegisterAsset} className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Equipment Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dell Precision 3660 Workstations"
                    value={newEquipmentName}
                    onChange={e => setNewEquipmentName(e.target.value)}
                    className="w-full text-xs p-2 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] font-medium text-slate-900 focus:bg-white focus:ring-1 focus:ring-[#4F46E5]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Asset Code *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. LAB-CSE-ACL-301"
                    value={newAssetCode}
                    onChange={e => setNewAssetCode(e.target.value)}
                    className="w-full text-xs p-2 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] font-mono text-slate-900 focus:bg-white focus:ring-1 focus:ring-[#4F46E5]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Laboratory Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Advanced Computing Lab 3"
                    value={newLabName}
                    onChange={e => setNewLabName(e.target.value)}
                    className="w-full text-xs p-2 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] font-medium text-slate-900 focus:bg-white focus:ring-1 focus:ring-[#4F46E5]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Department</label>
                  <select
                    value={newDepartment}
                    onChange={e => setNewDepartment(e.target.value)}
                    className="w-full text-xs p-2 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] font-medium text-slate-900 focus:bg-white focus:ring-1 focus:ring-[#4F46E5]"
                  >
                    {departments.length > 0 ? (
                      departments.map(d => (
                        <option key={d.id} value={d.name}>
                          {d.name} ({d.code})
                        </option>
                      ))
                    ) : (
                      <option value="Computer Science & Engineering">Computer Science & Engineering</option>
                    )}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Total Units *</label>
                  <input
                    type="number"
                    min={1}
                    value={newQuantity}
                    onChange={e => {
                      const val = Number(e.target.value);
                      setNewQuantity(val);
                      if (newWorkingCount > val) setNewWorkingCount(val);
                    }}
                    className="w-full text-xs p-2 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] font-bold text-slate-900 text-center focus:bg-white focus:ring-1 focus:ring-[#4F46E5]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Operational Units *</label>
                  <input
                    type="number"
                    min={0}
                    max={newQuantity}
                    value={newWorkingCount}
                    onChange={e => setNewWorkingCount(Number(e.target.value))}
                    className="w-full text-xs p-2 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] font-bold text-emerald-700 text-center focus:bg-white focus:ring-1 focus:ring-[#4F46E5]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Status</label>
                  <select
                    value={newStatus}
                    onChange={e => setNewStatus(e.target.value as any)}
                    className="w-full text-xs p-2 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] font-medium text-slate-900 focus:bg-white focus:ring-1 focus:ring-[#4F46E5]"
                  >
                    <option value="operational">Operational</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Faculty / Staff In-Charge</label>
                <input
                  type="text"
                  placeholder="e.g. Mr. Senthil Nathan (Lab Technician)"
                  value={newInCharge}
                  onChange={e => setNewInCharge(e.target.value)}
                  className="w-full text-xs p-2 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] font-medium text-slate-900 focus:bg-white focus:ring-1 focus:ring-[#4F46E5]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsRegisterModalOpen(false)}
                  className="px-3.5 py-1.5 rounded-md text-slate-600 hover:bg-slate-100 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-md bg-[#0F172A] hover:bg-slate-800 text-white font-semibold flex items-center gap-1.5 shadow-xs cursor-pointer active:scale-95 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {isSubmitting ? 'Registering...' : 'Register Asset'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-5 shadow-2xl border border-slate-200">
            <h3 className="font-bold text-slate-900 text-sm mb-1.5">Confirm Asset Removal</h3>
            <p className="text-xs text-slate-500 mb-4 leading-relaxed">
              Are you sure you want to remove this equipment item from the laboratory asset register? This action will be permanently recorded in the institutional audit log.
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-3 py-1.5 rounded-md text-slate-600 hover:bg-slate-100 font-semibold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteEquipment(deleteConfirmId)}
                className="px-3.5 py-1.5 rounded-md bg-red-600 hover:bg-red-700 text-white font-semibold text-xs transition-colors cursor-pointer"
              >
                Delete Asset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
