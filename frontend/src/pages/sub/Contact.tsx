import { useState, useEffect, useRef } from "react";
import React from 'react'
import "../../styles/Contact.css";
import api from '../../config/axios';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import iconRetina from 'leaflet/dist/images/marker-icon-2x.png';

interface ContactContent {
  mainHeading: string;
  mainDescription: string;
  email: string;
  phone: string;
  sections: {
    title: string;
    description: string;
  }[];
  locationHeading: string;
  locationTitle: string;
  locationSubHeading: string;
  address: string[];
}

const Contact: React.FC = () => {
    const [message, setMessage] = useState("");
    const [charCount, setCharCount] = useState(0);
    const [mapReady, setMapReady] = useState(false);
    const mapRef = useRef<HTMLDivElement>(null);
    const [map, setMap] = useState<any>(null);
  
    const handleMessageChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const value = e.target.value;
      setMessage(value);
      setCharCount(value.length);
    };
  
    const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      const form = e.target as HTMLFormElement;
      
      try {
        const formData = {
          firstName: form.firstName.value,
          lastName: form.lastName.value,
          email: form.email.value,
          phone: form.phone.value,
          message: message
        };
  
        // Update the axios call to use the api instance
        const response = await api.post('/contacts', formData);
        
        if (response.status === 201) {
          alert('Thank you for your message! We will get back to you soon.');
          form.reset();
          setMessage('');
          setCharCount(0);
        }
      } catch (error) {
        console.error('Error submitting form:', error);
        alert('There was an error submitting your message. Please try again.');
      }
    };

  const [content, setContent] = useState<ContactContent>({
    mainHeading: "Contact Us",
    mainDescription: "If you have further questions...",
    email: "Kmkkpayatas@gmail.com",
    phone: "321-221-221",
    sections: [
      {
        title: "Contact Support",
        description: "Provides exceptional customer assistance..."
      },
      {
        title: "Feedback and Suggestions",
        description: "Collects, analyzes, and addresses user feedback..."
      },
      {
        title: "Made Inquiries",
        description: "Handles and responds to inquiries efficiently..."
      }
    ],
    locationHeading: "Our location",
    locationTitle: "Connecting Near and Far",
    locationSubHeading: "Headquarters",
    address: [
      "Kapatid kita mahal kita Foundation",
      "Quezon City, Philippines",
      "Lonergan Center, Ateneo de Manila University, PH 1108",
      "Philippines"
    ]
  });

  useEffect(() => {
    const loadContent = async () => {
      try {
        // Update the axios call to use the api instance
        const response = await api.get('/content/contact');
        if (response.data?.content) {
          setContent(response.data.content);
        }
      } catch (error) {
        console.error('Failed to load content:', error);
      }
    };
    loadContent();
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Initialize Leaflet icon
    const DefaultIcon = L.icon({
        iconUrl: icon,
        iconRetinaUrl: iconRetina,
        shadowUrl: iconShadow,
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        tooltipAnchor: [16, -28],
        shadowSize: [41, 41]
    });
    L.Marker.prototype.options.icon = DefaultIcon;

    if (mapRef.current && !map) {
        const mapInstance = L.map(mapRef.current).setView([14.639824708507915, 121.07880856560423], 16);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: ''
        }).addTo(mapInstance);

        const marker = L.marker([14.639824708507915, 121.07880856560423])
            .addTo(mapInstance)
            .bindPopup('Kapatid kita mahal kita Foundation<br>Lonergan Center, Ateneo de Manila University');

        setMap(mapInstance);
        setMapReady(true);
    }

    return () => {
        if (map) {
            map.remove();
        }
    };
}, [mapRef.current]);

  return (
<div className="contact-container">
    <div className='firstSection'>
      <div className='top-section'>
        <div className='contact-info'>
          <div className='ContactUs'>
            <h1 className="contact">{content.mainHeading}</h1>
            <p className="contactp">{content.mainDescription}</p>
            <p className="contactp">{content.email}</p>
            <p className="contactp">{content.phone}</p>
            <a className="contactc" href="https://facebook.com" target="https://facebook.com">Contact Support</a>
          </div>
          <div className='inquiry'>
            {content.sections.map((section, index) => (
              <div key={index} className={index === 0 ? "supp" : index === 1 ? "feedback" : "inquiries"}>
                <h4 className="inq">{section.title}</h4>
                <p className="inqp">{section.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <div className="contact-form">
        <h2>Get in Touch</h2>
        <p className="reach">You can reach us anytime</p>
        <form onSubmit={handleSubmit}>
          <div className="name-group">
              <input type="text" name="firstName" placeholder="First name" required />
              <input type="text" name="lastName" placeholder="Last name" required />
          </div>
          <div className="form-group">
              <input type="email" name="email" placeholder="Your email" required />
          </div>
          <div className="phone-group">
              <input type="tel" name="phone" placeholder="Phone number" required />
          </div>
          <div className="form-group">
              <textarea
                  name="message"
                  placeholder="How can we help?"
                  maxLength={120}
                  value={message}
                  onChange={handleMessageChange}
                  required
              />
              <div className="char-count">{charCount}/120</div>
          </div>
          <button type="submit" className="contact-submit-button">Submit</button>
          <p className="terms">
              By contacting us, you agree to our <a href="#">Terms of service</a> and{" "}
              <a href="#">Privacy</a>.
          </p>
        </form>
      </div>
    </div>

    <div className="secondSection">
        <div className='locations'>
            <div className="map-container1">
                <div ref={mapRef} style={{ height: '400px', width: '400px' }}></div>
            </div>
            <div className='locationtext'>
                <h6>{content.locationHeading}</h6>
                <h1>{content.locationTitle}</h1>
                <h3>{content.locationSubHeading}</h3>
                {content.address.map((line, index) => (
                  <p key={index} className="contactp">{line}</p>
                ))}
            </div>
        </div>
    </div>
</div>
  )
}

export default Contact
