import { Building2, Users, Calendar, Edit, Trash, Eye, Plus, Search, Filter, MoreVertical, TrendingUp, Globe, Shield, Activity, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import moment from "moment/moment";
import { useState, useEffect } from "react";
import AddCompanyDialog from "@/components/superadmin-dialogs/AddCompanyDialog";
import { companyHttp } from "@/http/companyHttp";
import { toast } from "sonner";

export default function CompanyManagementSection({ 
  companies, 
  setCompanies,
  handleCompanyAction,
  getStatusBadgeColor 
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [selectedCompanies, setSelectedCompanies] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [dialogMode, setDialogMode] = useState('add'); // 'add' or 'view'
  const [selectedCompanyData, setSelectedCompanyData] = useState(null);
  const [errors, setErrors] = useState({});
  const [viewLoadingCompanies, setViewLoadingCompanies] = useState(new Set());
  const [editLoadingCompanies, setEditLoadingCompanies] = useState(new Set());

  // Load companies from API on component mount
  useEffect(() => {
    loadCompanies();
  }, []);

  const loadCompanies = async () => {
    try {
      const response = await companyHttp.getAllCompanies();
      if (response.success) {
        setCompanies(response.data);
      }
    } catch (error) {
      console.error('Error loading companies:', error);
      toast.error('Failed to load companies');
    }
  };

  const filteredCompanies = companies.filter(company => {
    const matchesSearch = company.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         company.adminEmail.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || company.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const sortedCompanies = [...filteredCompanies].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'users':
        return b.userCount - a.userCount;
      case 'date':
        return new Date(b.createdAt) - new Date(a.createdAt);
      default:
        return 0;
    }
  });

  const getCompanyStats = () => {
    const total = companies.length;
    const active = companies.filter(c => c.status === 'active').length;
    const totalUsers = companies.reduce((sum, c) => sum + c.userCount, 0);
    return { total, active, totalUsers };
  };

  const handleSelectCompany = (companyId, checked) => {
    if (checked) {
      setSelectedCompanies([...selectedCompanies, companyId]);
    } else {
      setSelectedCompanies(selectedCompanies.filter(id => id !== companyId));
    }
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedCompanies(sortedCompanies.map(c => c._id));
    } else {
      setSelectedCompanies([]);
    }
  };

  const clearApiError = () => {
    setApiError(null);
  };

  const handleAddCompany = async (companyData) => {
    setIsLoading(true);
    setApiError(null); // Clear previous errors
    try {
      let response;
      
      if (dialogMode === 'edit' && selectedCompanyData?._id) {
        // Update existing company
        response = await companyHttp.updateCompany(selectedCompanyData._id, companyData);
        
        if (response.success) {
          // Update the company in the companies list
          setCompanies(prevCompanies => 
            prevCompanies.map(company => 
              company._id === selectedCompanyData._id 
                ? { 
                    ...company, 
                    name: companyData.name,
                    userCount: response.data.company.userCount || company.userCount
                  }
                : company
            )
          );
          
          // Show success message
          toast.success('Company updated successfully');
          
          // Show email errors if any
          if (response.data.emailErrors) {
            toast.error(`Some emails failed to send. Check console for details.`);
            console.warn('Email errors:', response.data.emailErrors);
          }
          
          closeDialog();
        } else {
          toast.error('Failed to update company');
          setApiError(response.message || 'Failed to update company');
        }
      } else {
        // Create new company
        response = await companyHttp.createCompany(companyData);
        
        if (response.success) {
          // Add the new company to the companies list immediately
          const newCompany = response.data.company;
          
          // Format the company data to match the expected structure
          const formattedCompany = {
            _id: newCompany._id,
            name: newCompany.name,
            adminEmail: newCompany.adminEmail,
            userCount: newCompany.userCount,
            status: newCompany.status,
            createdAt: newCompany.createdAt
          };
          
          setCompanies(prevCompanies => [formattedCompany, ...prevCompanies]);
          
          // Show success message
          toast.success('Company added successfully');
          
          // Close the dialog
          closeDialog();
          
          // Show email errors if any
          if (response.data.emailErrors) {
            toast.error(`Some emails failed to send. Check console for details.`);
            console.warn('Email errors:', response.data.emailErrors);
          }
        } else {
          toast.error('Failed to create company');
          setApiError(response.message || 'Failed to create company');
        }
      }
    } catch (error) {
      console.error('Error handling company:', error);
      
      // Extract specific error message from API response
      let errorMessage = dialogMode === 'edit' ? 'Failed to update company. Please try again.' : 'Failed to create company. Please try again.';
      
      if (error.response?.data?.message) {
        // Backend validation error (e.g., "Company with this name already exists")
        errorMessage = error.response.data.message;
        setApiError(errorMessage);
      } else if (error.message) {
        // Network or other error
        errorMessage = error.message;
        setApiError(errorMessage);
      }
      
              toast.error('Failed to delete company');
    } finally {
      setIsLoading(false);
    }
  };

  const openAddDialog = () => {
    setDialogMode('add');
    setSelectedCompanyData(null);
    setIsAddDialogOpen(true);
  };

  const openViewDialog = async (companyId) => {
    try {
      // Set loading state for this specific company
      setViewLoadingCompanies(prev => new Set(prev).add(companyId));
      
      // Find the company data from the list
      const company = companies.find(c => c._id === companyId);
      if (company) {
        // Fetch complete company details from API
        const response = await companyHttp.getCompanyById(companyId);
        if (response.success) {
          const fullCompanyData = response.data;
          
          // Transform the data structure to match what AddCompanyDialog expects
          const transformedData = {
            _id: fullCompanyData._id, // Keep the company ID for editing
            name: fullCompanyData.name,
            house_name_number: fullCompanyData.house_name_number,
            street_road: fullCompanyData.street_road,
            city: fullCompanyData.city,
            country: fullCompanyData.country,
            post_code: fullCompanyData.post_code,
            users: []
          };
          
          // Transform company admins
          if (fullCompanyData.companyAdmins && fullCompanyData.companyAdmins.length > 0) {
            fullCompanyData.companyAdmins.forEach((admin, index) => {
              transformedData.users.push({
                id: index + 1,
                firstName: admin.firstName || '',
                lastName: admin.lastName || '',
                email: admin.email || '',
                phone: admin.phone || '',
                jobTitle: admin.jobTitle || '',
                role: 'company_admin'
              });
            });
          }
          
          // Transform landlords
          if (fullCompanyData.landlords && fullCompanyData.landlords.length > 0) {
            fullCompanyData.landlords.forEach((landlord, index) => {
              transformedData.users.push({
                id: transformedData.users.length + index + 1,
                firstName: landlord.firstName || '',
                lastName: landlord.lastName || '',
                email: landlord.email || '',
                phone: landlord.phone || '',
                jobTitle: landlord.jobTitle || '',
                role: 'landlord'
              });
            });
          }
          
          // If no users found, add default empty users
          if (transformedData.users.length === 0) {
            transformedData.users = [
              { id: 1, firstName: '', lastName: '', email: '', phone: '', jobTitle: '', role: 'company_admin' },
              { id: 2, firstName: '', lastName: '', email: '', phone: '', jobTitle: '', role: 'landlord' }
            ];
          }
          
          setSelectedCompanyData(transformedData);
          setDialogMode('view');
          setIsAddDialogOpen(true);
        } else {
          toast.error('Failed to load company details');
        }
      }
    } catch (error) {
      console.error('Error loading company details:', error);
      toast.error('Failed to load company details');
    } finally {
      // Remove loading state for this specific company
      setViewLoadingCompanies(prev => {
        const newSet = new Set(prev);
        newSet.delete(companyId);
        return newSet;
      });
    }
  };

  const openEditDialog = async (companyId) => {
    try {
      // Set loading state for this specific company
      setEditLoadingCompanies(prev => new Set(prev).add(companyId));
      
      // Find the company data from the list
      const company = companies.find(c => c._id === companyId);
      if (company) {
        // Fetch complete company details from API
        const response = await companyHttp.getCompanyById(companyId);
        if (response.success) {
          const fullCompanyData = response.data;
          
          // Transform the data structure to match what AddCompanyDialog expects
          const transformedData = {
            _id: fullCompanyData._id, // Keep the company ID for editing
            name: fullCompanyData.name,
            house_name_number: fullCompanyData.house_name_number,
            street_road: fullCompanyData.street_road,
            city: fullCompanyData.city,
            country: fullCompanyData.country,
            post_code: fullCompanyData.post_code,
            users: []
          };
          
          // Transform company admins
          if (fullCompanyData.companyAdmins && fullCompanyData.companyAdmins.length > 0) {
            fullCompanyData.companyAdmins.forEach((admin, index) => {
              transformedData.users.push({
                id: index + 1,
                firstName: admin.firstName || '',
                lastName: admin.lastName || '',
                email: admin.email || '',
                phone: admin.phone || '',
                jobTitle: admin.jobTitle || '',
                role: 'company_admin'
              });
            });
          }
          
          // Transform landlords
          if (fullCompanyData.landlords && fullCompanyData.landlords.length > 0) {
            fullCompanyData.landlords.forEach((landlord, index) => {
              transformedData.users.push({
                id: transformedData.users.length + index + 1,
                firstName: landlord.firstName || '',
                lastName: landlord.lastName || '',
                email: landlord.email || '',
                phone: landlord.phone || '',
                jobTitle: landlord.jobTitle || '',
                role: 'landlord'
              });
            });
          }
          
          // If no users found, add default empty users
          if (transformedData.users.length === 0) {
            transformedData.users = [
              { id: 1, firstName: '', lastName: '', email: '', phone: '', jobTitle: '', role: 'company_admin' },
              { id: 2, firstName: '', lastName: '', email: '', phone: '', jobTitle: '', role: 'landlord' }
            ];
          }
          
          setSelectedCompanyData(transformedData);
          setDialogMode('edit');
          setIsAddDialogOpen(true);
        } else {
          toast.error('Failed to load company details');
        }
      }
    } catch (error) {
      console.error('Error loading company details:', error);
      toast.error('Failed to load company details');
    } finally {
      // Remove loading state for this specific company
      setEditLoadingCompanies(prev => {
        const newSet = new Set(prev);
        newSet.delete(companyId);
        return newSet;
      });
    }
  };

  const closeDialog = () => {
    setIsAddDialogOpen(false);
    setDialogMode('add');
    setSelectedCompanyData(null);
    setErrors({});
    if (clearApiError) {
      clearApiError();
    }
  };

  const stats = getCompanyStats();

  return (
    <div className="space-y-6">
      {/* Enhanced Header with Stats */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-2xl p-4 sm:p-6 border border-purple-100">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 sm:gap-6">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Company Management</h2>
            <p className="text-sm sm:text-base text-gray-600">Manage and monitor all company accounts in your system</p>
          </div>
          <div className="flex justify-end w-full">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 w-full sm:w-auto">
              <div className="bg-white rounded-xl p-3 sm:p-4 border border-purple-200 shadow-sm w-full">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm text-gray-500">Total Companies</p>
                    <p className="text-lg sm:text-2xl font-bold text-gray-900">{stats.total}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white rounded-xl p-3 sm:p-4 border border-blue-200 shadow-sm w-full">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <Users className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm text-gray-500">Total Users</p>
                    <p className="text-lg sm:text-2xl font-bold text-gray-900">{stats.totalUsers}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Companies Cards - Exact match to residents layout */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 pt-4 sm:pt-6 px-4 sm:px-6">
        {/* Header with checkbox and Add Company button */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-0 mb-4 sm:mb-6 pb-4 border-b border-gray-200">
          <div className="flex items-center gap-3 sm:gap-4">
            <input
              type="checkbox"
              checked={selectedCompanies.length === sortedCompanies.length && sortedCompanies.length > 0}
              onChange={(e) => handleSelectAll(e.target.checked)}
              className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
            />
            <span className="text-sm text-gray-600">
              {selectedCompanies.length > 0 ? `${selectedCompanies.length} selected` : 'Select all companies'}
            </span>
            
            {/* Bulk Actions - Show when companies are selected */}
            {selectedCompanies.length > 0 && (
              <div className="flex items-center gap-4 ml-4 pl-4 border-l border-gray-300">
                <button
                  onClick={() => handleCompanyAction('delete', selectedCompanies)}
                  className="text-red-600 hover:text-red-800 text-sm font-medium transition-colors duration-200 flex items-center gap-2"
                >
                  <Trash className="w-4 h-4" />
                  Delete Selected
                </button>
                <button
                  onClick={() => handleCompanyAction('edit', selectedCompanies)}
                  className="text-green-600 hover:text-green-800 text-sm font-medium transition-colors duration-200 flex items-center gap-2"
                >
                  <Edit className="w-4 h-4" />
                  Edit Selected
                </button>
              </div>
            )}
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 w-full sm:w-auto">
            {/* Search Box */}
            <div className="relative w-full sm:w-auto">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search companies..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-48 pl-12 pr-4 py-2.5 border border-gray-200 rounded-full focus:ring-2 focus:ring-purple-500 focus:border-purple-500 focus:outline-none transition-all duration-200 bg-gray-50 focus:bg-white shadow-sm text-gray-700"
              />
            </div>
            
            {/* Enhanced Add Company Button */}
            <Button 
              onClick={openAddDialog}
              className="w-full sm:w-48 bg-gradient-to-r from-purple-700 to-purple-800 hover:from-purple-800 hover:to-purple-900 text-white py-2.5 rounded-full transition-all duration-300 transform hover:scale-105 shadow-xl hover:shadow-2xl border-0 font-semibold text-sm h-10"
            >
              <Plus className="w-5 h-5 mr-2" />
              Add Company
            </Button>
          </div>
        </div>

        {/* Companies Cards */}
        <div className="flex flex-col gap-4">
          {sortedCompanies.length === 0 ? (
            <div className="text-center text-gray-500 py-16">
              <Building2 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No companies found</h3>
              <p className="text-gray-600 mb-4 max-w-md mx-auto">
                {searchTerm || filterStatus !== 'all' 
                  ? 'Try adjusting your search criteria or filters to find what you\'re looking for.'
                  : 'Get started by creating your first company account to manage users and permissions.'
                }
              </p>
              <Button className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 rounded-xl">
                <Plus className="w-4 h-4 mr-2" />
                Create Company
              </Button>
            </div>
          ) : (
            sortedCompanies.map((company, index) => {
              const dateObj = new Date(company.createdAt);
              const formattedDate = !isNaN(dateObj) ? `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${dateObj.getFullYear()}` : company.createdAt;
              
              return (
                <div
                  key={company._id}
                  className="flex flex-col sm:flex-row bg-purple-50 border-purple-200 border rounded-lg shadow-sm p-3 sm:p-4 sm:px-6 sm:py-4 w-full items-stretch gap-6 sm:gap-0 cursor-pointer hover:shadow-md transition-all duration-200"
                >
                   {/* Left: Company Info & Date - Fixed Width */}
                   <div className="flex flex-col justify-center w-full sm:w-1/5 sm:pr-6">
                     <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                       <input
                         type="checkbox"
                         checked={selectedCompanies.includes(company._id)}
                         onChange={(e) => handleSelectCompany(company._id, e.target.checked)}
                         className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                       />
                       <span className="text-xs text-gray-500">Company</span>
                     </div>
                     <div className="flex flex-col">
                       <span className="font-semibold text-base sm:text-lg text-purple-900 break-words">
                         {company.name}
                       </span>
                       <span className="text-xs sm:text-sm text-gray-600 flex items-center gap-1 mt-1">
                         <Globe className="w-3 h-3" />
                         {company.adminEmail}
                       </span>
                     </div>
                   </div>

                   {/* Vertical Divider Line */}
                   <div className="hidden sm:block w-px bg-purple-200 mx-4" />

                                       {/* Center: Users & Date - Fixed Width */}
                    <div className="flex flex-col justify-end items-center w-full sm:w-3/5">
                      <div className="flex items-center gap-4 sm:gap-6">
                        <div className="flex flex-col items-center">
                          <div className="flex items-center gap-1">
                            <Users className="w-4 h-4 sm:w-5 sm:h-5 text-purple-700" />
                            <span className="font-semibold text-base sm:text-lg text-purple-700">{company.userCount}</span>
                          </div>
                          <span className="text-xs text-gray-500 mt-1">Users</span>
                        </div>
                        <div className="flex flex-col items-center">
                          <div className="flex items-center gap-1">
                            <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-purple-700" />
                            <span className="font-semibold text-base sm:text-lg text-purple-700">{formattedDate}</span>
                          </div>
                          <span className="text-xs text-gray-500 mt-1">Created</span>
                        </div>
                      </div>
                    </div>

                    {/* Vertical Divider Line */}
                    <div className="hidden sm:block w-px bg-purple-200 mx-4" />

                    {/* Right: Actions - Fixed Width */}
                    <div className="flex flex-col justify-center items-center sm:items-center w-full sm:w-1/5">
                     <div className="flex flex-col items-center w-full">
                       <div className="flex flex-col items-center gap-1">
                         <span className="text-xs text-gray-500 font-medium mb-0.5">Actions</span>
                         <div className="flex flex-row gap-1 w-full justify-center">
                           <button
                             onClick={() => openViewDialog(company._id)}
                             disabled={viewLoadingCompanies.has(company._id)}
                             className="flex items-center justify-center gap-1 text-blue-600 hover:text-blue-800 text-sm transition-all duration-200 hover:bg-blue-50 px-2 py-1.5 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                             title="View company details"
                           >
                             {viewLoadingCompanies.has(company._id) ? (
                               <div className="w-3 h-3 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                             ) : (
                               <Eye className="w-3 h-3" />
                             )}
                             <span>{viewLoadingCompanies.has(company._id) ? 'Loading...' : 'View'}</span>
                           </button>
                           <button
                             onClick={() => openEditDialog(company._id)}
                             disabled={editLoadingCompanies.has(company._id)}
                             className="flex items-center justify-center gap-1 text-green-600 hover:text-green-800 text-sm transition-all duration-200 hover:bg-green-50 px-2 py-1.5 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                             title="Edit company"
                           >
                             {editLoadingCompanies.has(company._id) ? (
                               <div className="w-3 h-3 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                             ) : (
                               <Edit className="w-3 h-3" />
                             )}
                             <span>{editLoadingCompanies.has(company._id) ? 'Loading...' : 'Edit'}</span>
                           </button>
                           <button
                             onClick={() => handleCompanyAction('delete', company._id)}
                             className="flex items-center justify-center gap-1 text-red-600 hover:text-red-800 text-sm transition-all duration-200 hover:bg-red-50 px-2 py-1.5 rounded-lg"
                             title="Delete company"
                           >
                             <Trash className="w-4 h-4" />
                             <span>Delete</span>
                           </button>
                         </div>
                       </div>
                     </div>
                   </div>
                </div>
              );
            })
          )}
        </div>
        
        {/* Table Footer - Integrated within the same table */}
        {sortedCompanies.length > 0 && (
          <div className="border-t border-gray-200 px-4 sm:px-6 py-4 mt-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-0">
              {/* Left side - Items per page selector and results info */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">Show:</span>
                  <div className="relative">
                    <select
                      value={itemsPerPage}
                      onChange={(e) => setItemsPerPage(Number(e.target.value))}
                      className="px-2 py-1 pr-8 text-sm border border-gray-300 rounded-md bg-white focus:ring-2 focus:ring-purple-500 focus:border-purple-500 appearance-none"
                    >
                      <option value={10}>10</option>
                      <option value={20}>20</option>
                      <option value={30}>30</option>
                      <option value={40}>40</option>
                      <option value={50}>50</option>
                    </select>
                    <ChevronDown className="w-3 h-3 text-gray-900 absolute right-2 top-1/2 transform -translate-y-1/2 pointer-events-none" strokeWidth={2} />
                  </div>
                  <span className="text-sm text-gray-600">per page</span>
                </div>
                <div className="text-sm text-gray-600">
                  Showing {sortedCompanies.length} of {companies.length} companies
                  {searchTerm && ` matching "${searchTerm}"`}
                  {filterStatus !== 'all' && ` with status "${filterStatus}"`}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Company Dialog */}
      <AddCompanyDialog
        isOpen={isAddDialogOpen}
        onClose={closeDialog}
        onSubmit={handleAddCompany}
        isLoading={isLoading}
        apiError={apiError}
        onClearApiError={clearApiError}
        mode={dialogMode}
        companyData={selectedCompanyData}
      />
    </div>
  );
}
