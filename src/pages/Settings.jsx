import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import {
  getBusiness,
  getBusinessesByOwner,
  createBusiness,
  updateBusiness,
  deleteBusiness,
  createInvitation,
  getBusinessInvitations,
  deleteInvitation,
  removeSalesRep,
} from '../services/firestoreService';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import toast from 'react-hot-toast';

const Settings = () => {
  const { user } = useAuth();
  const [businesses, setBusinesses] = useState([]);
  const [selectedBusiness, setSelectedBusiness] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [vatRate, setVatRate] = useState(0.18);
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [emailAddress, setEmailAddress] = useState('');
  
  // Business creation
  const [showCreateBusiness, setShowCreateBusiness] = useState(false);
  const [newBusinessName, setNewBusinessName] = useState('');
  const [creatingBusiness, setCreatingBusiness] = useState(false);
  
  // Sales rep invitation
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [invitations, setInvitations] = useState([]);
  const [salesReps, setSalesReps] = useState([]);

  useEffect(() => {
    if (user) {
      if (user.role === 'admin') {
        loadAdminData();
      } else if (user.role === 'representative' && user.businessId) {
        loadSalesRepData();
      }
    }
  }, [user]);

  const loadAdminData = async () => {
    setLoading(true);
    try {
      const userBusinesses = await getBusinessesByOwner(user.uid);
      setBusinesses(userBusinesses);
      
      if (userBusinesses.length > 0 && !selectedBusiness) {
        setSelectedBusiness(userBusinesses[0]);
        loadBusinessDetails(userBusinesses[0].id);
      } else if (selectedBusiness) {
        loadBusinessDetails(selectedBusiness.id);
      }
    } catch (error) {
      toast.error('Failed to load businesses');
    } finally {
      setLoading(false);
    }
  };

  const loadSalesRepData = async () => {
    setLoading(true);
    try {
      const businessData = await getBusiness(user.businessId);
      if (businessData) {
        setSelectedBusiness(businessData);
        setVatRate(businessData.rraVatRate || 0.18);
      }
    } catch (error) {
      toast.error('Failed to load business data');
    } finally {
      setLoading(false);
    }
  };

  const loadBusinessDetails = async (businessId) => {
    try {
      const businessData = await getBusiness(businessId);
      if (businessData) {
        setSelectedBusiness(businessData);
        setVatRate(businessData.rraVatRate || 0.18);
        setEmailEnabled(businessData.emailEnabled || false);
        setEmailAddress(businessData.emailAddress || user?.email || '');
        
        // Load invitations
        const businessInvitations = await getBusinessInvitations(businessId);
        setInvitations(businessInvitations);
        
        // Load sales reps (you'd need to fetch user data for each salesRepId)
        // For now, just show the count
        setSalesReps(businessData.salesRepIds || []);
      }
    } catch (error) {
      toast.error('Failed to load business details');
    }
  };

  const handleCreateBusiness = async (e) => {
    e.preventDefault();
    if (!newBusinessName.trim()) {
      toast.error('Business name is required');
      return;
    }

    setCreatingBusiness(true);
    try {
      const businessId = await createBusiness({
        name: newBusinessName.trim(),
        ownerId: user.uid,
        rraVatRate: 0.18,
      });
      
      toast.success('Business created successfully');
      setNewBusinessName('');
      setShowCreateBusiness(false);
      await loadAdminData();
      
      // Select the newly created business
      const newBusiness = await getBusiness(businessId);
      setSelectedBusiness(newBusiness);
      loadBusinessDetails(businessId);
    } catch (error) {
      toast.error('Failed to create business');
    } finally {
      setCreatingBusiness(false);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    if (!selectedBusiness) return;

    setSaving(true);
    try {
      const updates = {
        rraVatRate: parseFloat(vatRate),
        emailEnabled: emailEnabled,
      };
      
      if (emailEnabled && emailAddress) {
        updates.emailAddress = emailAddress.trim();
      }
      
      await updateBusiness(selectedBusiness.id, updates);
      toast.success('Settings saved successfully');
      loadBusinessDetails(selectedBusiness.id);
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleInviteSalesRep = async (e) => {
    e.preventDefault();
    if (!inviteEmail.trim() || !selectedBusiness) {
      toast.error('Email is required');
      return;
    }

    setInviting(true);
    try {
      const { token } = await createInvitation(
        selectedBusiness.id,
        inviteEmail.trim(),
        user.uid
      );
      
      // Generate invitation URL
      const invitationUrl = `${window.location.origin}/login?invite=${token}`;
      
      toast.success('Invitation created! Share this link: ' + invitationUrl);
      setInviteEmail('');
      setShowInviteForm(false);
      await loadBusinessDetails(selectedBusiness.id);
      
      // Copy to clipboard
      navigator.clipboard.writeText(invitationUrl).then(() => {
        toast.success('Invitation link copied to clipboard');
      });
    } catch (error) {
      toast.error('Failed to create invitation');
    } finally {
      setInviting(false);
    }
  };

  const handleDeleteInvitation = async (invitationId) => {
    if (!confirm('Are you sure you want to delete this invitation?')) return;

    try {
      await deleteInvitation(invitationId);
      toast.success('Invitation deleted');
      await loadBusinessDetails(selectedBusiness.id);
    } catch (error) {
      toast.error('Failed to delete invitation');
    }
  };

  const handleDeleteBusiness = async (businessId) => {
    if (!confirm('Are you sure you want to delete this business? This action cannot be undone.')) return;

    try {
      await deleteBusiness(businessId);
      toast.success('Business deleted');
      await loadAdminData();
      if (businesses.length > 1) {
        setSelectedBusiness(null);
      }
    } catch (error) {
      toast.error('Failed to delete business');
    }
  };

  if (loading && !selectedBusiness) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-500"></div>
      </div>
    );
  }

  // Sales rep view (read-only mostly)
  if (user?.role === 'representative') {
    return (
      <div className="p-8">
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2 tracking-tight">Settings</h1>
          <p className="text-gray-500 dark:text-gray-400">View your business configuration</p>
        </div>

        {selectedBusiness && (
          <div className="max-w-2xl">
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Business Information</h2>
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Business Name</p>
                  <p className="text-xl font-semibold text-gray-900 dark:text-white">{selectedBusiness.name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">RRA VAT Rate</p>
                  <p className="text-lg text-gray-900 dark:text-white">
                    {(selectedBusiness.rraVatRate * 100).toFixed(0)}%
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Admin view
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="mb-10">
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2 tracking-tight">Settings</h1>
        <p className="text-gray-500 dark:text-gray-400">Manage your businesses and sales representatives</p>
      </div>

      {/* Business Selection */}
      {businesses.length > 0 && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Select Business
          </label>
          <select
            value={selectedBusiness?.id || ''}
            onChange={(e) => {
              const business = businesses.find(b => b.id === e.target.value);
              setSelectedBusiness(business);
              if (business) loadBusinessDetails(business.id);
            }}
            className="w-full max-w-md px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {businesses.map((business) => (
              <option key={business.id} value={business.id}>
                {business.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Create Business Button */}
      <div className="mb-6">
        <Button
          onClick={() => setShowCreateBusiness(!showCreateBusiness)}
          className="mb-4"
        >
          {showCreateBusiness ? 'Cancel' : '+ Create New Business'}
        </Button>

        {showCreateBusiness && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg mb-6 max-w-md">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Create New Business</h3>
            <form onSubmit={handleCreateBusiness} className="space-y-4">
              <Input
                label="Business Name"
                type="text"
                value={newBusinessName}
                onChange={(e) => setNewBusinessName(e.target.value)}
                placeholder="Enter business name"
                required
              />
              <Button type="submit" disabled={creatingBusiness}>
                {creatingBusiness ? 'Creating...' : 'Create Business'}
              </Button>
            </form>
          </div>
        )}
      </div>

      {/* Business Settings */}
      {selectedBusiness && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Business Settings */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Business Settings</h2>
              <button
                onClick={() => handleDeleteBusiness(selectedBusiness.id)}
                className="text-red-600 dark:text-red-400 hover:text-red-700 text-sm"
              >
                Delete
              </button>
            </div>
            
            <div className="mb-6 pb-6 border-b border-gray-200 dark:border-gray-700">
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Business Name</p>
              <p className="text-xl font-semibold text-gray-900 dark:text-white">{selectedBusiness.name}</p>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-6">
              <Input
                label="RRA VAT Rate"
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={vatRate}
                onChange={(e) => setVatRate(e.target.value)}
                placeholder="0.18 (for 18%)"
                required
              />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Enter the VAT rate as a decimal (e.g., 0.18 for 18%).
              </p>

              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <h3 className="text-md font-semibold text-gray-900 dark:text-white mb-4">Email Notifications</h3>
                
                <div className="space-y-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="emailEnabled"
                      checked={emailEnabled}
                      onChange={(e) => setEmailEnabled(e.target.checked)}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                    />
                    <label htmlFor="emailEnabled" className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                      Enable email notifications for sales reports
                    </label>
                  </div>

                  {emailEnabled && (
                    <Input
                      label="Email Address for Reports"
                      type="email"
                      value={emailAddress}
                      onChange={(e) => setEmailAddress(e.target.value)}
                      placeholder="admin@example.com"
                      required={emailEnabled}
                    />
                  )}

                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Weekly sales reports will be sent to this email address. Make sure email service is configured in Cloud Functions.
                  </p>
                </div>
              </div>

              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : 'Save Settings'}
              </Button>
            </form>
          </div>

          {/* Sales Representatives */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Sales Representatives</h2>
              <Button
                onClick={() => setShowInviteForm(!showInviteForm)}
                className="text-sm"
              >
                {showInviteForm ? 'Cancel' : '+ Invite'}
              </Button>
            </div>

            {showInviteForm && (
              <form onSubmit={handleInviteSalesRep} className="mb-6 pb-6 border-b border-gray-200 dark:border-gray-700 space-y-4">
                <Input
                  label="Email Address"
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="salesrep@example.com"
                  required
                />
                <Button type="submit" disabled={inviting} className="w-full">
                  {inviting ? 'Sending...' : 'Send Invitation'}
                </Button>
              </form>
            )}

            {/* Pending Invitations */}
            {invitations.filter(inv => inv.status === 'pending').length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Pending Invitations</h3>
                <div className="space-y-2">
                  {invitations
                    .filter(inv => inv.status === 'pending')
                    .map((invitation) => (
                      <div
                        key={invitation.id}
                        className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                      >
                        <span className="text-sm text-gray-900 dark:text-white">{invitation.email}</span>
                        <button
                          onClick={() => handleDeleteInvitation(invitation.id)}
                          className="text-red-600 dark:text-red-400 hover:text-red-700 text-sm"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Active Sales Reps */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Active Sales Representatives ({salesReps.length})
              </h3>
              {salesReps.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">No sales representatives yet</p>
              ) : (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {salesReps.length} sales representative(s) assigned to this business
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* No businesses message */}
      {businesses.length === 0 && !showCreateBusiness && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg max-w-md">
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            You don't have any businesses yet. Create your first business to get started.
          </p>
          <Button onClick={() => setShowCreateBusiness(true)}>
            Create Your First Business
          </Button>
        </div>
      )}
    </div>
  );
};

export default Settings;
