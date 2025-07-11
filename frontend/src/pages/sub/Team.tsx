import React, { useState, useEffect } from "react";
import api from '../../config/axios';
import "../../styles/OurTeam.css";
import bannerImage from "../../img/team.png";
import placeholderImage from "../../img/team-placeholder.svg";

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
  const [isLoading, setIsLoading] = useState(true);

  const getImageUrl = (path: string) => {
    if (!path) return placeholderImage;
    if (path.startsWith('data:') || path.startsWith('http')) return path;
    if (path.startsWith('/uploads')) {
      return `${import.meta.env.VITE_API_URL}${path}`;
    }
    return path;
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    e.currentTarget.src = placeholderImage;
  };

  useEffect(() => {
    const loadContent = async () => {
      try {
        setIsLoading(true);
        const response = await api.get('/content/team');
        if (response.data?.content) {
          const savedContent = response.data.content;
          setContent(prev => ({
            bannerImage: savedContent.bannerImage ? getImageUrl(savedContent.bannerImage) : bannerImage,
            members: savedContent.members || []
          }));
        }
      } catch (error) {
        console.error('Failed to load content:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadContent();
  }, []);

  return (
    <div className="home-container">
      <img 
        src={content.bannerImage} 
        alt="Team Banner" 
        className={`banner-image ${isLoading ? 'loading' : 'loaded'}`}
        onError={handleImageError}
        loading="eager"
        decoding="async"
      />
      <div className="team-grid">
        {content.members.map((member, index) => (
          <div key={index} className="team-card">
            <div className="team-member-container">
                <img 
                  src={member.image ? getImageUrl(member.image) : placeholderImage} 
                  alt={member.name} 
                  className="team-member-image"
                  onError={handleImageError}
                  loading="lazy"
                  decoding="async"
                />
              </div>
              <h4 className="team-member-name">{member.name}</h4>
              <p className="team-member-role">{member.subText}</p>
            </div>
        
        ))}
      </div>
    </div>
  );
};

export default Team;