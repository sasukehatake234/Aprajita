import React, { useState } from 'react';
import {
  Users,
  UserPlus,
  Edit2,
  Trash2,
  Phone,
  Check,
  X,
  AlertCircle,
  RefreshCw,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Info,
} from 'lucide-react';
import {
  TrustedContact,
  validateIndianMobileNumber,
  isDuplicatePhoneNumber,
} from '../types';

interface ContactsViewProps {
  contacts: TrustedContact[];
  onAddContact: (contact: Omit<TrustedContact, 'id' | 'addedAt' | 'syncedToKeychain'>) => void;
  onUpdateContact: (contact: TrustedContact) => void;
  onDeleteContact: (id: string) => void;
  onSyncContacts: () => Promise<void>;
  isBleConnected: boolean;
  contactsSyncedCount: number;
  lastSyncTimestamp: string | null;
}

export function ContactsView({
  contacts,
  onAddContact,
  onUpdateContact,
  onDeleteContact,
  onSyncContacts,
  isBleConnected,
  contactsSyncedCount,
  lastSyncTimestamp,
}: ContactsViewProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<TrustedContact | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [phoneInput, setPhoneInput] = useState('');
  const [isEmergencyRecipient, setIsEmergencyRecipient] = useState(true);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Delete confirmation
  const [contactToDelete, setContactToDelete] = useState<TrustedContact | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  const emergencyRecipients = contacts.filter((c) => c.isEmergencyRecipient);
  const MAX_ESP32_CONTACTS = 5;

  // Check if phone contacts and keychain flash are out of sync
  const hasDiscrepancy =
    emergencyRecipients.some((c) => !c.syncedToKeychain) ||
    emergencyRecipients.length !== contactsSyncedCount;

  const openAddModal = () => {
    setEditingContact(null);
    setName('');
    setPhoneInput('+91 ');
    setIsEmergencyRecipient(emergencyRecipients.length < MAX_ESP32_CONTACTS);
    setValidationError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (contact: TrustedContact) => {
    setEditingContact(contact);
    setName(contact.name);
    setPhoneInput(contact.phone);
    setIsEmergencyRecipient(contact.isEmergencyRecipient);
    setValidationError(null);
    setIsModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      setValidationError('Please enter contact name.');
      return;
    }

    const valResult = validateIndianMobileNumber(phoneInput);
    if (!valResult.valid) {
      setValidationError(valResult.error || 'Please enter a valid 10-digit Indian mobile number.');
      return;
    }

    // Duplicate detection check
    const isDup = isDuplicatePhoneNumber(
      valResult.normalized,
      contacts,
      editingContact?.id
    );
    if (isDup) {
      setValidationError('This mobile number is already in your emergency contact list.');
      return;
    }

    // Cap check for emergency SMS recipient
    if (
      isEmergencyRecipient &&
      !editingContact?.isEmergencyRecipient &&
      emergencyRecipients.length >= MAX_ESP32_CONTACTS
    ) {
      setValidationError(
        `Hardware Flash Limit: The ESP32 firmware can store up to ${MAX_ESP32_CONTACTS} emergency SMS recipients.`
      );
      return;
    }

    if (editingContact) {
      onUpdateContact({
        ...editingContact,
        name: name.trim(),
        phone: valResult.normalized,
        isEmergencyRecipient,
        syncedToKeychain: false,
      });
    } else {
      onAddContact({
        name: name.trim(),
        phone: valResult.normalized,
        isEmergencyRecipient,
      });
    }

    setIsModalOpen(false);
  };

  const handleConfirmDelete = () => {
    if (contactToDelete) {
      onDeleteContact(contactToDelete.id);
      setContactToDelete(null);
    }
  };

  const handleSyncToKeychain = async () => {
    setIsSyncing(true);
    setSyncStatus(null);
    try {
      await onSyncContacts();
      setSyncStatus(`Successfully synchronized ${emergencyRecipients.length} contacts to ESP32 Flash memory.`);
      setTimeout(() => setSyncStatus(null), 4000);
    } catch (err: any) {
      setSyncStatus(`Sync failed: ${err.message || 'BLE write error'}`);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="space-y-4 pb-12 animate-fade-in text-slate-900">
      {/* Title & Add Contact Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-6 h-6 text-slate-700" />
            <span>Emergency Contacts</span>
          </h2>
          <p className="text-xs text-slate-500">
            Contacts saved here are transferred to ESP32 Flash memory to send autonomous SMS alerts.
          </p>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="self-start sm:self-auto bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 shadow-xs"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add Contact</span>
        </button>
      </div>

      {/* Synchronization Banner & Discrepancy Indicator */}
      <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div
              className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 ${
                !hasDiscrepancy && contactsSyncedCount > 0
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-amber-100 text-amber-700'
              }`}
            >
              {!hasDiscrepancy && contactsSyncedCount > 0 ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">
                  ESP32 Keychain Synchronization
                </h3>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                    !hasDiscrepancy && contactsSyncedCount > 0
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {!hasDiscrepancy && contactsSyncedCount > 0
                    ? 'In Sync'
                    : 'Sync Required'}
                </span>
              </div>

              <p className="text-xs text-slate-500 mt-0.5">
                {contactsSyncedCount > 0
                  ? `${contactsSyncedCount} contacts stored in ESP32 Flash memory.`
                  : 'No contacts stored on keychain yet.'}
                {lastSyncTimestamp && (
                  <span className="ml-1 text-[11px] text-slate-400">
                    (Last synced: {new Date(lastSyncTimestamp).toLocaleTimeString()})
                  </span>
                )}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSyncToKeychain}
            disabled={isSyncing || emergencyRecipients.length === 0}
            className={`self-start sm:self-auto text-xs font-bold px-4 py-2.5 rounded-xl transition-all flex items-center gap-2 shadow-xs ${
              hasDiscrepancy
                ? 'bg-amber-500 hover:bg-amber-600 text-white'
                : 'bg-slate-900 hover:bg-slate-800 text-white'
            } disabled:opacity-50`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Writing to Flash...' : 'Sync to Keychain'}</span>
          </button>
        </div>

        {syncStatus && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center gap-2 font-medium">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{syncStatus}</span>
          </div>
        )}

        {hasDiscrepancy && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 flex items-start gap-2">
            <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              Phone contacts differ from the keychain's onboard flash memory. Press <strong>Sync to Keychain</strong> so physical SOS dispatches alert the latest numbers.
            </span>
          </div>
        )}
      </div>

      {/* Contact List */}
      {contacts.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center max-w-md mx-auto my-6 space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center mx-auto">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">No Emergency Contacts Added</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            SURAKSHA KEY never pre-fills fake example contacts. Please add family, friends, or trusted guardians who should receive your emergency SOS SMS.
          </p>
          <div className="pt-2">
            <button
              onClick={openAddModal}
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2 rounded-xl transition-colors inline-flex items-center gap-1.5 shadow-xs"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add Your First Contact</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {contacts.map((contact) => (
            <div
              key={contact.id}
              className={`bg-white border rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
                contact.isEmergencyRecipient
                  ? 'border-slate-200'
                  : 'border-slate-200 opacity-60 bg-slate-50/50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm ${
                    contact.isEmergencyRecipient
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {contact.name.charAt(0).toUpperCase()}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-900">{contact.name}</span>
                    {contact.isEmergencyRecipient ? (
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                        SMS Recipient
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
                        Muted
                      </span>
                    )}

                    {contact.syncedToKeychain && (
                      <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                        <Check className="w-2.5 h-2.5" />
                        <span>Flash Synced</span>
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-slate-500 font-mono flex items-center gap-1.5 mt-0.5">
                    <Phone className="w-3 h-3 text-slate-400" />
                    <span>{contact.phone}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={() => openEditModal(contact)}
                  className="p-2 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                  title="Edit Contact"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setContactToDelete(contact)}
                  className="p-2 text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-xl transition-colors"
                  title="Delete Contact"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Contact Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {editingContact ? 'Edit Emergency Contact' : 'Add Emergency Contact'}
              </h3>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Contact Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Papa, Maa, Sister"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Indian Mobile Number
                </label>
                <input
                  type="tel"
                  value={phoneInput}
                  onChange={(e) => {
                    setPhoneInput(e.target.value);
                    setValidationError(null);
                  }}
                  placeholder="+91 98765 43210"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  required
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Must be 10 digits starting with 6, 7, 8, or 9
                </span>
              </div>

              <div className="pt-1 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="recipientToggle"
                  checked={isEmergencyRecipient}
                  onChange={(e) => setIsEmergencyRecipient(e.target.checked)}
                  className="rounded text-slate-900 focus:ring-slate-900 w-4 h-4"
                />
                <label htmlFor="recipientToggle" className="font-medium text-slate-700 select-none">
                  Receive emergency SOS SMS messages
                </label>
              </div>

              {validationError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{validationError}</span>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 px-4 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-4 bg-slate-900 text-white font-bold rounded-xl text-xs hover:bg-black transition-colors shadow-xs"
                >
                  Save Contact
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {contactToDelete && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-xl border border-slate-200 text-center">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Delete Emergency Contact?</h3>
            <p className="text-xs text-slate-500">
              Are you sure you want to remove <strong>{contactToDelete.name}</strong> ({contactToDelete.phone})? They will no longer receive emergency SOS dispatches.
            </p>
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setContactToDelete(null)}
                className="flex-1 py-2.5 px-4 bg-slate-100 text-slate-700 font-bold rounded-xl text-xs hover:bg-slate-200 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 px-4 bg-red-600 text-white font-bold rounded-xl text-xs hover:bg-red-700 transition-colors shadow-xs"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
