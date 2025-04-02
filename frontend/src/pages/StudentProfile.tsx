import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../config/axios';
import '../styles/StudentProfile.css';
import '../routes/paths';
import PATHS from '../routes/paths';
import { formatDate } from '../utils/dateUtils';
import { useAuth } from '../contexts/AuthContext'; // Add this import

// Update StudentDetails interface to match the new data structure
interface StudentDetails {
  id: number;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
  education_level: string; // Changed from grade_level
  school: string;
  favorite_subject: string;
  favorite_activity: string;
  favorite_color: string;
  image_url: string;
  profile_photo: string; // Add this for user profile photos
  status: string;
  current_amount: number;
  amount_needed: number;
  is_verified: boolean; // Add this property
  is_active: boolean; // Add this property
}

const ProgressBar: React.FC<{ currentAmount: number; amountNeeded: number }> = ({ currentAmount, amountNeeded }) => {
  // Add null/undefined checks and provide default values
  const safeCurrentAmount = currentAmount || 0;
  const safeAmountNeeded = amountNeeded || 1; // Avoid division by zero
  
  // Calculate percentage safely
  const percentage = Math.min((safeCurrentAmount / safeAmountNeeded) * 100, 100);
  
  return (
    <div className="scholar-progress-container">
      <div className="scholar-progress-bar">
        <div 
          className="scholar-progress-fill" 
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="scholar-progress-text">
        <span>₱{safeCurrentAmount.toLocaleString()}</span>
        <span>₱{safeAmountNeeded.toLocaleString()}</span>
      </div>
    </div>
  );
};

