import React, { useEffect, useState } from "react";
import { Link, useNavigate } from 'react-router-dom';
import api from '../config/axios'; // Replace axios import
import { PATHS } from '../routes/paths';
import { Typography } from "@mui/material";
import "../../styles/Layout.css";
import "../styles/Cards.css"; // Import the new Cards CSS file
import bannerImage from "../img/map.png";
import happinessIcon from '../img/happiness.svg';
import loveIcon from '../img/love.svg';
import sociallyIcon from '../img/social.svg';
import gradStory from '../img/gradstory.svg';
import weDo from "../img/wedo.svg";
import helpImage from "../img/help1.svg";
import highlightBg from "../img/highlightBg.svg";
import firstcard from "../img/bg.svg";
import secondcard from "../img/secondcard.svg";
import thirdcard from "../img/thirdcard.svg";
import fourthcard from "../img/fourthcard.svg";
import fifthcard from "../img/fifthcard.png";
import sixthcard from "../img/sixthcard.svg";
import seventhcard from "../img/seventhcard.svg";
import communityImage from "../img/communityImage.svg";
import Imelda from "../img/Imelda.png";
import sponsortwo from "../img/sponsortwo.png";
import sponsorthree from '../img/sponsorthree.png';
import sponsorfour from "../img/sponsorfour.png";
import "../../styles/ScholarSection.css"
import "../styles/CommunityImpact.css"
import "../styles/Featured.css"
import "../styles/FundraiserSection.css"
import "../styles/PageCon.css"
import "../styles/MainButton.css"
import { useAuth } from '../contexts/AuthContext'; // Add this import
import { getImageUrl } from '../utils/imageUtils'; // Add this import


interface Fundraiser {
  id: number;
  first_name: string;
  last_name: string;
  image_url: string;
  current_amount: number;
  amount_needed: number;
  grade_level: string;
  school: string;
  status?: 'active' | 'inactive' | 'graduated';
  is_active?: boolean;
}

interface HighlightCardProps {
  title: string;
  description: string;
  image: string;
  link: string;
}



interface Fundraiser {
  id: number;
  first_name: string;
  last_name: string;
  image_url: string;
  current_amount: number;
  amount_needed: number;
  grade_level: string;
  school: string;
}

interface HighlightCardProps {
  title: string;
  description: string;
  image: string;
  link: string;
}

const buttons = [
  {
    title: "Small Actions Change Lives Empowering Payatas Youth",
    description:
      "The Philippines premier social impact platform designed to elavate your charity effortlessly",
  },
];



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
        <span>₱{Math.floor(currentAmount).toLocaleString()} raised</span>

      </div>
    </div>
  );
};

