import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { scholarApi } from '../services/api';
import '../styles/StudentProfile.css';
import '../routes/paths'
import PATHS from '../routes/paths';
import { formatDate } from '../utils/dateUtils';

interface StudentDetails {
  id: number;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
  favorite_subject: string;
  favorite_activity: string;
  favorite_color: string;
  image_url: string;
  grade_level: string;
  school: string;
  status: string;
  current_amount: number;
  amount_needed: number;
}

const ProgressBar: React.FC<{ currentAmount: number; amountNeeded: number }> = ({ currentAmount, amountNeeded }) => {
  const percentage = Math.min((currentAmount / amountNeeded) * 100, 100);
  
  return (
    <div className="scholar-progress-container">
      <div className="scholar-progress-bar">
        <div 
          className="scholar-progress-fill" 
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="scholar-progress-text">
        <span>₱{currentAmount.toLocaleString()}</span>
        <span>₱{amountNeeded.toLocaleString()}</span>
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

  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      // First filter out inactive and graduated students
      if (student.status === 'inactive' || student.status === 'graduated') {
        return false;
      }
      
      const searchTerm = searchQuery.toLowerCase();
      const matchesSearch = 
        student.first_name.toLowerCase().includes(searchTerm) ||
        student.last_name.toLowerCase().includes(searchTerm) ||
        student.school.toLowerCase().includes(searchTerm) ||
        student.grade_level.toLowerCase().includes(searchTerm);

      // Apply category filter if one is selected
      const matchesCategory = selectedCategory ? 
        student.grade_level.toLowerCase().includes(selectedCategory.toLowerCase()) : 
        true;

      // Add donation status filtering
      const matchesStatus = selectedStatus ? 
        (selectedStatus === 'high' ? 
          (student.current_amount >= student.amount_needed * 0.5) : 
          (student.current_amount < student.amount_needed * 0.5)) : 
        true;

      const matchesGender = selectedGender ? 
        student.gender.toLowerCase() === selectedGender.toLowerCase() : 
        true;

      return matchesSearch && matchesCategory && matchesStatus && matchesGender;
    });
  }, [students, searchQuery, selectedCategory, selectedStatus, selectedGender]);

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const data = await scholarApi.getAllScholars();
        setStudents(data);
      } catch (err) {
        setError('Failed to fetch students');
        console.error('Error fetching students:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, []);

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
            <option value="primary">Primary</option>
            <option value="secondary">Secondary</option>
            <option value="k12">K to 12</option>
            <option value="tertiary">Tertiary</option>
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
                  src={`http://localhost:5175${student.image_url}`}
                  alt={`${student.first_name} ${student.last_name}`}
                  className="student-profile-image"
                />
                <h3 className="student-profile-name">
                  {`${student.first_name} ${student.last_name}`}: Journey to Success
                </h3>
                <ProgressBar 
                  currentAmount={student.current_amount} 
                  amountNeeded={student.amount_needed}
                />
                <p className="student-profile-details">
                  Education Level: {student.grade_level}<br />
                  School: {student.school}
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
                  src={selectedStudent.image_url} 
                  alt={`${selectedStudent.first_name} ${selectedStudent.last_name}`} 
                  className="modal-student-image"
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
                        <p><strong>Favorite Subject:</strong> {selectedStudent.favorite_subject}</p>
                        <p><strong>Favorite Activity:</strong> {selectedStudent.favorite_activity}</p>
                        <p><strong>Favorite Color:</strong> {selectedStudent.favorite_color}</p>
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
