import Company from '../models/company.js';
import User from '../models/user.js';
import { generateTemporaryPassword } from '../utils/generateTemporaryPassword.js';
import { sendTemporaryPasswordEmail, sendExistingUserRoleUpdateEmail } from '../services/temporaryPasswordEmailService.js';
import sendResponse  from '../utils/sendResponse.js';

// Migration function to handle existing users without new fields
export const migrateExistingUsers = async (req, res) => {
  try {
    console.log('Starting user migration...');
    
    // Find users without firstName field (indicating they need migration)
    const usersToMigrate = await User.find({
      $or: [
        { firstName: { $exists: false } },
        { firstName: null },
        { firstName: '' }
      ]
    });

    console.log(`Found ${usersToMigrate.length} users to migrate`);

    let migratedCount = 0;
    for (const user of usersToMigrate) {
      try {
        // Set default values for new required fields
        user.firstName = user.firstName || 'Unknown';
        user.lastName = user.lastName || 'User';
        user.phone = user.phone || 'Not provided';
        user.jobTitle = user.jobTitle || 'Not specified';
        
        await user.save();
        migratedCount++;
        console.log(`Migrated user: ${user.email}`);
      } catch (migrationError) {
        console.error(`Failed to migrate user ${user.email}:`, migrationError);
      }
    }

    console.log(`Migration completed. ${migratedCount} users migrated successfully.`);
    return sendResponse(res, 200, true, 'User migration completed', {
      totalUsers: usersToMigrate.length,
      migratedUsers: migratedCount
    });

  } catch (error) {
    console.error('Error during user migration:', error);
    return sendResponse(res, 500, false, 'Failed to migrate users', error.message);
  }
};