const FundraiserSection: React.FC = () => {
  const [students, setStudents] = useState<Fundraiser[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Fundraiser[]>([]);
  const navigate = useNavigate();
  const { user } = useAuth(); // Get the current user from auth context

  // Helper function to determine fundraiser amount range based on salary range
  const getSuggestedAmountRange = (salaryRange: string) => {
    console.log("Processing salary range:", salaryRange); // Debug log
    
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
    
    // Adjust the calculation to be more inclusive for lower salary ranges
    // For P20,000-P30,000, this will give a range of approximately P3,000-P20,000
    const suggestedMin = Math.max(3000, Math.floor(minSalary * 0.15)); // Minimum 3,000 pesos
    const suggestedMax = Math.min(150000, Math.ceil(maxSalary * 0.7));  // Maximum 150,000 pesos, upper bound 70% of max salary
    
    console.log("Calculated amount range:", { suggestedMin, suggestedMax });
    
    return { min: suggestedMin, max: suggestedMax };
  };

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const response = await api.get('/scholars');
        
        // Filter out inactive and graduated students
        const activeStudents = response.data.filter((student: Fundraiser) => {
          return (student.status === 'active' || (student.status === undefined && student.is_active !== false));
        });
        
        setStudents(activeStudents);
        
        // Apply sponsor-specific filtering if the user is a sponsor
        if (user && user.role === 'sponsor' && user.salaryRange) {
          console.log("Sponsor found with salary range:", user.salaryRange); // Debug log
          
          const amountRange = getSuggestedAmountRange(user.salaryRange);
          
          if (amountRange) {
            // Filter students based on the sponsor's suggested amount range
            const sponsorRelevantStudents = activeStudents.filter((student: Fundraiser) => {
              const matchesRange = student.amount_needed >= amountRange.min && student.amount_needed <= amountRange.max;
              console.log(`Student ${student.first_name} (amount: ${student.amount_needed}) matches range: ${matchesRange}`);
              return matchesRange;
            });
            
            console.log("Filtered students count:", sponsorRelevantStudents.length);
            
            // Always use the filtered students, even if there are very few matches
            if (sponsorRelevantStudents.length > 0) {
              setFilteredStudents(sponsorRelevantStudents);
            } else {
              // Only fall back if there are absolutely NO matches
              console.log("No matches found, falling back to all active students");
              setFilteredStudents(activeStudents);
            }
          } else {
            console.log("No valid amount range could be determined");
            setFilteredStudents(activeStudents);
          }
        } else {
          // For non-sponsors, show all active students
          console.log("Not a sponsor or no salary range, showing all students");
          setFilteredStudents(activeStudents);
        }
      } catch (error) {
        console.error("Error fetching students:", error);
        setFilteredStudents([]);
      }
    };

    fetchStudents();
  }, [user]);

  const handleCardClick = (studentId: number) => {
    navigate(`/StudentProfile/${studentId}`);
  };

  // Use filteredStudents instead of students directly
  const mainCard = filteredStudents[0];
  const sideCards = filteredStudents.slice(1, 5); // Get next 4 students

  return (
    <section className="fundraiser-section">
      <div className="fundraiser-header">
        <h2 className="fundraiser-title">
          Discover fundraisers inspired by what you care about
        </h2>
        <button className="fundraiser-arrow-button" onClick={() => navigate('/StudentProfile')}>
          <span className="material-icons">arrow_forward</span>
        </button>
      </div>

      {filteredStudents.length > 0 && mainCard && (
        <div className="fundraiser-container">
          {/* Main (large) card */}
          <div className="fundraiser-main-card" onClick={() => handleCardClick(mainCard.id)}>
            <img
              src={getImageUrl(mainCard.image_url)}
              alt={`${mainCard.first_name} ${mainCard.last_name}`}
              className="fundraiser-main-image"
            />
            <div className="fundraiser-info">
              <h3 className="fundraiser-heading">
                {`${mainCard.first_name} ${mainCard.last_name}: Journey to Success`}
              </h3>
              <ProgressBar 
                currentAmount={mainCard.current_amount} 
                amountNeeded={mainCard.amount_needed}
              />
            </div>
          </div>

          {/* Side (smaller) cards */}
          <div className="fundraiser-side-cards">
            {sideCards.map((student) => (
              <div 
                key={student.id} 
                className="fundraiser-side-card"
                onClick={() => handleCardClick(student.id)}
              >
                <img
                  src={getImageUrl(student.image_url)}
                  alt={`${student.first_name} ${student.last_name}`}
                  className="fundraiser-side-image"
                />
                <div className="side-card-info">
                  <h4 className="side-card-title">
                    {`${student.first_name} ${student.last_name}: Journey to Success`}
                  </h4>
                  <ProgressBar 
                    currentAmount={student.current_amount} 
                    amountNeeded={student.amount_needed}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {user && user.role === 'sponsor' && (
        <div className="sponsor-tailored-message">
          <p>These fundraisers are tailored to your financial capacity based on your profile.</p>
        </div>
      )}
    </section>
  );
};

const HighlightCard: React.FC<HighlightCardProps> = ({ title, description, image, link }) => {
  return (
    <div className="highlight-card">
      <img src={image} alt={title} className="card-image" />
      <h3 className="card-title">{title}</h3>
      <p className="card-description">{description}</p>
      <a href={link} className="card-link">
        Read more
      </a>
    </div>
  );
};

interface PageContent {
  headerTitle: string;
  headerDescription: string;
  statCards: {
    title: string;
    value: string;
    description: string;
    image: string;
  }[];
  features: {
    title: string;
    description: string;
    image: string;
  }[];
  highlights: {
    title: string;
    description: string;
    image: string;
    link: string;
  }[];
  community: {
    title: string;
    description: string;
    image: string;
  };
  additionalCards: {
    title: string;
    description: string;
    image: string;
    buttonText?: string;
  }[];
  actionCards: {
    image: string;
    buttonText?: string;
  }[];
  testimonialCards?: {
    image: string;
    name: string;
    description: string;
    backDescription: string;
  }[];
}

const Home: React.FC = () => {
  const navigate = useNavigate();
  
  // Add this handler function
  const handleDonateClick = (e: React.MouseEvent) => {
    e.preventDefault();
    navigate(`${PATHS.HELP}?tab=donate`);
    setTimeout(() => {
      const donationForm = document.querySelector('.donation-form-container');
      if (donationForm) {
        donationForm.scrollIntoView({ behavior: 'smooth' });
      }
    }, 500);
  };

  const [content, setContent] = useState<PageContent>({
    headerTitle: "Small Actions Change Lives Empowering Payatas Youth",
    headerDescription: "The Philippines premier social impact platform designed to elevate your charity effortlessly",
    statCards: [
      {
        title: "poverty rate",
        value: "16.3%",
        description: "A 2024 survey conducted by...",
        image: firstcard
      }
    ],
    features: [
      {
        title: "Give Happiness",
        description: "Giving happiness to others...",
        image: happinessIcon
      }
      // ...other default features
    ],
    highlights: [
      {
        title: "Graduates' Stories",
        description: "Read more about their journey.",
        image: gradStory,
        link: "/grad"
      }
      // ...other default highlights
    ],
    community: {
      title: "Community Impact",
      description: "Experience the ripple effect...",
      image: communityImage
    },
    additionalCards: [
      {
        title: "Health",
        description: "lifeskills for 2,213 children in Philippines",
        image: thirdcard
      },
      {
        title: "Join 5000+ People Donate",
        description: "",
        buttonText: "Join Community",
        image: fourthcard
      },
      {
        title: "Education",
        description: "Sponsor food, education to childrens",
        image: fifthcard
      }
    ],
    actionCards: [
      {
        image: sixthcard,
        buttonText: "Donate Now"
      },
      {
        image: seventhcard
      }
    ]
  });

  useEffect(() => {
    const loadContent = async () => {
      try {
        // Update to use api instance
        const response = await api.get('/content/home');
        if (response.data?.content) {
          const savedContent = response.data.content;
          setContent(prev => ({
            ...prev,
            ...savedContent,
            statCards: savedContent.statCards?.map((card: any) => ({
              ...card,
              image: card.image ? getImageUrl(card.image) : prev.statCards[0].image
            })) || prev.statCards,
            features: savedContent.features?.map((feature: any) => ({
              ...feature,
              image: feature.image || null // Don't transform the URL, it should already be in the correct format
            })) || prev.features,
            highlights: savedContent.highlights?.map((highlight: any) => ({
              ...highlight,
              image: highlight.image ? getImageUrl(highlight.image) : prev.highlights[0].image
            })) || prev.highlights,
            community: {
              ...prev.community,
              ...savedContent.community,
              image: savedContent.community?.image ? 
                getImageUrl(savedContent.community.image) : 
                prev.community.image
            },
            testimonialCards: savedContent.testimonialCards?.map((card: any) => ({
              ...card,
              image: card.image ? getImageUrl(card.image) : ''
            })) || prev.testimonialCards
          }));
        }
      } catch (error) {
        console.error('Error loading content:', error);
      }
    };
    loadContent();
  }, []);

  return (
    <div className="page-container">
      <div className="button-row">
        <div className="main-button">
          <Typography variant="h3">
            {content.headerTitle}
          </Typography>
          <Typography variant="body1">
            {content.headerDescription}
          </Typography>
          <div className="donatebutton1">
            <a 
              href="#"
              className="donatenow"
              onClick={handleDonateClick}
            >
              Donate Now
            </a>
            <a className="watchvideo" href="https://www.youtube.com/watch?v=g-XD2d43LXo">▶ Watch Video</a>
          </div>
        </div>
      </div>
  <div className="firstcards">
        <div className="firstsection-card">
          <img src={firstcard} className="firstcard"></img>
          <img src={secondcard} className="secondcard"></img>
          <div className="firstcard-text">
            <h1>16.3%</h1>
            <p>A 2024 survey conducted by the Social Weather Stations from September 14 to 23, 2024 estimated 16.3 Filipino families.</p>
            <div className="fourthcard-button-container">
              <button className="firstcard-button">Donate Now
                <span className="first-button-arrow">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="6" y1="18" x2="18" y2="6" />
                    <polyline points="6,6 18,6 18,18" />
                  </svg>
                </span>
              </button>
            </div>
          </div>
        </div>
        <div className="thirdsection-card">
          <img src={thirdcard} className="thirdcard"></img>
          <div className="thirdcard-text">
            <h3>Health</h3>
            <p>lifeskills for 2,213 children in Philippines</p>
          </div>
        </div>
        <div className="thirdsection-card">
          <img src={fourthcard} className="fourthcard"></img>
          <div className="fourthcard-text">
            <p>Join 5000+ People Donate</p>
            <div className="fourthcard-button-container">
              <button className="fourthcard-button">Join Community
                <span className="button-arrow">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="6" y1="18" x2="18" y2="6" />
                    <polyline points="6,6 18,6 18,18" />
                  </svg>
                </span>
              </button>
            </div>
          </div>
        </div>
        <div className="thirdsection-card">
          <img src={fifthcard} className="fifthcard"></img>
          <div className="thirdcard-text">
            <h3>Education</h3>
            <p>Sponsor food, education to childrens</p>
          </div>
        </div>
        <div className="secondsection-card">
          <img src={sixthcard} className="sixthcard"></img>
          <div className="sixth-button-container">
            <button className="sixth-button">Donate Now
              <span className="sixth-button-arrow">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="6" y1="18" x2="18" y2="6" />
                  <polyline points="6,6 18,6 18,18" />
                </svg>
              </span>
            </button>
          </div>
          <img src={seventhcard} className="seventhcard"></img>
        </div>
      </div>

      <FundraiserSection />

      <div className="fund-container">
        <div className="fundraising-section">
          <h2>Fundraising with <span className="highlight">Kapatid kita, Mahal kita</span> only takes a few minutes</h2>
          <div className="cards-container">
            {content.features.map((feature, index) => (
              <div key={index} className="cards">
                <img src={getImageUrl(feature.image)} alt={feature.title} className="icon" />
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="page-container">
          <section className="featured-highlights">
            <div className="mainfeatured">
              <h1 className="h1Featured">Featured Highlights</h1>
              <div className="highlights-header">
                <div className="img">
                  <img src={highlightBg} className="highlightbg"></img>
                </div>
                <div className="highlightstext">
                  <p>Discover how people spread causes in the digital era</p>
                  <p className="explore">Explore how social media influences charitable giving behaviors across generations.</p>
                  <a href="/report" className="report-link">Read our report</a>
                </div>
              </div>
              <div className="highlights-grid">
                {content.highlights.map((highlight, index) => (
                  <HighlightCard
                    key={index}
                    title={highlight.title}
                    description={highlight.description}
                    image={highlight.image}
                    link={highlight.link}
                  />
                ))}
              </div>
            </div>
          </section>
        </div>

        <div className="page-container">
          <div className="community-container">
            <div className="community-text">
              <h2>{content.community.title}</h2>
              <p>{content.community.description}</p>
              <div className="donatebutton1">
                <a 
                  href="#"
                  className="donatenow"
                  onClick={handleDonateClick}
                >
                  Donate Now
                </a>
              </div>
            </div>
            <div className="community-image">
              <img src={content.community.image} className="community-imagery"></img>
            </div>
          </div>
          <div className="community-grid">
            {content.testimonialCards?.map((card, index) => (
              <div key={index} className="flip-card">
                <div className="flip-card-inner">
                  <div className="flip-card-front">
                    <img src={getImageUrl(card.image)} alt={card.name}></img>
                    <h1>{card.name}</h1>
                    <p>{card.description}</p>
                  </div>
                  <div className="flip-card-back">
                    <p>{card.backDescription}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
      </div>
    </div>
  );
};

export default Home;