const StudentProfile: React.FC = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState<StudentDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<StudentDetails | null>(null);
  const [activeTab, setActiveTab] = useState<'details' | 'updates'>('details');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedGender, setSelectedGender] = useState('');
  const { user } = useAuth(); // Get the current user from auth context

  // Add helper function for determining appropriate fundraiser amount range based on salary range
  const getSuggestedAmountRange = (salaryRange: string) => {
    console.log("Processing salary range in StudentProfile:", salaryRange);
    
    // Extract numeric values from salary range (assuming format like "P30,001 - P50,000")
    const matches = salaryRange.match(/P([\d,]+) - P([\d,]+)/);
    
    if (!matches || matches.length < 3) {
      // Handle "P150,001 and above" case or any parsing errors
      if (salaryRange.includes("and above")) {
        console.log("High earner detected, suggesting high-need students");
        return { min: 20000, max: 150000 };
      }
      console.log("Could not parse salary range, using default filter");
      return null; // Default to no filter if we can't parse
    }
    
    // Parse numeric values (removing commas)
    const minSalary = parseInt(matches[1].replace(/,/g, ''), 10);
    const maxSalary = parseInt(matches[2].replace(/,/g, ''), 10);
    
    console.log("Parsed salary range:", { minSalary, maxSalary });
    
    // Adjust calculation to be more inclusive for lower salary ranges
    const suggestedMin = Math.max(3000, Math.floor(minSalary * 0.15)); // Minimum 3,000 pesos
    const suggestedMax = Math.min(150000, Math.ceil(maxSalary * 0.7));  // Maximum 150,000 pesos
    
    console.log("Calculated amount range for filtering:", { suggestedMin, suggestedMax });
    
    return { min: suggestedMin, max: suggestedMax };
  };

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        // Updated to use axios instance
        const response = await api.get('/scholars');
        if (!response.data) throw new Error('No data returned');
        
        // Filter out inactive, unverified, and non-active scholars first
        let activeStudents = response.data.filter((student: StudentDetails) => 
          student.is_verified && 
          student.status === 'active'
        );
        
        // Apply sponsor-specific filtering if the user is a sponsor
        if (user && user.role === 'sponsor' && user.salaryRange) {
          console.log("Sponsor found with salary range in StudentProfile:", user.salaryRange);
          
          const amountRange = getSuggestedAmountRange(user.salaryRange);
          
          if (amountRange) {
            // Filter students based on the sponsor's suggested amount range
            const sponsorRelevantStudents = activeStudents.filter((student: StudentDetails) => {
              const matchesRange = student.amount_needed >= amountRange.min && student.amount_needed <= amountRange.max;
              console.log(`Student ${student.first_name} (amount: ${student.amount_needed}) matches range: ${matchesRange}`);
              return matchesRange;
            });
            
            console.log("Students matching sponsor's range:", sponsorRelevantStudents.length);
            
            // Only apply the filter if we have enough matches
            if (sponsorRelevantStudents.length > 0) {
              activeStudents = sponsorRelevantStudents;
            } else {
              console.log("No matches found for sponsor's range, showing all active students");
            }
          }
        }
        
        setStudents(activeStudents);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching students:', err);
        setError('Failed to fetch students');
        setLoading(false);
      }
    };

    fetchStudents();
  }, [user]); // Add user dependency to re-fetch when user changes

  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const searchTerm = searchQuery.toLowerCase();
      const matchesSearch = 
        student.first_name?.toLowerCase().includes(searchTerm) ||
        student.last_name?.toLowerCase().includes(searchTerm) ||
        student.school?.toLowerCase().includes(searchTerm) ||
        student.education_level?.toLowerCase().includes(searchTerm);

      // Apply category filter if one is selected
      const matchesCategory = selectedCategory ? 
        student.education_level?.toLowerCase().includes(selectedCategory.toLowerCase()) : 
        true;

      // Add donation status filtering
      const matchesStatus = selectedStatus ? 
        (selectedStatus === 'high' ? 
          (student.current_amount >= student.amount_needed * 0.5) : 
          (student.current_amount < student.amount_needed * 0.5)) : 
        true;

      const matchesGender = selectedGender ? 
        student.gender?.toLowerCase() === selectedGender.toLowerCase() : 
        true;

      return matchesSearch && matchesCategory && matchesStatus && matchesGender;
    });
  }, [students, searchQuery, selectedCategory, selectedStatus, selectedGender]);

  const handleCardClick = (studentId: number) => {
    navigate(`/StudentProfile/${studentId}`);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedStudent(null);
  };

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
  };

  const handleCategoryChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedCategory(event.target.value);
  };

  const handleStatusChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedStatus(event.target.value);
  };

  const handleGenderChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedGender(event.target.value);
  };

  const getImageUrl = (student: StudentDetails) => {
    // First check for image_url from scholars table
    if (student.image_url) {
      if (student.image_url.startsWith('data:') || student.image_url.startsWith('http')) {
        return student.image_url;
      }
      return `${import.meta.env.VITE_API_URL}${student.image_url}`;
    }
    
    // Then check for profile_photo from users table
    if (student.profile_photo) {
      if (student.profile_photo.startsWith('data:') || student.profile_photo.startsWith('http')) {
        return student.profile_photo;
      }
      return `${import.meta.env.VITE_API_URL}${student.profile_photo}`;
    }
    
    // Default placeholder
    return '/images/default-avatar.jpg';
  };

  return (
    <div className="student-profile-container">
      <div className="student-profile-sidebar">
        <button className="student-profile-btn active">Sponsor A Student</button>
        <button className="student-profile-btn" onClick={() => navigate(PATHS.MY_SCHOLAR)}>
          My Scholar
        </button>
      </div>
      
      <div className="student-profile-main">
        <h1 className="student-profile-title">Student</h1>
        <p className="student-profile-desc">
          Join us in making education accessible to deserving students. Your sponsorship can transform lives and create lasting impact in our communities.
        </p>
        <h2 className="student-profile-subtitle">Sponsorship Share Explained</h2>
        <p className="student-profile-desc">
          Each student's educational journey requires different levels of support. The progress bar shows how close they are to reaching their educational funding goals. You can contribute any amount to help them achieve their dreams.
        </p>

        {/* Add sponsor-specific message if user is a sponsor */}
        {user && user.role === 'sponsor' && (
          <div className="sponsor-message">
            <p>
              The students shown below have been tailored based on your financial capacity.
              These matches consider your salary range to suggest appropriate sponsorship opportunities.
            </p>
          </div>
        )}

        <div className="student-profile-filters">
          <input 
            type="text" 
            placeholder="Search by name, school, or education level" 
            className="student-profile-search" 
            value={searchQuery}
            onChange={handleSearch}
          />
          <select 
            className="student-profile-select"
            value={selectedStatus}
            onChange={handleStatusChange}
          >
            <option value="">All Donation Levels</option>
            <option value="high">Well-Supported (50%+ Funded)</option>
            <option value="low">Seeking Support (Under 50% Funded)</option>
          </select>
          <select 
            className="student-profile-select"
            value={selectedGender}
            onChange={handleGenderChange}
          >
            <option value="">All Genders</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
          <select 
            className="student-profile-select"
            value={selectedCategory}
            onChange={handleCategoryChange}
          >
            <option value="">All Education Levels</option>
            <option value="elementary">Elementary</option>
            <option value="junior high">Junior High School</option>
            <option value="senior high">Senior High School</option>
            <option value="vocational">Vocational</option>
            <option value="college">College</option>
            <option value="graduate">Graduate School</option>
          </select>
        </div>

        {loading && <p>Loading students...</p>}
        {error && <p className="error-message">{error}</p>}

        <div className="student-profile-grid">
          {filteredStudents.length === 0 ? (
            <div className="nostudents-found">
              <p className='nostudents'>No students found matching your search.</p>
            </div>
          ) : (
            filteredStudents.map((student) => (
              <div 
                className="student-profile-card" 
                key={student.id}
                onClick={() => handleCardClick(student.id)}
              >
                <img
                  src={getImageUrl(student)}
                  alt={`${student.first_name} ${student.last_name}`}
                  className="student-profile-image"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = '/images/default-avatar.jpg';
                  }}
                />
                <h3 className="student-profile-name">
                  {`${student.first_name} ${student.last_name}`}: Journey to Success
                </h3>
                <ProgressBar 
                  currentAmount={student.current_amount || 0} 
                  amountNeeded={student.amount_needed || 1}
                />
                <p className="student-profile-details">
                  Education Level: {student.education_level || 'Not specified'}<br />
                  School: {student.school || 'Not specified'}
                </p>
              </div>
            ))
          )}
        </div>

        {/* Student Details Modal */}
        {isModalOpen && selectedStudent && (
          <div className="student-modal-overlay" onClick={handleCloseModal}>
            <div className="student-modal" onClick={e => e.stopPropagation()}>
              <button className="modal-close-btn" onClick={handleCloseModal}>×</button>
              
              <div className="modal-content">
                <img 
                  src={getImageUrl(selectedStudent)} 
                  alt={`${selectedStudent.first_name} ${selectedStudent.last_name}`} 
                  className="modal-student-image"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = '/images/default-avatar.jpg';
                  }}
                />
                
                <div className="modal-details">
                  <h2>{`${selectedStudent.first_name} ${selectedStudent.last_name}`}</h2>
                  
                  <div className="modal-tabs">
                    <button 
                      className={`tab-btn ${activeTab === 'details' ? 'active' : ''}`}
                      onClick={() => setActiveTab('details')}
                    >
                      Details
                    </button>
                    <button 
                      className={`tab-btn ${activeTab === 'updates' ? 'active' : ''}`}
                      onClick={() => setActiveTab('updates')}
                    >
                      Updates
                    </button>
                  </div>

                  <div className="tab-content">
                    {activeTab === 'details' ? (
                      <div className="details-tab">
                        <p><strong>First Name:</strong> {selectedStudent.first_name}</p>
                        <p><strong>Last Name:</strong> {selectedStudent.last_name}</p>
                        <p><strong>Date of Birth:</strong> {formatDate(selectedStudent.date_of_birth)}</p>
                        <p><strong>Gender:</strong> {selectedStudent.gender}</p>
                        <p><strong>Education Level:</strong> {selectedStudent.education_level}</p>
                        <p><strong>School:</strong> {selectedStudent.school}</p>
                        <p><strong>Favorite Subject:</strong> {selectedStudent.favorite_subject || 'Not specified'}</p>
                        <p><strong>Favorite Activity:</strong> {selectedStudent.favorite_activity || 'Not specified'}</p>
                        <p><strong>Favorite Color:</strong> {selectedStudent.favorite_color || 'Not specified'}</p>
                      </div>
                    ) : (
                      <div className="updates-tab">
                        <p>Recent updates will be displayed here.</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentProfile;
