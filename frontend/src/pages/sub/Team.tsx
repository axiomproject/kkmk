import React, { useState, useEffect } from "react";
import axios from 'axios';
import "../../styles/OurTeam.css";
import bannerImage from "../../img/team.png";

interface TeamMember {
  name: string;
  subText: string;
  image?: string;
  profileClass: string;
}

interface PageContent {
  bannerImage: string;
  members: TeamMember[];
}

const Team = () => {
  const [content, setContent] = useState<PageContent>({
    bannerImage: bannerImage,
    members: []
  });

  const getImageUrl = (path: string) => {
    if (!path) return '';
    if (path.startsWith('data:') || path.startsWith('http')) return path;
    if (path.startsWith('/uploads')) {
      return `http://localhost:5175${path}`;
    }
    return path;
  };

  useEffect(() => {
    const loadContent = async () => {
      try {
        const response = await axios.get('/api/content/team');
        if (response.data?.content) {
          const savedContent = response.data.content;
          setContent(prev => ({
            bannerImage: savedContent.bannerImage ? getImageUrl(savedContent.bannerImage) : prev.bannerImage,
            members: savedContent.members || prev.members
          }));
        }
      } catch (error) {
        console.error('Failed to load content:', error);
      }
    };
    loadContent();
  }, []);

  return (
    <div className="home-container">
      <img src={content.bannerImage} alt="Banner" className="banner-image" />
      <div className="team-grid">
        {content.members.map((member, index) => (
          <div key={index} className="team-card">
            <div className={`image-placeholder`}>
              {member.image ? (
                <img 
                  src={getImageUrl(member.image)} 
                  alt={member.name} 
                  className="team-member-image"
                />
              ) : null}
            </div>
            <h4 className="team-name">{member.name}</h4>
            <p className="team-subtext">{member.subText}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Team;