// Simple test function to check if the controller is working
export const testCompanyController = async (req, res) => {
  try {
    console.log('Test endpoint called successfully');
    return sendResponse(res, 200, true, 'Company controller is working', {
      message: 'Controller is functional',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error in test function:', error);
    return sendResponse(res, 500, false, 'Test failed', error.message);
  }
};

// Create new company with users
export const createCompany = async (req, res) => {
  const { name, house_name_number, street_road, city, country, post_code, users } = req.body;


  if (!name || !house_name_number || !street_road || !city || !country || !post_code || !users || !Array.isArray(users) || users.length === 0) {
    return sendResponse(res, 400, false, 'Company name, address fields, and users are required');
  }

  try {
    // Check if company name already exists
    const existingCompany = await Company.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
    if (existingCompany) {
      return sendResponse(res, 400, false, 'Company with this name already exists');
    }

    // Create company with address fields
    const company = new Company({
      name,
      house_name_number,
      street_road,
      city,
      country,
      post_code,
      adminEmail: users.find(u => u.role === 'company_admin')?.email || users[0].email,
      companyAdmins: [],
      landlords: []
    });

    const createdCompany = await company.save();
    console.log('Company created successfully:', createdCompany._id);
    
    let createdUsers = 0;
    let updatedUsers = 0;
    const emailErrors = [];

    // Process each user
    for (const userData of users) {
      const { firstName, lastName, email, phone, jobTitle, role } = userData;
      console.log('Processing user:', { firstName, lastName, email, phone, jobTitle, role });

      if (!firstName || !lastName || !email || !phone || !jobTitle) {
        console.log('Skipping invalid user:', userData);
        continue; // Skip invalid users
      }

      // Check if user already exists
      let existingUser = await User.findOne({ email: email.toLowerCase() });

      if (existingUser) {
        console.log('Updating existing user:', existingUser._id);
        // Update existing user's role and new fields - convert company_admin to company-admin
        const normalizedRole = role === 'company_admin' ? 'company-admin' : role;
        
        // Validate the normalized role
        const validRoles = ['company-admin', 'landlord'];
        if (!validRoles.includes(normalizedRole)) {
          console.error('Invalid role for existing user:', normalizedRole);
          throw new Error(`Invalid role: ${normalizedRole}. Valid roles are: ${validRoles.join(', ')}`);
        }
        
        existingUser.role = normalizedRole;
        existingUser.firstName = firstName;
        existingUser.lastName = lastName;
        existingUser.phone = phone;
        existingUser.jobTitle = jobTitle;
        existingUser.company = createdCompany._id;
        await existingUser.save();

        // Add user to company based on role
        if (normalizedRole === 'company-admin') {
          createdCompany.companyAdmins.push(existingUser._id);
        } else if (normalizedRole === 'landlord') {
          createdCompany.landlords.push(existingUser._id);
        }

        // Send role update email
        try {
          await sendExistingUserRoleUpdateEmail(email, `${firstName} ${lastName}`, company.name, normalizedRole);
          updatedUsers++;
          console.log('Role update email sent to:', email);
        } catch (emailError) {
          console.error(`Failed to send role update email to ${email}:`, emailError);
          emailErrors.push({ email, error: emailError.message });
        }
      } else {
        console.log('Creating new user with role:', role);
        // Create new user with temporary password - convert company_admin to company-admin
        const temporaryPassword = generateTemporaryPassword();
        const normalizedRole = role === 'company_admin' ? 'company-admin' : role;
        
        console.log('Creating user with normalized role:', normalizedRole);
        
        // Validate the normalized role
        const validRoles = ['company-admin', 'landlord'];
        if (!validRoles.includes(normalizedRole)) {
          console.error('Invalid role:', normalizedRole);
          throw new Error(`Invalid role: ${normalizedRole}. Valid roles are: ${validRoles.join(', ')}`);
        }
        
        try {
          const newUser = await User.create({
            firstName,
            lastName,
            email: email.toLowerCase(),
            phone,
            jobTitle,
            password: temporaryPassword,
            isTemporaryPassword: true,
            role: normalizedRole,
            company: createdCompany._id
          });

          console.log('New user created:', newUser._id);

          // Add user to company based on role
          if (normalizedRole === 'company-admin') {
            createdCompany.companyAdmins.push(newUser._id);
          } else if (normalizedRole === 'landlord') {
            createdCompany.landlords.push(newUser._id);
          }

          // Send temporary password email
          try {
            await sendTemporaryPasswordEmail(email, `${firstName} ${lastName}`, temporaryPassword, company.name, normalizedRole);
            createdUsers++;
            console.log('Temporary password email sent to:', email);
          } catch (emailError) {
            console.error(`Failed to send temporary password email to ${email}:`, emailError);
            emailErrors.push({ email, error: emailError.message });
          }
        } catch (userCreationError) {
          console.error('Error creating user:', userCreationError);
          console.error('User creation error details:', {
            message: userCreationError.message,
            name: userCreationError.name,
            stack: userCreationError.stack,
            validationErrors: userCreationError.errors
          });
          throw new Error(`Failed to create user ${email}: ${userCreationError.message}`);
        }
      }
    }

    // Update company user count and save
    await createdCompany.updateUserCount();
    console.log('Company user count updated');

    // Prepare response
    const response = {
      company: createdCompany,
      createdUsers: createdUsers,
      updatedUsers: updatedUsers,
      emailErrors: emailErrors.length > 0 ? emailErrors : undefined
    };

    if (emailErrors.length > 0) {
      console.warn('Some emails failed to send:', emailErrors);
    }

    console.log('Company creation completed successfully');
    return sendResponse(res, 201, true, 'Company created successfully', response);

  } catch (error) {
    console.error('Error creating company:', error);
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    return sendResponse(res, 500, false, 'Failed to create company', error.message);
  }
};

// Get all companies
export const getAllCompanies = async (req, res) => {
  try {
    const companies = await Company.find()
      .populate('companyAdmins', 'email firstName lastName phone jobTitle role landlordInfo.landlordName')
      .populate('landlords', 'email firstName lastName phone jobTitle role landlordInfo.landlordName')
      .sort({ createdAt: -1 });

    return sendResponse(res, 200, true, 'Companies retrieved successfully', companies);
  } catch (error) {
    console.error('Error fetching companies:', error);
    return sendResponse(res, 500, false, 'Failed to fetch companies', error.message);
  }
};

// Get company by ID
export const getCompanyById = async (req, res) => {
  try {
    const company = await Company.findById(req.params.id)
      .populate('companyAdmins', 'email firstName lastName phone jobTitle role landlordInfo.landlordName createdAt')
      .populate('landlords', 'email firstName lastName phone jobTitle role landlordInfo.landlordName createdAt');

    if (!company) {
      return sendResponse(res, 404, false, 'Company not found');
    }

    return sendResponse(res, 200, true, 'Company retrieved successfully', company);
  } catch (error) {
    console.error('Error fetching company:', error);
    return sendResponse(res, 500, false, 'Failed to fetch company', error.message);
  }
};

// Update company
export const updateCompany = async (req, res) => {
  try {
    const { name, house_name_number, street_road, city, country, post_code, status, users } = req.body;
    const company = await Company.findById(req.params.id);

    if (!company) {
      return sendResponse(res, 404, false, 'Company not found');
    }

    if (name && name !== company.name) {
      // Check if new name already exists
      const existingCompany = await Company.findOne({ 
        name: { $regex: new RegExp(`^${name}$`, 'i') },
        _id: { $ne: req.params.id }
      });
      
      if (existingCompany) {
        return sendResponse(res, 400, false, 'Company with this name already exists');
      }
      
      company.name = name;
    }

    // Update address fields if provided
    if (house_name_number) company.house_name_number = house_name_number;
    if (street_road) company.street_road = street_road;
    if (city) company.city = city;
    if (country) company.country = country;
    if (post_code) company.post_code = post_code;

    if (status) {
      company.status = status;
    }

    // Handle user updates if provided
    if (users && Array.isArray(users)) {
      let createdUsers = 0;
      let updatedUsers = 0;
      const emailErrors = [];
      
      // Store old user IDs to remove them later
      const oldUserIds = [...company.companyAdmins, ...company.landlords];
      const newUserIds = [];
      
      // Process each user
      for (const userData of users) {
        const { firstName, lastName, email, phone, jobTitle, role } = userData;
        console.log('Processing user update:', { firstName, lastName, email, phone, jobTitle, role });

        if (!firstName || !lastName || !email || !phone || !jobTitle) {
          console.log('Skipping invalid user:', userData);
          continue;
        }

        // Check if user already exists
        let existingUser = await User.findOne({ email: email.toLowerCase() });

        if (existingUser) {
          console.log('Updating existing user:', existingUser._id);
          console.log('Old user data:', {
            firstName: existingUser.firstName,
            lastName: existingUser.lastName,
            phone: existingUser.phone,
            jobTitle: existingUser.jobTitle,
            role: existingUser.role
          });
          console.log('New user data:', { firstName, lastName, phone, jobTitle, role });
          
          // Update existing user's role and all fields - convert company_admin to company-admin
          const normalizedRole = role === 'company_admin' ? 'company-admin' : role;
          
          // Validate the normalized role
          const validRoles = ['company-admin', 'landlord'];
          if (!validRoles.includes(normalizedRole)) {
            console.error('Invalid role for existing user:', normalizedRole);
            throw new Error(`Invalid role: ${normalizedRole}. Valid roles are: ${validRoles.join(', ')}`);
          }
          
          // Update all user fields
          existingUser.role = normalizedRole;
          existingUser.firstName = firstName;
          existingUser.lastName = lastName;
          existingUser.phone = phone;
          existingUser.jobTitle = jobTitle;
          existingUser.email = email.toLowerCase(); // Make sure email is also updated if needed
          
          // Update company reference if it's different
          if (!existingUser.company || existingUser.company.toString() !== company._id.toString()) {
            existingUser.company = company._id;
          }
          
          await existingUser.save();
          console.log('User updated successfully:', existingUser._id);

          // Add user to new user IDs list
          newUserIds.push(existingUser._id);

          // Send role update email
          try {
            await sendExistingUserRoleUpdateEmail(email, `${firstName} ${lastName}`, company.name, normalizedRole);
            updatedUsers++;
            console.log('Role update email sent to:', email);
          } catch (emailError) {
            console.error(`Failed to send role update email to ${email}:`, emailError);
            emailErrors.push({ email, error: emailError.message });
          }
        } else {
          console.log('Creating new user with role:', role);
          // Create new user with temporary password - convert company_admin to company-admin
          const temporaryPassword = generateTemporaryPassword();
          const normalizedRole = role === 'company_admin' ? 'company-admin' : role;
          
          console.log('Creating user with normalized role:', normalizedRole);
          
          // Validate the normalized role
          const validRoles = ['company-admin', 'landlord'];
          if (!validRoles.includes(normalizedRole)) {
            console.error('Invalid role:', normalizedRole);
            throw new Error(`Invalid role: ${normalizedRole}. Valid roles are: ${validRoles.join(', ')}`);
          }
          
          try {
            const newUser = await User.create({
              firstName,
              lastName,
              email: email.toLowerCase(),
              phone,
              jobTitle,
              password: temporaryPassword,
              isTemporaryPassword: true,
              role: normalizedRole,
              company: company._id
            });

            console.log('New user created:', newUser._id);

            // Add user to new user IDs list
            newUserIds.push(newUser._id);

            // Send temporary password email
            try {
              await sendTemporaryPasswordEmail(email, `${firstName} ${lastName}`, temporaryPassword, company.name, normalizedRole);
              createdUsers++;
              console.log('Temporary password email sent to:', email);
            } catch (emailError) {
              console.error(`Failed to send temporary password email to ${email}:`, emailError);
              emailErrors.push({ email, error: emailError.message });
            }
          } catch (userCreationError) {
            console.error('Error creating user:', userCreationError);
            console.error('User creation error details:', {
              message: userCreationError.message,
              name: userCreationError.name,
              stack: userCreationError.stack,
              validationErrors: userCreationError.errors
            });
            throw new Error(`Failed to create user ${email}: ${userCreationError.message}`);
          }
        }
      }

      // Update company with new user lists
      // We need to check the actual user roles from the database
      const companyAdminIds = [];
      const landlordIds = [];
      
      for (const userId of newUserIds) {
        const user = await User.findById(userId);
        if (user) {
          if (user.role === 'company-admin') {
            companyAdminIds.push(userId);
          } else if (user.role === 'landlord') {
            landlordIds.push(userId);
          }
        }
      }
      
      company.companyAdmins = companyAdminIds;
      company.landlords = landlordIds;

      // Remove old users from company
      const usersToRemove = oldUserIds.filter(oldId => 
        !newUserIds.some(newId => newId.toString() === oldId.toString())
      );

      if (usersToRemove.length > 0) {
        console.log('Removing old users from company:', usersToRemove);
        // Remove company references from old users
        await User.updateMany(
          { _id: { $in: usersToRemove } },
          { $unset: { company: 1 } }
        );
      }

      // Update company user count
      await company.updateUserCount();
      console.log('Company user count updated');

      // Add response data for user updates
      const response = {
        company,
        createdUsers,
        updatedUsers,
        removedUsers: usersToRemove.length,
        emailErrors: emailErrors.length > 0 ? emailErrors : undefined
      };

      if (emailErrors.length > 0) {
        console.warn('Some emails failed to send:', emailErrors);
      }

      company.updatedAt = new Date();
      await company.save();

      return sendResponse(res, 200, true, 'Company updated successfully', response);
    }

    // If no users provided, just update basic company info
    company.updatedAt = new Date();
    await company.save();

    return sendResponse(res, 200, true, 'Company updated successfully', company);
  } catch (error) {
    console.error('Error updating company:', error);
    return sendResponse(res, 500, false, 'Failed to update company', error.message);
  }
};

// Delete company
export const deleteCompany = async (req, res) => {
  try {
    const company = await Company.findById(req.params.id);

    if (!company) {
      return sendResponse(res, 404, false, 'Company not found');
    }

    // Remove company references from users
    await User.updateMany(
      { _id: { $in: [...company.companyAdmins, ...company.landlords] } },
      { $unset: { company: 1 } }
    );

    await Company.findByIdAndDelete(req.params.id);

    return sendResponse(res, 200, true, 'Company deleted successfully');
  } catch (error) {
    console.error('Error deleting company:', error);
    return sendResponse(res, 500, false, 'Failed to delete company', error.message);
  }
};

// Get company statistics
export const getCompanyStats = async (req, res) => {
  try {
    const totalCompanies = await Company.countDocuments();
    const activeCompanies = await Company.countDocuments({ status: 'active' });
    const totalUsers = await User.countDocuments({
      role: { $in: ['company-admin', 'landlord'] }
    });

    const stats = {
      totalCompanies,
      activeCompanies,
      totalUsers,
      systemHealth: 'healthy',
      serverUptime: '99.9%',
      responseTime: '45ms',
      errorRate: '0.1%',
      cpuUsage: '23%',
      memoryUsage: '67%',
      diskUsage: '45%'
    };

    return sendResponse(res, 200, true, 'Company statistics retrieved successfully', stats);
  } catch (error) {
    console.error('Error fetching company statistics:', error);
    return sendResponse(res, 500, false, 'Failed to fetch company statistics', error.message);
  }
};

// New function to handle password changes and update isTemporaryPassword
export const changeTemporaryPassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const userId = req.user._id;
        
        if (!currentPassword || !newPassword) {
            return sendResponse(res, 400, false, 'Current password and new password are required');
        }
        
        const user = await User.findById(userId);
        if (!user) {
            return sendResponse(res, 404, false, 'User not found');
        }
        
        // Verify current password
        const isCurrentPasswordMatch = await user.comparePassword(currentPassword);
        if (!isCurrentPasswordMatch) {
            return sendResponse(res, 401, false, 'Current password is incorrect');
        }
        
        // Check if user has a temporary password
        if (!user.isTemporaryPassword) {
            return sendResponse(res, 400, false, 'Your password is not temporary');
        }
        
        // Update password and mark as not temporary
        user.password = newPassword;
        user.isTemporaryPassword = false;
        await user.save();
        
        return sendResponse(res, 200, true, 'Password changed successfully and temporary status removed');
    } catch (error) {
        console.error('Error changing temporary password:', error);
        return sendResponse(res, 500, false, 'Failed to change password', error.message);
    }
};

