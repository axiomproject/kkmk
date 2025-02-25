import React from 'react';
import './ProcessTimeline.css';

interface ProcessTimelineProps {
  currentStep: number;
}

const ProcessTimeline: React.FC<ProcessTimelineProps> = ({ currentStep }) => {
  return (
    <div className="timeline-container">
      <div className="timeline">
        <div className={`timeline-step ${currentStep >= 1 ? 'active' : ''}`}>
          <div className="process-icon general-requirements"></div>
          <p>GENERAL REQUIREMENTS AND INTERVIEW</p>
        </div>

        <div className={`timeline-line ${currentStep >= 2 ? 'active' : ''}`}></div>

        <div className={`timeline-step ${currentStep >= 2 ? 'active' : ''}`}>
          <div className="process-icon ssc-approval"></div>
          <p>ENDORSED TO SSC APPROVAL</p>
        </div>

        <div className={`timeline-line ${currentStep >= 3 ? 'active' : ''}`}></div>

        <div className={`timeline-step ${currentStep >= 3 ? 'active' : ''}`}>
          <div className="process-icon approved-application"></div>
          <p>APPROVED APPLICATION</p>
        </div>
      </div>
    </div>
  );
};

export default ProcessTimeline;
