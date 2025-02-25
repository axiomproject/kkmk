import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { PATHS } from '../routes/paths';
import "../../styles/Footer.css";
import footerImage from "../img/footerImage.png";
import { FaHandHoldingHeart, FaInfoCircle, FaHeadset, FaShare } from 'react-icons/fa';

const Footer = () => {
  const navigate = useNavigate();

  const handleContactClick = () => {
    navigate(PATHS.CONTACT);
    // Add small delay to ensure navigation completes before scrolling
    setTimeout(() => {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }, 100);
  };

  const handleDonateClick = () => {
    navigate(`${PATHS.HELP}?tab=donate`);
    setTimeout(() => {
      const donationForm = document.querySelector('.donation-form-container');
      if (donationForm) {
        donationForm.scrollIntoView({ behavior: 'smooth' });
      }
    }, 500); // Increased delay to ensure the Help component is fully loaded
  };

  const footerLinks = [
    {
      icon: <FaHandHoldingHeart size={24} />,
      label: 'Non Profits',
      path: PATHS.HELP
    },
    {
      icon: <FaInfoCircle size={24} />,
      label: 'About Us',
      path: PATHS.HELP
    },
    {
      icon: <FaHeadset size={24} />,
      label: 'Support',
      path: PATHS.HELP
    },
    {
      icon: <FaShare size={24} />,
      label: 'Social',
      path: PATHS.HELP
    }
  ];

  return (
    <footer>
       <div className="footerimage">
      <img src={footerImage} alt="Banner" className="footer-image" />
      <div className="footertext">
      <h2 className="footerbanner">Much in Little</h2>
      <h3 className="h3-footerbanner">Every donation, no matter the size, helps change lives. Join us in making a
      difference, one step at a time.</h3>
      <button className="h3-donatebutton" onClick={handleDonateClick}>
        Donate Now
      </button>
      </div>
      </div>
  
      <div className="footer-div">
        <div className="footer-divider">
          <div className="help">
        <h1 className="footercreds">Need Help?</h1>
        <h5 className="h5-footercreds">If you have further questions or need any assistance, please get in touch with our
        team and we will gladly assist you.</h5>
        <div className="contact-us-btn" onClick={handleContactClick}>Contact Us</div>
        </div>
        </div>
        <div className="footer-container">
          <div className="footer-column">
            <h4>Non Profits</h4>
            <ul>
              <li>lorem ipsum</li>
              <li>lorem ipsum</li>
              <li>lorem ipsum</li>
              <li>lorem ipsum</li>
            </ul>
          </div>
          <div className="footer-column">
            <h4>About Us</h4>
            <ul>
              <li>Our Story</li>
              <li>Partners and Sponsors</li>
              <li>Meet the Team</li>
              <li>Events</li>
            </ul>
          </div>
          <div className="footer-column">
            <h4>Support</h4>
            <ul>
              <li>lorem ipsum</li>
              <li>lorem ipsum</li>
              <li>lorem ipsum</li>
              <li>lorem ipsum</li>
            </ul>
          </div>
          <div className="footer-column">
            <h4>Social Media</h4>
            <ul>
              <li>Facebook</li>
              <li>Instagram</li>
              <li>Youtube</li>
            </ul>
          </div>

          {/* Mobile View */}
          <div className="footer-links-grid">
            {footerLinks.map((link) => (
              <Link 
                key={link.label}
                to={link.path}
                className="footer-link-item"
              >
                {link.icon}
                <span className="footer-link-label">{link.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