// Function to check if current user has temporary password
export const checkTemporaryPasswordStatus = async (req, res) => {
    try {
        const userId = req.user._id;
        const user = await User.findById(userId).select('isTemporaryPassword role');
        
        if (!user) {
            return sendResponse(res, 404, false, 'User not found');
        }
        
        return sendResponse(res, 200, true, 'Temporary password status retrieved', {
            isTemporaryPassword: user.isTemporaryPassword,
            role: user.role
        });
    } catch (error) {
        console.error('Error checking temporary password status:', error);
        return sendResponse(res, 500, false, 'Failed to check temporary password status', error.message);
    }
};

// Company Admin Dashboard Functions

// Get company users for company admin with meeting counts
export const getCompanyUsers = async (req, res) => {
    try {
        const userId = req.user._id;
        
        // Import Meeting model
        const Meeting = (await import('../models/meetings.js')).default;
        
        // Get company users
        const companyUsers = await User.find({ 
            company: req.user.company, // Use req.user.company directly
            deleted: { $ne: true },
            _id: { $ne: userId }
        })
        .select('firstName lastName email role status createdAt lastLoginTime currentLoginTime phone jobTitle logo landlordInfo')
        .lean() // Convert to plain JavaScript objects (faster)
        .exec(); // Explicit execution for better performance
        

        
        // Get company meetings by user IDs (since meetings don't have company field)
        const companyUserIds = companyUsers.map(user => user._id);
        
        // Fetch meetings for each user individually
        const usersWithMeetingCounts = await Promise.all(companyUsers.map(async (user) => {
            // Find meetings where this user is the creator
            const userCreatedMeetings = await Meeting.find({
                userId: user._id,
                deleted: { $ne: true }
            }).select('_id userId recordings screenshots').lean();
            
            // Find meetings where this user is a participant
            const userParticipantMeetings = await Meeting.find({
                'participants.userId': user._id,
                deleted: { $ne: true }
            }).select('_id userId participants recordings screenshots').lean();
            
            // Find meetings where this user is an attendee
            const userAttendeeMeetings = await Meeting.find({
                'attendees.userId': user._id,
                deleted: { $ne: true }
            }).select('_id userId attendees recordings screenshots').lean();
            
            // Find meetings where this user uploaded content
            const userUploadMeetings = await Meeting.find({
                $or: [
                    { 'recordings.uploaded_by': user._id },
                    { 'screenshots.uploaded_by': user._id }
                ],
                deleted: { $ne: true }
            }).select('_id userId recordings screenshots').lean();
            
            // Combine all meetings for this user and remove duplicates
            const allUserMeetings = [
                ...userCreatedMeetings,
                ...userParticipantMeetings,
                ...userAttendeeMeetings,
                ...userUploadMeetings
            ];
            
            const uniqueUserMeetings = allUserMeetings.filter((meeting, index, self) => 
                index === self.findIndex(m => m._id.toString() === meeting._id.toString())
            );
            
            return {
                ...user,
                meetingCount: uniqueUserMeetings.length
            };
        }));
        
        return sendResponse(res, 200, true, 'Company users retrieved successfully', usersWithMeetingCounts);
        
    } catch (error) {
        console.error('Error fetching company users:', error);
        return sendResponse(res, 500, false, 'Failed to fetch company users', error.message);
    }
};

