import React, { useEffect, useState } from "react";
import { Link, useNavigate } from 'react-router-dom';
import api from '../config/axios'; // Replace axios import
import { PATHS } from '../routes/paths';
import { Typography } from "@mui/material";
import "../../styles/Layout.css";
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
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        // Update to use api instance
        const response = await api.get('/scholars');
        setStudents(response.data);
      } catch (error) {
        console.error('Error fetching students:', error);
      }
    };

    fetchStudents();
  }, []);

  const mainCard = students[0];
  const sideCards = students.slice(1, 5); // Get next 4 students

  const handleCardClick = (studentId: number) => {
    navigate(`/StudentProfile/${studentId}`);
  };

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

      {students.length > 0 && mainCard && (
        <div className="fundraiser-container">
          {/* Main (large) card */}
          <div className="fundraiser-main-card" onClick={() => handleCardClick(mainCard.id)}>
            <img
              src={`${import.meta.env.VITE_API_URL}${mainCard.image_url}`}
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
                  src={`${import.meta.env.VITE_API_URL}${student.image_url}`}
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
              image: feature.image ? getImageUrl(feature.image) : prev.features[0].image
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
        console.error('Failed to load content:', error);
      }
    };
    loadContent();
  }, []);

  const getImageUrl = (path: string) => {
    if (!path) return '';
    if (path.startsWith('data:') || path.startsWith('http')) return path;
    if (path.startsWith('/uploads')) {
      return `${import.meta.env.VITE_API_URL}${path}`;
    }
    return path;
  };

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
                <img src={feature.image} alt={feature.title} className="icon" />
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
