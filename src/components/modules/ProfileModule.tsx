import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  KeyRound,
  Lock,
  Edit3,
  Save,
  X,
  Building2,
  GraduationCap,
  Briefcase,
  Calendar,
  MapPin,
  Image,
  Phone,
  User,
  HeartHandshake
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UserProfile } from '../../types';

export const ProfileModule: React.FC = () => {
  const { currentUser, currentRole, actualRole, isSimulatingRole, updateCurrentUserProfile } = useAuth();

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Common Profile State
  const [avatar, setAvatar] = useState(currentUser.avatar || '');
  const [phone, setPhone] = useState(currentUser.phone || '');
  const [dateOfBirth, setDateOfBirth] = useState(currentUser.dateOfBirth || '');
  const [gender, setGender] = useState<UserProfile['gender']>(currentUser.gender || 'prefer_not_to_say');
  const [address, setAddress] = useState(currentUser.address || '');
  const [city, setCity] = useState(currentUser.city || '');
  const [state, setState] = useState(currentUser.state || '');
  const [pincode, setPincode] = useState(currentUser.pincode || '');
  const [emergencyContact, setEmergencyContact] = useState(currentUser.emergencyContact || '');

  // Student-Specific State
  const [parentName, setParentName] = useState(currentUser.parentName || '');
  const [parentPhone, setParentPhone] = useState(currentUser.parentPhone || '');
  const [admissionYear, setAdmissionYear] = useState<string>(
    currentUser.admissionYear ? String(currentUser.admissionYear) : currentUser.joiningYear || '2022'
  );
  const [currentAcademicYear, setCurrentAcademicYear] = useState<string>(
    currentUser.currentAcademicYear || (currentUser.semester ? `${Math.ceil(currentUser.semester / 2)}${Math.ceil(currentUser.semester / 2) === 1 ? 'st' : Math.ceil(currentUser.semester / 2) === 2 ? 'nd' : Math.ceil(currentUser.semester / 2) === 3 ? 'rd' : 'th'} Year` : '3rd Year')
  );

  // Faculty / HOD / Admin Specific State
  const [qualification, setQualification] = useState(currentUser.qualification || '');
  const [specialization, setSpecialization] = useState(currentUser.specialization || '');
  const [designation, setDesignation] = useState(currentUser.designation || '');
  const [experience, setExperience] = useState(currentUser.experience || '');
  const [officeRoomNumber, setOfficeRoomNumber] = useState(currentUser.officeRoomNumber || '');
  const [officialContact, setOfficialContact] = useState(currentUser.officialContact || '');

  // Sync state whenever currentUser changes
  useEffect(() => {
    setAvatar(currentUser.avatar || '');
    setPhone(currentUser.phone || '');
    setDateOfBirth(currentUser.dateOfBirth || '');
    setGender(currentUser.gender || 'prefer_not_to_say');
    setAddress(currentUser.address || '');
    setCity(currentUser.city || '');
    setState(currentUser.state || '');
    setPincode(currentUser.pincode || '');
    setEmergencyContact(currentUser.emergencyContact || '');
    setParentName(currentUser.parentName || '');
    setParentPhone(currentUser.parentPhone || '');
    setAdmissionYear(currentUser.admissionYear ? String(currentUser.admissionYear) : currentUser.joiningYear || '2022');
    setCurrentAcademicYear(
      currentUser.currentAcademicYear ||
      (currentUser.semester ? `${Math.ceil(currentUser.semester / 2)}${Math.ceil(currentUser.semester / 2) === 1 ? 'st' : Math.ceil(currentUser.semester / 2) === 2 ? 'nd' : Math.ceil(currentUser.semester / 2) === 3 ? 'rd' : 'th'} Year` : '3rd Year')
    );
    setQualification(currentUser.qualification || '');
    setSpecialization(currentUser.specialization || '');
    setDesignation(currentUser.designation || '');
    setExperience(currentUser.experience || '');
    setOfficeRoomNumber(currentUser.officeRoomNumber || '');
    setOfficialContact(currentUser.officialContact || '');
  }, [currentUser]);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4500);
  };

  const getInitials = (name: string) => {
    const parts = name.replace(/^Dr\.\s*|^Prof\.\s*|^Mr\.\s*/i, '').trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return (name[0] + (name[1] || '')).toUpperCase();
  };

  const handleCancel = () => {
    setAvatar(currentUser.avatar || '');
    setPhone(currentUser.phone || '');
    setDateOfBirth(currentUser.dateOfBirth || '');
    setGender(currentUser.gender || 'prefer_not_to_say');
    setAddress(currentUser.address || '');
    setCity(currentUser.city || '');
    setState(currentUser.state || '');
    setPincode(currentUser.pincode || '');
    setEmergencyContact(currentUser.emergencyContact || '');
    setParentName(currentUser.parentName || '');
    setParentPhone(currentUser.parentPhone || '');
    setAdmissionYear(currentUser.admissionYear ? String(currentUser.admissionYear) : currentUser.joiningYear || '2022');
    setCurrentAcademicYear(currentUser.currentAcademicYear || '3rd Year');
    setQualification(currentUser.qualification || '');
    setSpecialization(currentUser.specialization || '');
    setDesignation(currentUser.designation || '');
    setExperience(currentUser.experience || '');
    setOfficeRoomNumber(currentUser.officeRoomNumber || '');
    setOfficialContact(currentUser.officialContact || '');
    setIsEditing(false);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const updatedFields: Partial<UserProfile> = {
        avatar: avatar.trim(),
        phone: phone.trim(),
        dateOfBirth: dateOfBirth || undefined,
        gender: gender || 'prefer_not_to_say',
        address: address.trim(),
        city: city.trim(),
        state: state.trim(),
        pincode: pincode.trim(),
        emergencyContact: emergencyContact.trim()
      };

      if (currentUser.role === 'student') {
        updatedFields.parentName = parentName.trim();
        updatedFields.parentPhone = parentPhone.trim();
        updatedFields.admissionYear = admissionYear.trim() ? Number(admissionYear) : 2022;
        updatedFields.currentAcademicYear = currentAcademicYear;
      } else {
        // Faculty / HOD / Admin
        updatedFields.qualification = qualification.trim();
        updatedFields.specialization = specialization.trim();
        if (designation.trim()) updatedFields.designation = designation.trim();
        updatedFields.experience = experience.trim();
        updatedFields.officeRoomNumber = officeRoomNumber.trim();
        updatedFields.officialContact = officialContact.trim();
      }

      await updateCurrentUserProfile(updatedFields);
      setIsEditing(false);
      showNotification('success', 'Profile updated successfully and synced to your authoritative collegiate record!');
    } catch (err: any) {
      showNotification('error', err?.message || 'Failed to update profile. Please check connection and try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const isStudent = currentUser.role === 'student';
  const isFacultyOrHod = currentUser.role === 'faculty' || currentUser.role === 'hod';
  const isAdmin = currentUser.role === 'admin';

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
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

      {/* Role Simulation Mode Notice */}
      {isSimulatingRole && (
        <div className="p-3.5 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 text-xs flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              You are editing your authenticated Administrator profile for <strong>{currentUser.name}</strong> while simulating the <strong>{currentRole.toUpperCase()}</strong> role view. Real student/staff profiles are completely isolated and can be managed via <strong>Users & Students</strong>.
            </span>
          </div>
        </div>
      )}

      {/* Profile Header Banner */}
      <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-2xs p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {/* Live Profile Photo / Initials */}
            <div className="relative">
              {currentUser.avatar ? (
                <img
                  src={currentUser.avatar}
                  alt={currentUser.name}
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-full object-cover border-2 border-slate-200 shadow-sm"
                  onError={(e) => {
                    // Fallback to initial if image fails
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#0F172A] text-white flex items-center justify-center font-bold text-xl sm:text-2xl tracking-wider shrink-0 border border-slate-300 shadow-xs">
                  {getInitials(currentUser.name)}
                </div>
              )}
              <span className="absolute bottom-0 right-0 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full" title="Active Account" />
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg sm:text-xl font-bold text-[#0F172A]">{currentUser.name}</h1>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-800 border border-slate-200">
                  {currentUser.role.replace('_', ' ')}
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" /> Verified
                </span>
              </div>
              <p className="text-xs text-slate-600 font-medium mt-1">
                {currentUser.designation || (isStudent ? 'B.Tech Student' : 'Collegiate Member')} • {currentUser.department}
              </p>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5 flex items-center gap-1">
                <Lock className="w-3 h-3 text-slate-400" />
                <span>{isStudent ? 'Roll No / USN' : 'Employee ID'}: <strong>{currentUser.regId}</strong></span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            {!isEditing ? (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-md bg-[#0F172A] hover:bg-slate-800 text-white font-semibold text-xs shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                Update Profile
              </button>
            ) : (
              <button
                type="button"
                onClick={handleCancel}
                disabled={isSaving}
                className="px-3.5 py-2 rounded-md border border-[#E2E8F0] text-slate-600 hover:bg-slate-100 font-semibold text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
            )}
          </div>
        </div>

        {/* Quick Identity Badges */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-4 mt-5 border-t border-slate-100 text-xs">
          <div className="p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block flex items-center gap-1">
              <Lock className="w-3 h-3 text-slate-400" /> Official Identification
            </span>
            <p className="font-mono font-bold text-slate-900 text-xs mt-1">{currentUser.regId}</p>
          </div>

          <div className="p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block flex items-center gap-1">
              <Lock className="w-3 h-3 text-slate-400" /> Institutional Email
            </span>
            <p className="font-semibold text-slate-900 truncate text-xs mt-1">{currentUser.email}</p>
          </div>

          <div className="p-3 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0]">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block flex items-center gap-1">
              <Lock className="w-3 h-3 text-slate-400" /> Department Division
            </span>
            <p className="font-semibold text-slate-900 text-xs mt-1">{currentUser.departmentCode} • {currentUser.department}</p>
          </div>
        </div>
      </div>

      {/* Main Profile Form */}
      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: Locked Identity Fields Notice */}
        <div className="bg-amber-50/50 border border-amber-200/80 rounded-lg p-4 text-xs text-amber-900">
          <div className="flex items-start gap-2.5">
            <Lock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h2 className="font-bold text-amber-950">Statutory Protected Identity Fields</h2>
              <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                Full Name, Institutional Roll Number / Employee ID, Email, and Department are verified collegiate records and cannot be altered by users. Academic relationships (departments, classes, sections) are managed strictly by Admin/HOD governance.
              </p>
            </div>
          </div>
        </div>

        {/* Section 2: Common Personal & Contact Information */}
        <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-2xs overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-[#4F46E5]" />
              <h2 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                Personal & Contact Information
              </h2>
            </div>
            {isEditing && (
              <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                Editing Enabled
              </span>
            )}
          </div>

          <div className="p-5 space-y-4 text-xs">
            {/* Photo Avatar URL */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Profile Photo URL
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/... or paste image URL"
                  value={avatar}
                  disabled={!isEditing}
                  onChange={e => setAvatar(e.target.value)}
                  className="flex-1 p-2 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] focus:bg-white text-slate-800 disabled:opacity-75 disabled:bg-slate-50"
                />
                {avatar && (
                  <img
                    src={avatar}
                    alt="Preview"
                    className="w-8 h-8 rounded-full object-cover border border-slate-200 shrink-0"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = 'none';
                    }}
                  />
                )}
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Enter an image URL for your official collegiate profile picture.
              </p>
            </div>

            {/* Locked Identity Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-slate-400" /> Full Legal Name
                </label>
                <input
                  type="text"
                  value={currentUser.name}
                  disabled
                  readOnly
                  className="w-full p-2 rounded-md border border-slate-200 bg-slate-100 text-slate-600 font-semibold cursor-not-allowed text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-slate-400" /> Roll No / Employee ID
                </label>
                <input
                  type="text"
                  value={currentUser.regId}
                  disabled
                  readOnly
                  className="w-full p-2 rounded-md border border-slate-200 bg-slate-100 text-slate-600 font-mono font-bold cursor-not-allowed text-xs"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 mb-1 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-slate-400" /> Institutional Email
                </label>
                <input
                  type="email"
                  value={currentUser.email}
                  disabled
                  readOnly
                  className="w-full p-2 rounded-md border border-slate-200 bg-slate-100 text-slate-600 cursor-not-allowed text-xs truncate"
                />
              </div>
            </div>

            {/* Editable Contact & Personal Details */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  placeholder="+91 98765 43210"
                  value={phone}
                  disabled={!isEditing}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full p-2 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] focus:bg-white text-slate-800 disabled:opacity-75 disabled:bg-slate-50 font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={dateOfBirth}
                  disabled={!isEditing}
                  onChange={e => setDateOfBirth(e.target.value)}
                  className="w-full p-2 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] focus:bg-white text-slate-800 disabled:opacity-75 disabled:bg-slate-50"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Gender
                </label>
                <select
                  value={gender}
                  disabled={!isEditing}
                  onChange={e => setGender(e.target.value as any)}
                  className="w-full p-2 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] focus:bg-white text-slate-800 disabled:opacity-75 disabled:bg-slate-50 font-medium"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                  <option value="prefer_not_to_say">Prefer not to say</option>
                </select>
              </div>
            </div>

            {/* Address, City, State, Pincode */}
            <div className="space-y-3 pt-2">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Residential Address
                </label>
                <input
                  type="text"
                  placeholder="Street address, apartment or campus hostel details..."
                  value={address}
                  disabled={!isEditing}
                  onChange={e => setAddress(e.target.value)}
                  className="w-full p-2 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] focus:bg-white text-slate-800 disabled:opacity-75 disabled:bg-slate-50"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    City
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Tadepalligudem"
                    value={city}
                    disabled={!isEditing}
                    onChange={e => setCity(e.target.value)}
                    className="w-full p-2 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] focus:bg-white text-slate-800 disabled:opacity-75 disabled:bg-slate-50"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    State
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Andhra Pradesh"
                    value={state}
                    disabled={!isEditing}
                    onChange={e => setState(e.target.value)}
                    className="w-full p-2 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] focus:bg-white text-slate-800 disabled:opacity-75 disabled:bg-slate-50"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Pincode
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 534101"
                    value={pincode}
                    disabled={!isEditing}
                    onChange={e => setPincode(e.target.value)}
                    className="w-full p-2 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] focus:bg-white text-slate-800 disabled:opacity-75 disabled:bg-slate-50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Emergency Contact
                </label>
                <input
                  type="text"
                  placeholder="Emergency contact name and phone number (e.g. John Doe, +91-9988776655)"
                  value={emergencyContact}
                  disabled={!isEditing}
                  onChange={e => setEmergencyContact(e.target.value)}
                  className="w-full p-2 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] focus:bg-white text-slate-800 disabled:opacity-75 disabled:bg-slate-50"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Role-Specific Academic Information */}
        {isStudent && (
          <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-2xs overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-[#4F46E5]" />
                <h2 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                  Student Enrollment & Guardian Information
                </h2>
              </div>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Parent / Guardian Full Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Ramesh Sharma"
                    value={parentName}
                    disabled={!isEditing}
                    onChange={e => setParentName(e.target.value)}
                    className="w-full p-2 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] focus:bg-white text-slate-800 disabled:opacity-75 disabled:bg-slate-50"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Parent / Guardian Contact Phone
                  </label>
                  <input
                    type="tel"
                    placeholder="+91 94455 66778"
                    value={parentPhone}
                    disabled={!isEditing}
                    onChange={e => setParentPhone(e.target.value)}
                    className="w-full p-2 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] focus:bg-white text-slate-800 disabled:opacity-75 disabled:bg-slate-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Admission Year
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 2022"
                    value={admissionYear}
                    disabled={!isEditing}
                    onChange={e => setAdmissionYear(e.target.value)}
                    className="w-full p-2 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] focus:bg-white text-slate-800 disabled:opacity-75 disabled:bg-slate-50"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Current Academic Year
                  </label>
                  <select
                    value={currentAcademicYear}
                    disabled={!isEditing}
                    onChange={e => setCurrentAcademicYear(e.target.value)}
                    className="w-full p-2 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] focus:bg-white text-slate-800 disabled:opacity-75 disabled:bg-slate-50 font-medium"
                  >
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">4th Year</option>
                  </select>
                </div>
              </div>

              {/* Locked Student Academic Allocations */}
              <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-2 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-slate-400" /> Administrative Academic Placement (Managed by HOD / Admin)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Department</span>
                    <strong className="text-slate-800">{currentUser.department} ({currentUser.departmentCode})</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Semester</span>
                    <strong className="text-slate-800">Semester {currentUser.semester || 5}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Assigned Section</span>
                    <strong className="text-slate-800">{currentUser.section ? `Section ${currentUser.section}` : 'Section A'}</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Section 4: Faculty / HOD / Admin Professional Details */}
        {(isFacultyOrHod || isAdmin) && (
          <div className="bg-white rounded-lg border border-[#E2E8F0] shadow-2xs overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-[#4F46E5]" />
                <h2 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">
                  Academic Credentials & Faculty Office
                </h2>
              </div>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Highest Educational Qualification
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Ph.D. in Computer Science & Engineering"
                    value={qualification}
                    disabled={!isEditing}
                    onChange={e => setQualification(e.target.value)}
                    className="w-full p-2 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] focus:bg-white text-slate-800 disabled:opacity-75 disabled:bg-slate-50"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Specialization / Research Domain
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Distributed Computing, Machine Learning"
                    value={specialization}
                    disabled={!isEditing}
                    onChange={e => setSpecialization(e.target.value)}
                    className="w-full p-2 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] focus:bg-white text-slate-800 disabled:opacity-75 disabled:bg-slate-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Official Academic Designation
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Associate Professor"
                    value={designation}
                    disabled={!isEditing}
                    onChange={e => setDesignation(e.target.value)}
                    className="w-full p-2 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] focus:bg-white text-slate-800 disabled:opacity-75 disabled:bg-slate-50 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Teaching & Research Experience
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 10 Years"
                    value={experience}
                    disabled={!isEditing}
                    onChange={e => setExperience(e.target.value)}
                    className="w-full p-2 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] focus:bg-white text-slate-800 disabled:opacity-75 disabled:bg-slate-50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Office / Room / Cabin Number
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Room 304, CS Academic Block"
                    value={officeRoomNumber}
                    disabled={!isEditing}
                    onChange={e => setOfficeRoomNumber(e.target.value)}
                    className="w-full p-2 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] focus:bg-white text-slate-800 disabled:opacity-75 disabled:bg-slate-50"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Official Intercom / Extension Contact
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Ext. 4022 / +91-94440-12345"
                    value={officialContact}
                    disabled={!isEditing}
                    onChange={e => setOfficialContact(e.target.value)}
                    className="w-full p-2 rounded-md border border-[#E2E8F0] bg-[#F8FAFC] focus:bg-white text-slate-800 disabled:opacity-75 disabled:bg-slate-50"
                  />
                </div>
              </div>

              {/* Locked Department Information */}
              <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1 flex items-center gap-1">
                  <Lock className="w-3 h-3 text-slate-400" /> Affiliated Department & Teaching Load
                </span>
                <p className="text-slate-600 text-xs">
                  Assigned Department: <strong className="text-slate-900">{currentUser.department} ({currentUser.departmentCode})</strong>. Course allocations, workload limits, and timetable scheduling are controlled by HOD & Academic Dean governance.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons in Edit Mode */}
        {isEditing && (
          <div className="flex items-center justify-end gap-3 p-4 bg-white rounded-lg border border-[#E2E8F0] shadow-xs">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isSaving}
              className="px-4 py-2 rounded-md text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center gap-1.5 px-5 py-2 rounded-md text-xs font-semibold text-white bg-[#0F172A] hover:bg-slate-800 transition-all cursor-pointer shadow-xs disabled:opacity-50"
            >
              <Save className="w-4 h-4 text-emerald-400" />
              {isSaving ? 'Saving to Database...' : 'Save Profile Changes'}
            </button>
          </div>
        )}
      </form>
    </div>
  );
};