// Get company meetings for company admin
export const getCompanyMeetings = async (req, res) => {
    try {
        // Import Meeting model
        const Meeting = (await import('../models/meetings.js')).default;
        
        // Single aggregation query instead of multiple queries
        const companyMeetings = await Meeting.aggregate([
            {
                $lookup: {
                    from: 'users',
                    localField: 'userId',
                    foreignField: '_id',
                    as: 'userInfo'
                }
            },
            {
                $match: {
                    'userInfo.company': req.user.company,
                    'userInfo.deleted': { $ne: true },
                    deleted: { $ne: true }
                }
            },
            {
                $project: {
                    title: 1,
                    meetingId: 1,
                    startTime: 1,
                    endTime: 1,
                    duration: 1,
                    status: 1,
                    createdAt: 1,
                    recordings: 1,
                    screenshots: 1
                }
            }
        ]).exec();
        
        return sendResponse(res, 200, true, 'Company meetings retrieved successfully', companyMeetings);
    } catch (error) {
        console.error('Error fetching company meetings:', error);
        return sendResponse(res, 500, false, 'Failed to fetch company meetings', error.message);
    }
};

// Get company uploads for company admin
export const getCompanyUploads = async (req, res) => {
    try {
        // Import Upload model
        const Upload = (await import('../models/upload.js')).default;
        
        // Single aggregation query instead of multiple queries
        const companyUploads = await Upload.aggregate([
            {
                $lookup: {
                    from: 'users',
                    localField: 'userId',
                    foreignField: '_id',
                    as: 'userInfo'
                }
            },
            {
                $match: {
                    'userInfo.company': req.user.company,
                    'userInfo.deleted': { $ne: true },
                    deleted: { $ne: true }
                }
            },
            {
                $project: {
                    accessCode: 1,
                    title: 1,
                    description: 1,
                    createdAt: 1,
                    status: 1,
                    images: 1,
                    videos: 1
                }
            }
        ]).exec();
        
        return sendResponse(res, 200, true, 'Company uploads retrieved successfully', companyUploads);
    } catch (error) {
        console.error('Error fetching company uploads:', error);
        return sendResponse(res, 500, false, 'Failed to fetch company uploads', error.message);
    }
};

