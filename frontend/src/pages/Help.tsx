import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import "../styles/Layout.css";
import bannerImage from "../img/coverphoto.png"
import donatepicture from "../img/donatepicture.png"
import volunteerpicture from "../img/volunteer.svg"
import partnerwithus from '../img/partnerwithus.svg';
import Ellipse from '../img/Ellipse.png';
import KMKK from '../img/KKMK.svg';
import KMKK2 from '../img/KKMK2.svg';
import yellowkid from '../img/yellowkid.png'
import DonationService from '../services/donationService';
import api from '../config/axios'; // Replace axios import

const Help: React.FC = () => {

  const [SearchParams, setSearchParams] = useSearchParams();
  const initialTab = SearchParams.get("tab") || "partner";
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [animationClass, setAnimationClass] = useState<string>("fade-in");
  const [donationType, setDonationType] = useState<string>("one-time"); // Set default value
  const [selectedFileName, setSelectedFileName] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>("gcash"); // Add payment method state

  useEffect(() => {
      setActiveTab(initialTab);
  }, [initialTab]);

  const handleTabChange = (tab: string) => {
    if (tab !== activeTab) {
      setAnimationClass("fade-out");
      setTimeout(() => {
        setActiveTab(tab);
        setAnimationClass("fade-in");
        setSearchParams({ tab });
      }, 300); 
    }
  };

  const handleDonationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const fileInput = form.querySelector('input[name="proofOfDonation"]') as HTMLInputElement;
    const file = fileInput?.files?.[0];
    
    try {
      if (donationType === 'one-time') {
        // Handle one-time monetary donation
        const formData = new FormData();
        formData.append('fullName', form.fullName.value);
        formData.append('email', form.email.value);
        formData.append('contactNumber', form.contactNumber.value);
        formData.append('amount', form.amount.value);
        formData.append('message', form.message.value); // Add message to FormData
        formData.append('date', new Date().toISOString());
        
        if (file) {
          formData.append('proofOfPayment', file);
        }

        const response = await api.post('/donations', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        if (response.data) {
          alert('Donation submitted successfully!');
          form.reset();
          setSelectedFileName('');
        }
      } else if (donationType === 'regular') {
        // Handle regular donation
        const response = await api.post('/inventory/regular', {
          donatorName: form.fullName.value,
          email: form.email.value,
          contactNumber: form.contactNumber.value,
          item: form.item.value,
          quantity: parseInt(form.amount.value),
          category: form.category.value,
          frequency: form.frequency.value,
          type: 'regular'
        });
        
        if (response.data) {
          alert('Regular donation submitted successfully!');
          form.reset();
        }
      } else if (donationType === 'in-kind') {
        // Handle in-kind donation
        const response = await api.post('/inventory/inkind', {
          donatorName: form.fullName.value,
          email: form.email.value,
          contactNumber: form.contactNumber.value,
          item: form.item.value,
          quantity: parseInt(form.amount.value),
          category: form.category.value,
          type: 'in-kind'
        });
        
        if (response.data) {
          alert('In-kind donation submitted successfully!');
          form.reset();
        }
      }
    } catch (error) {
      console.error('Donation submission error:', error);
      alert('Error submitting donation: ' + (error as Error).message);
    }
  };

  const renderDonationForm = () => (
    <form className="donation-form" onSubmit={handleDonationSubmit}>
      <div className="form-main-fields">
        <div className="form-groupss">
          <label>Full Name:</label>
          <input name="fullName" type="text" required placeholder="Enter your full name" />
        </div>
        <div className="form-groupss">
          <label>Email:</label>
          <input name="email" type="email" required placeholder="Enter your email" />
        </div>
        
        <div className="form-groupss">
          <label>Contact Number:</label>
          <input name="contactNumber" type="tel" required placeholder="Enter your contact number" />
        </div>

        <div className="form-groupss">
          <label>Donation Type:</label>
          <select 
            required 
            value={donationType}
            onChange={(e) => setDonationType(e.target.value)}
          >
            <option value="one-time">One-time Donation</option>
            <option value="regular">Regular Donation</option>
            <option value="in-kind">In-kind Donation</option>
          </select>
        </div>

        {/* Item name and category fields only for in-kind and regular donations */}
        {(donationType === 'in-kind' || donationType === 'regular') && (
          <>
            <div className="form-groupss">
              <label>Item Name:</label>
              <input name="item" type="text" required placeholder="Enter item name" />
            </div>

            <div className="form-groupss">
              <label>Category:</label>
              <select name="category" required>
                <option value="">Select a category</option>
                <option value="Food & Nutrition">Food & Nutrition</option>
                <option value="Clothing & Footwear">Clothing & Footwear</option>
                <option value="Medical Supplies & Medicines">Medical Supplies & Medicines</option>
                <option value="School Supplies & Educational Materials">School Supplies & Educational Materials</option>
                <option value="Disaster Relief Essentials">Disaster Relief Essentials</option>
                <option value="Household & Hygiene Products">Household & Hygiene Products</option>
                <option value="Technology & Learning Tools">Technology & Learning Tools</option>
                <option value="Others">Others</option>
              </select>
            </div>
          </>
        )}

        {/* Modified Amount/Quantity field - Only show for in-kind or one-time donations */}
        {donationType !== 'regular' && (
          <div className="form-groupss">
            <label>{donationType === "in-kind" ? "Quantity:" : "Amount (PHP):"}</label>
            <input 
              name="amount"
              type="number"
              required 
              min="1"
              placeholder={donationType === "in-kind" ? "Enter quantity" : "Enter amount"}
            />
          </div>
        )}

        {/* Regular donation specific fields */}
        {donationType === 'regular' && (
          <>
            <div className="form-groupss">
              <label>Quantity:</label>
              <input 
                name="amount"
                type="number"
                required 
                min="1"
                placeholder="Enter quantity"
              />
            </div>
            <div className="form-groupss">
              <label>Frequency:</label>
              <select name="frequency" required>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="annually">Annually</option>
              </select>
            </div>
          </>
        )}

        {/* Payment method selector for one-time donations */}
        {donationType === 'one-time' && (
          <div className="form-groupss">
            <label>Payment Method:</label>
            <div className="payment-method-tabs">
              <div 
                className={`payment-tab payment-tab-gcash ${paymentMethod === 'gcash' ? 'active' : ''}`}
                onClick={() => setPaymentMethod('gcash')}
              >
                GCash
              </div>
              <div 
                className={`payment-tab payment-tab-bank ${paymentMethod === 'bank' ? 'active' : ''}`}
                onClick={() => setPaymentMethod('bank')}
              >
                Bank Transfer
              </div>
            </div>
            
            <div className="payment-detailss">
              {paymentMethod === 'gcash' && (
                <div className="gcash-details">
                  <h4>GCash Information</h4>
                  <p><strong>Account Name:</strong> KM Foundation</p>
                  <p><strong>GCash Number:</strong> +63-939-3031-767</p>
                  <p>Please send your donation to the GCash account above and upload your screenshot as proof of payment.</p>
                </div>
              )}
              
              {paymentMethod === 'bank' && (
                <div className="bank-details">
                  <h4>Bank Information</h4>
                  <p><strong>Bank Name:</strong> BDO</p>
                  <p><strong>Account Name:</strong> KM Foundation</p>
                  <p><strong>Account Number:</strong> 5125-7178-1234-5678</p>
                  <p><strong>Branch:</strong> Main Branch</p>
                  <p>Please transfer your donation to the bank account above and upload your receipt as proof of payment.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* File upload for one-time donations */}
        {donationType === 'one-time' && (
          <>
<div className="form-groupss" style={{ gridColumn: '1 / -1' }}>
              <label>Proof of Donation (Optional):</label>
              <div className={`file-input-container ${selectedFileName ? 'has-file' : ''}`}
                   data-file-name={selectedFileName || 'Choose File'}>
                <input 
                  type="file" 
                  name="proofOfDonation"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      if (file.size > 5 * 1024 * 1024) {
                        alert('File size should be less than 5MB');
                        e.target.value = '';
                        setSelectedFileName('');
                      } else {
                        setSelectedFileName(file.name);
                      }
                    } else {
                      setSelectedFileName('');
                    }
                  }}
                />
              </div>
              <small>Supported formats: JPG, PNG. Max size: 5MB</small>
            </div>

            <div className="form-groupss">
              <label>Message (Optional):</label>
              <textarea 
                name="message"
                placeholder="Enter your message or special instructions"
                rows={4}
              />
            </div>
          </>
        )}
      </div>

      <button type="submit" className="submit-button">Submit Donation Form</button>
    </form>
  );

  const renderContent = () => {
    switch (activeTab) {
      case "partner":
        return (
          <div className={`tab-content ${animationClass}`}>
            <div className="partner-section">
              <div className="partner-content">
                <h1>Partner with Us</h1>
                <p>
                  We welcome collaborations with organizations, corporations, and individuals who share our vision of
                  empowering underprivileged communities through education and support.
                </p>
                <p>
                  We offer flexible partnership options tailored to suit your specific goals and preferences. Whether
                  you’re looking to sponsor a student, organize a fundraising event, or initiate a corporate giving
                  program, we’re here to work with you every step of the way.
                </p>
                <p>
                  Together, we can create positive change and build a brighter future for those in need. Partner with us
                  today and be a part of something truly impactful.
                </p>
              </div>
              <img src={partnerwithus} alt="Partner with Us" className="partner-icon" />
            </div>
          </div>
        );
        case "sponsor":
          return (
            <div className={`tab-content ${animationClass}`}>
              <div className="page-container">
               <div className="sponsor-container">
    <div className="sponsor-text">
<h1>Sponsor a Student</h1>
<p>By sponsoring one of the following students, you will give them the opportunity to get an education so they can escape the cycle of poverty. Your contribution pays for their transportation to school, uniforms, books, tuition, and other school-related expenses.</p>
<p>Once you’ve chosen the student you would like to sponsor, we will send you a more detailed student profile. At that point, we will start your student sponsorship based on a donation of:</p>
</div>
 </div>
              <div className="shape-container">
                
              <div className="shape">
              <h1>PHP 12,000 /
                School year
              </h1>
              <h1>for k - Grade 6
                Students
              </h1>
              </div>
              <div className="shape">
              <h1>PHP 12,000 /
                School year
              </h1>
              <h1>for k - Grade 6
                Students
              </h1>
              </div>
              <div className="shape">
              <h1>PHP 12,000 /
                School year
              </h1>
              <h1>for k - Grade 6
                Students
              </h1>
              </div>
              <div className="shape">
              <h1>PHP 12,000 /
                School year
              </h1>
              <h1>for k - Grade 6
                Students
              </h1>
              </div>
              </div>

              <div className="sponsorp-text">
              <p>You may either set up a recurring monthly donation, or you may make a one-time payment for an annual sponsorship. If you choose an annual sponsorship, we will send you a renewal request when it’s about to expire. 
                Our hope is that, like almost all of our sponsors, you will opt to continue helping your student. Your commitment means the world to these children and, in turn, they will strive to honor your participation in their education.</p>
                </div>
              
              </div>
             
           </div>
          );
      case "donate":
        return (
          <div className={`tab-content ${animationClass}`}>
            <div className="donate-container">
              <div className="donate-text">
                <h1 className="donate-text">Donate</h1>
                <p>
                  By making a donation to KM Foundation, you can support our various programs and initiatives aimed at
                  uplifting underprivileged communities. Whether you choose to make a one-time donation, a regular
                  contribution, or an in-kind donation, your generosity will make a meaningful difference in the lives of
                  those in need.
                </p>
                <ul>
                  <li>
                    <b>One-time Donation:</b>
                    <ul>
                      <li>Housing Assistance/Repair</li>
                      <li>Recreational Activities of Children (Educational Tour)</li>
                      <li>General/Administrative Fund of the Foundation</li>
                    </ul>
                  </li>
                  <li>
                    <b>Regular Donation:</b>
                    <ul>
                      <li>Feeding Programs</li>
                    </ul>
                  </li>
                  <li>
                    <b>In-kind Donation:</b>
                    <ul>
                      <li>
                        Contribute by donating essential items such as food, clothing, medicines, and more. Your
                        thoughtful donations can make a meaningful impact on the lives of those in need.
                      </li>
                    </ul>
                  </li>
                </ul>
              </div>
              <div className="donate-picture">
                <img src={donatepicture} alt="Donate" />
              </div>
            </div>
            
            {/* Add donation form */}
            <div className="donation-form-container">
              <h2>Donation Form</h2>
              {renderDonationForm()}
              <div className="donation-note">
                <p><strong>Note:</strong> After submitting this form, our team will contact you with further instructions for completing your donation.</p>
              </div>
            </div>
          </div>
        );
        case "volunteer":
          return (
            <div className={`tab-content ${animationClass}`}>
              <div className="volunteer-container">
                <div className="volunteer-text">
                  <h1 className="volunteer-text">Become a Volunteer</h1>
                  <p>
                  Volunteering is a rewarding opportunity to make a positive impact in the lives of others while contributing to meaningful projects and initiatives. Whether you’re passionate about education, the arts, digital media, or community engagement, there are various ways you can get involved and lend your skills and expertise to support our mission. 
                  </p>
                 <p>
                 These volunteer activities are just a few examples of how you can get involved and contribute your time and talents to support our organization’s mission. We welcome individuals with diverse skills, backgrounds, and interests to join us in creating positive change and empowering communities in need. If you’re interested in volunteering with us or learning more about our volunteer opportunities, please contact us for further information.
                 </p>
                </div>
                <div className="volunteer-picture">
                  <img src={volunteerpicture} alt="Volunteer" />
                </div>
              </div>
            </div>
          );
          case "faq":
            return (
              <div className={`tab-content ${animationClass}`}>
                <div className="faq-container">
    <div className="faq-item1">
      <div>
        <a href="your-link-1">
          <img src={KMKK} alt="FAQ" />
        </a>
      </div>
      <div className="faq-text">
        <a href="your-link-1">
          <h1>Best Practice for Donating Safely Online with Kmkk</h1>
        </a><br />
        <p>Answers to “How can I donate safely online?”</p>
        <div className="kmkk-team">
          <img src={Ellipse} alt="FAQ" />
          <p>by Kmkk Team</p>
        </div>
      </div>
    </div>

    <div className="faq-item2">
      <div>
        <a href="your-link-2">
          <img src={KMKK2} alt="FAQ" />
        </a>
      </div>
      <div className="faq-text">
        <a href="your-link-2">
          <h1>Are There More Ways I Can Help Beyond Donating?</h1>
        </a><br />
        <p>You can help further the causes you care about with these ideas.</p>
        <div className="kmkk-team">
          <img src={Ellipse} alt="FAQ" />
          <p>by Kmkk Team</p>
        </div>
      </div>
    </div>
  </div>
              </div>
            );
      default:
        return null;
    }
  };



  return (
    <div className="home-container">
      <img src={bannerImage} className="banner-image"></img>
    <div className="page-container">
   <div className="help-tabs">
      <div className="tabs-header">
        <button
          className={`tab-button ${activeTab === "partner" ? "active" : ""}`}
          onClick={() => handleTabChange("partner")}
        >
          PARTNER WITH US
        </button>
        <button
          className={`tab-button ${activeTab === "sponsor" ? "active" : ""}`}
          onClick={() => handleTabChange("sponsor")}
        >
          SPONSOR A STUDENT
        </button>
        <button
          className={`tab-button ${activeTab === "donate" ? "active" : ""}`}
          onClick={() => handleTabChange("donate")}
        >
          DONATE
        </button>
        <button
          className={`tab-button ${activeTab === "volunteer" ? "active" : ""}`}
          onClick={() => handleTabChange("volunteer")}
        >
          VOLUNTEER
        </button>
        <button
          className={`tab-button ${activeTab === "faq" ? "active" : ""}`}
          onClick={() => handleTabChange("faq")}
        >
          FAQ
        </button>
      </div>
      <div className="tabs-content">{renderContent()}</div>
    </div>
  </div>
  </div>
);
};


export default Help;
