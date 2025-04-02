import React from 'react';
import '../../styles/modals/VolunteerViewModal.css';

interface Event {
  id: string;
  title: string;
  date: string;
  status: string;
}

interface Disability {
  types: string[];
  details: string;
}

interface VolunteerProps {
  volunteer: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    username: string;
    date_of_birth?: string;
    created_at: string;
    last_login?: string;
    status: string;
    is_verified: boolean;
    past_events?: Event[];
    skills?: string[]; // Added skills field
    disability?: Disability | null; // Added disability field
    skill_evidence?: string; // Add skill evidence field
  };
  onClose: () => void;
}

const formatDate = (dateString: string) => {
  if (!dateString) return 'N/A';
  
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

// Updated skill name mapping for display - matching our new realistic skills
const skillLabels: Record<string, string> = {
  'tutoring': 'Tutoring/Academic Support',
  'mentoring': 'Mentoring',
  'counseling': 'Community Counseling',
  'healthcare': 'Healthcare Support',
  'arts_culture': 'Arts & Culture Programs',
  'sports_recreation': 'Sports & Recreation',
  'environmental': 'Environmental Projects',
  'food_distribution': 'Food Distribution',
  'shelter_support': 'Shelter Support',
  'administrative': 'Administrative Support',
  'event_planning': 'Event Planning',
  'technical': 'Technical Support',
  'elderly_support': 'Elderly Support',
  'child_care': 'Child Care',
  'translation': 'Translation/Interpretation'
};

const VolunteerViewModal: React.FC<VolunteerProps> = ({ volunteer, onClose }) => {
  // Add debugging logs
  console.log('Volunteer data received:', {
    id: volunteer.id,
    name: volunteer.name,
    skillEvidence: volunteer.skill_evidence,
    skills: volunteer.skills
  });

  // Parse skills and disability if they're strings
  let parsedSkills = volunteer.skills || []; // Add default empty array
  let parsedDisability = volunteer.disability;

  if (typeof volunteer.skills === 'string') {
    try {
      parsedSkills = JSON.parse(volunteer.skills);
    } catch (e) {
      console.error(`Error parsing skills for volunteer ${volunteer.id}:`, e);
      parsedSkills = []; // Ensure we have an empty array on error
    }
  }

  if (typeof volunteer.disability === 'string') {
    try {
      parsedDisability = JSON.parse(volunteer.disability);
    } catch (e) {
      console.error(`Error parsing disability for volunteer ${volunteer.id}:`, e);
      parsedDisability = null;
    }
  }

  // Add custom styles to override the problematic flex-direction
  const skillsContainerStyle = {
    marginBottom: '15px'
  };
  
  const skillsBadgesStyle = {
    marginBottom: 0,
    gap: '8px',
    display: 'flex',
    flexDirection: 'row' as const,
    flexWrap: 'wrap' as const
  };

  // Function to render skill badges with labels - with null checking
  const renderSkillBadges = (skills: string[] | undefined) => {
    if (!skills || !Array.isArray(skills) || skills.length === 0) {
      return <div className="no-skills">No skills specified</div>;
    }

    return skills.map(skill => (
      <div key={skill} className="skill-badge">
        {skillLabels[skill] || skill}
      </div>
    ));
  };

  // Check if the volunteer has skill evidence
  const hasSkillEvidence = volunteer.skill_evidence && volunteer.skill_evidence.length > 0;
  console.log('Has skill evidence:', hasSkillEvidence, volunteer.skill_evidence);

  return (
    <div className="volunteer-view-modal-overlay" onClick={onClose}>
      <div className="volunteer-view-modal-content" onClick={e => e.stopPropagation()}>
        <button className="volunteer-view-modal-close" onClick={onClose}>×</button>
        
        <h2>{volunteer.name}</h2>
        <div className="volunteer-profile">
          <div className="volunteer-info-section">
            <h3>Contact Information</h3>
            <div className="info-grid">
              <div className="info-item">
                <label>Email:</label>
                <span>{volunteer.email}</span>
              </div>
              <div className="info-item">
                <label>Phone:</label>
                <span>{volunteer.phone || 'N/A'}</span>
              </div>
              <div className="info-item">
                <label>Username:</label>
                <span>{volunteer.username}</span>
              </div>
            </div>
          </div>
          
          <div className="volunteer-info-section">
            <h3>Personal Details</h3>
            <div className="info-grid">
              <div className="info-item">
                <label>Date of Birth:</label>
                <span>{volunteer.date_of_birth ? formatDate(volunteer.date_of_birth) : 'N/A'}</span>
              </div>
              <div className="info-item">
                <label>Status:</label>
                <span>{volunteer.status}</span>
              </div>
              <div className="info-item">
                <label>Verified:</label>
                <span>{volunteer.is_verified ? 'Yes' : 'No'}</span>
              </div>
            </div>
          </div>
          
          {/* Skills Section - WITH PROPER NULL CHECK */}
          {parsedSkills && Array.isArray(parsedSkills) && parsedSkills.length > 0 && (
            <div className="volunteer-info-section" style={skillsContainerStyle}>
              <h3>Skills</h3>
              <div className="skills-list" style={skillsBadgesStyle}>
                {renderSkillBadges(parsedSkills)}
              </div>
              
              {/* Add skill evidence section if available */}
              {hasSkillEvidence && (
                <div className="skill-evidence">
                  <p><strong>Skill Evidence:</strong></p>
                  <a 
                    href={volunteer.skill_evidence} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="evidence-link"
                  >
                    <div className="evidence-badge">
                      <i className="material-icons">description</i>
                      <span>View Certificate/Evidence</span>
                    </div>
                  </a>
                </div>
              )}
            </div>
          )}
          
          {/* Disability Section - WITH PROPER NULL CHECK */}
          {parsedDisability && parsedDisability.types && Array.isArray(parsedDisability.types) && (
            <div className="volunteer-info-section">
              <h3>Disability Information</h3>
              <div className="disability-info">
                <div className="disability-types">
                  <label>Type(s):</label>
                  <div className="disability-badges">
                    {parsedDisability.types.map((type: string) => (
                      <span key={type} className="disability-badge">{type}</span>
                    ))}
                  </div>
                </div>
                {parsedDisability.details && (
                  <div className="disability-details">
                    <label>Details:</label>
                    <p>{parsedDisability.details}</p>
                  </div>
                )}
              </div>
            </div>
          )}
          
          <div className="volunteer-info-section">
            <h3>Account Information</h3>
            <div className="info-grids">
              <div className="info-item">
                <label>Joined:</label>
                <span>{formatDate(volunteer.created_at)}</span>
              </div>
              <div className="info-item">
                <label>Last Login:</label>
                <span>{volunteer.last_login ? formatDate(volunteer.last_login) : 'Never'}</span>
              </div>
            </div>
          </div>
          
          {/* Past Events Section */}
          <div className="volunteer-info-section">
            <h3>Past Events ({volunteer.past_events?.length || 0})</h3>
            {volunteer.past_events && volunteer.past_events.length > 0 ? (
              <div className="events-list">
                {volunteer.past_events.map(event => (
                  <div 
                    key={event.id} 
                    className="event-item"
                    data-status={event.status}
                  >
                    <h4>{event.title}</h4>
                    <div className="event-details">
                      <div className="event-date">
                        <label>Date:</label> {formatDate(event.date)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-events">No past events found for this volunteer.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VolunteerViewModal;