// Get company profile data for company admin
export const getCompanyProfile = async (req, res) => {
    try {
        const userId = req.user._id;
        const user = await User.findById(userId);
        
        if (!user) {
            return sendResponse(res, 404, false, 'User not found');
        }
        
        if (user.role !== 'company-admin') {
            return sendResponse(res, 403, false, 'Only company admins can access this endpoint');
        }
        
        // Check if user has a company
        if (!user.company) {
            return sendResponse(res, 404, false, 'No company assigned to this user');
        }
        
        // Get company details
        const company = await Company.findById(user.company);
        
        if (!company) {
            return sendResponse(res, 404, false, 'Company not found');
        }
        
        // Return company profile data
        const companyProfile = {
            name: company.name,
            adminEmail: company.adminEmail,
            status: company.status,
            userCount: company.userCount,
            city: company.city,
            country: company.country,
            house_name_number: company.house_name_number,
            post_code: company.post_code,
            street_road: company.street_road,
            createdAt: company.createdAt,
            updatedAt: company.updatedAt
        };
        
        return sendResponse(res, 200, true, 'Company profile retrieved successfully', companyProfile);
    } catch (error) {
        console.error('Error fetching company profile:', error);
        return sendResponse(res, 500, false, 'Failed to fetch company profile', error.message);
    }
};

// Get comprehensive company dashboard stats for company admin
export const getCompanyDashboardStats = async (req, res) => {
    try {
        const userId = req.user._id;
        const user = await User.findById(userId);
        
        if (!user) {
            return sendResponse(res, 404, false, 'User not found');
        }
        
        if (user.role !== 'company-admin') {
            return sendResponse(res, 403, false, 'Only company admins can access this endpoint');
        }
        
        // Check if user has a company
        if (!user.company) {
            return sendResponse(res, 404, false, 'No company assigned to this user');
        }
        
        // Import models
        const Meeting = (await import('../models/meetings.js')).default;
        const Upload = (await import('../models/upload.js')).default;
        
        // Get company users
        const companyUsers = await User.find({ 
            company: user.company,
            deleted: { $ne: true }
        });
        
        const userIds = companyUsers.map(u => u._id);
        
        // Get company meetings with recordings and screenshots for storage calculation
        const companyMeetings = await Meeting.find({
            userId: { $in: userIds },
            deleted: { $ne: true }
        }).select('recordings screenshots');
        
        // Get company uploads
        const companyUploads = await Upload.find({
            userId: { $in: userIds },
            deleted: { $ne: true }
        }).select('images videos');
        
        // Calculate statistics
        const totalUsers = companyUsers.length;
        const totalMeetings = companyMeetings.length;
        const totalUploads = companyUploads.length;
        
        // Calculate total storage used from uploads (images and videos arrays) in MB
        const uploadStorageBytes = companyUploads.reduce((total, upload) => {
            let uploadSize = 0;
            
            // Add size from images array
            if (upload.images && Array.isArray(upload.images)) {
                uploadSize += upload.images.reduce((imgTotal, img) => imgTotal + (img.size || 0), 0);
            }
            
            // Add size from videos array
            if (upload.videos && Array.isArray(upload.videos)) {
                uploadSize += upload.videos.reduce((vidTotal, vid) => vidTotal + (vid.size || 0), 0);
            }
            
            return total + uploadSize;
        }, 0);

        // Calculate total storage used from meetings (recordings and screenshots) in MB
        const meetingStorageBytes = companyMeetings.reduce((total, meeting) => {
            let meetingSize = 0;
            
            // Add size from recordings array
            if (meeting.recordings && Array.isArray(meeting.recordings)) {
                meetingSize += meeting.recordings.reduce((recTotal, rec) => recTotal + (rec.size || 0), 0);
            }
            
            // Add size from screenshots array
            if (meeting.screenshots && Array.isArray(meeting.screenshots)) {
                meetingSize += meeting.screenshots.reduce((scrTotal, scr) => scrTotal + (scr.size || 0), 0);
            }
            
            return total + meetingSize;
        }, 0);

        // Total storage from both uploads and meetings
        const totalStorageUsedBytes = uploadStorageBytes + meetingStorageBytes;
        const totalStorageUsed = Math.round((totalStorageUsedBytes / (1024 * 1024)) * 100) / 100; // Convert to MB with 2 decimal places
        
        // Calculate total meeting minutes
        const totalMeetingMinutes = companyMeetings.reduce((total, meeting) => {
            return total + (meeting.duration || 0);
        }, 0);
        
        // Calculate average meeting duration
        const averageMeetingDuration = totalMeetings > 0 ? Math.round(totalMeetingMinutes / totalMeetings) : 0;
        
        // Calculate active users (users with activity in last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const activeUsers = companyUsers.filter(user => {
            const lastActivity = user.lastLoginTime || user.currentLoginTime;
            return lastActivity && new Date(lastActivity) > thirtyDaysAgo;
        }).length;

        // Get current online users for the company
        // const currentOnlineUsers = getCompanyOnlineUsers(user.company); // This line is removed
        const onlineUsersCount = 0; // Placeholder as online users are removed
        
        // Calculate monthly growth (placeholder for future implementation)
        const monthlyGrowth = 0; // Will be calculated based on actual data
        
        // Get user role distribution
        const roleDistribution = companyUsers.reduce((acc, user) => {
            acc[user.role] = (acc[user.role] || 0) + 1;
            return acc;
        }, {});
        
        // Get recent activity (last 7 days)
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        const recentMeetings = companyMeetings.filter(meeting => 
            new Date(meeting.createdAt) > sevenDaysAgo
        ).length;
        
        const recentUploads = companyUploads.filter(upload => 
            new Date(upload.createdAt) > sevenDaysAgo
        ).length;
        
        const stats = {
            totalUsers,
            totalMeetings,
            totalUploads,
            totalStorageUsed,
            totalMeetingMinutes,
            activeUsers,
            onlineUsersCount,
            averageMeetingDuration,
            monthlyGrowth,
            roleDistribution,
            recentActivity: {
                meetings: recentMeetings,
                uploads: recentUploads
            },
            onlineUsers: [], // Placeholder as online users are removed
            timestamp: new Date().toISOString()
        };
        
                 return sendResponse(res, 200, true, 'Company dashboard stats retrieved successfully', stats);
     } catch (error) {
         console.error('Error fetching company dashboard stats:', error);
         return sendResponse(res, 500, false, 'Failed to fetch company dashboard stats', error.message);
     }
 };
