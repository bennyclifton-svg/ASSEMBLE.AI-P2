import React, { useState, useEffect } from 'react';

const AssemblePrecisionLight = () => {
  const [activeTab, setActiveTab] = useState('Procurement');
  const [activeProjectType, setActiveProjectType] = useState('Industrial');
  const [activeDocCategory, setActiveDocCategory] = useState('Scheme Design');
  const [activeConsultant, setActiveConsultant] = useState('Architect');
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setLoaded(true);
  }, []);

  const projectTypes = [
    { id: 'Pre-Development', icon: '◇' },
    { id: 'Residential', icon: '⌂' },
    { id: 'Commercial', icon: '▣' },
    { id: 'Industrial', icon: '⚙' },
    { id: 'Refurbishment', icon: '↻' },
  ];

  const consultants = [
    { name: 'Acoustic', icon: '◎' },
    { name: 'Arborist', icon: '❋' },
    { name: 'Architect', icon: '△' },
    { name: 'BIM Manager', icon: '⬡' },
    { name: 'Building Services', icon: '◈' },
    { name: 'Surveyor', icon: '◫' },
  ];

  const documents = [
    { name: 'SD-STR-003-Core-Wall', category: 'Procurement', status: 'active' },
    { name: 'SD-STR-001-Foundation', category: 'Delivery', status: 'complete' },
    { name: 'SD-ARC-004-Facade', category: 'Procurement', status: 'active' },
    { name: 'SD-MEC-002-Plant', category: 'Delivery', status: 'review' },
    { name: 'SD-ARC-061-Ground', category: 'Scheme Design', status: 'active' },
    { name: 'SD-ARC-005-Material', category: 'Scheme Design', status: 'draft' },
  ];

  const docCategories = [
    { name: 'Planning', count: 4 },
    { name: 'Scheme Design', count: 12 },
    { name: 'Detail Design', count: 8 },
    { name: 'Procurement', count: 17 },
    { name: 'Delivery', count: 6 },
  ];

  const getStatusColor = (status) => {
    switch(status) {
      case 'active': return '#B8895A';
      case 'complete': return '#5D7E5F';
      case 'review': return '#C4960C';
      default: return '#8A8279';
    }
  };

  return (
    <div className="container">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
        
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        
        .container {
          display: grid;
          grid-template-columns: 260px 1fr 280px;
          min-height: 100vh;
          background-color: #FAF8F5;
          color: #2A2520;
          font-family: 'DM Sans', -apple-system, sans-serif;
          position: relative;
          overflow: hidden;
        }
        
        .grid-overlay {
          position: absolute;
          inset: 0;
          background-image: 
            linear-gradient(rgba(180, 140, 100, 0.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(180, 140, 100, 0.06) 1px, transparent 1px);
          background-size: 32px 32px;
          pointer-events: none;
          z-index: 0;
        }
        
        .left-panel {
          background-color: #F5F2ED;
          border-right: 1px solid rgba(180, 140, 100, 0.2);
          padding: 20px;
          display: flex;
          flex-direction: column;
          gap: 20px;
          position: relative;
          z-index: 1;
          animation: slideIn 0.5s ease-out;
        }
        
        .main-content {
          padding: 20px 28px;
          display: flex;
          flex-direction: column;
          gap: 20px;
          position: relative;
          z-index: 1;
          animation: slideIn 0.5s ease-out 0.1s both;
        }
        
        .right-panel {
          background-color: #F5F2ED;
          border-left: 1px solid rgba(180, 140, 100, 0.2);
          padding: 20px;
          display: flex;
          flex-direction: column;
          position: relative;
          z-index: 1;
          animation: slideIn 0.5s ease-out 0.2s both;
        }
        
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .logo {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 8px;
        }
        
        .logo-icon {
          font-size: 22px;
          color: #B8895A;
        }
        
        .logo-text {
          font-size: 18px;
          font-weight: 600;
          letter-spacing: -0.5px;
          color: #2A2520;
        }
        
        .logo-ai {
          font-size: 18px;
          font-weight: 300;
          color: #B8895A;
        }
        
        .section-header {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        
        .section-label {
          font-size: 9px;
          font-weight: 600;
          letter-spacing: 2px;
          color: #8A8279;
          text-transform: uppercase;
        }
        
        .section-divider {
          flex: 1;
          height: 1px;
          background: linear-gradient(90deg, rgba(180, 140, 100, 0.5), transparent);
        }
        
        .project-card {
          background: linear-gradient(135deg, rgba(184, 137, 90, 0.08), rgba(184, 137, 90, 0.03));
          border: 1px solid rgba(180, 140, 100, 0.25);
          border-radius: 10px;
          padding: 16px;
          box-shadow: 0 2px 8px rgba(180, 140, 100, 0.08);
        }
        
        .project-title {
          font-size: 15px;
          font-weight: 600;
          margin-bottom: 3px;
          letter-spacing: -0.3px;
          color: #2A2520;
        }
        
        .project-address {
          font-size: 11px;
          color: #5C554C;
          margin-bottom: 14px;
          line-height: 1.4;
        }
        
        .project-meta {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }
        
        .meta-item {
          display: flex;
          flex-direction: column;
          gap: 1px;
        }
        
        .meta-label {
          font-size: 9px;
          color: #8A8279;
          text-transform: uppercase;
          letter-spacing: 0.8px;
        }
        
        .meta-value {
          font-size: 12px;
          font-weight: 500;
          color: #2A2520;
        }
        
        .type-button {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          background: transparent;
          border: 1px solid rgba(180, 140, 100, 0.2);
          border-radius: 6px;
          color: #5C554C;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: inherit;
          font-size: 12px;
        }
        
        .type-button:hover {
          border-color: rgba(184, 137, 90, 0.5);
          background: rgba(184, 137, 90, 0.05);
        }
        
        .type-button.active {
          background: rgba(184, 137, 90, 0.12);
          border-color: #B8895A;
          color: #2A2520;
          box-shadow: 0 2px 8px rgba(184, 137, 90, 0.15);
        }
        
        .type-icon {
          font-size: 14px;
          width: 20px;
          text-align: center;
          color: #B8895A;
        }
        
        .progress-section {
          margin-top: auto;
          padding: 14px;
          background: linear-gradient(135deg, rgba(184, 137, 90, 0.1), rgba(184, 137, 90, 0.05));
          border-radius: 8px;
          border: 1px solid rgba(180, 140, 100, 0.15);
        }
        
        .progress-header {
          display: flex;
          justify-content: space-between;
          margin-bottom: 8px;
        }
        
        .progress-label {
          font-size: 11px;
          color: #5C554C;
        }
        
        .progress-value {
          font-size: 11px;
          font-weight: 600;
          color: #9A7348;
        }
        
        .progress-bar {
          height: 4px;
          background: rgba(180, 140, 100, 0.2);
          border-radius: 2px;
          overflow: hidden;
        }
        
        .progress-fill {
          width: 34%;
          height: 100%;
          background: linear-gradient(90deg, #B8895A, #D4A574);
          border-radius: 2px;
          transition: width 1s ease-out;
        }
        
        .main-nav {
          display: flex;
          gap: 6px;
          border-bottom: 1px solid rgba(180, 140, 100, 0.2);
          padding-bottom: 14px;
        }
        
        .nav-tab {
          position: relative;
          padding: 6px 16px;
          background: transparent;
          border: none;
          color: #8A8279;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: color 0.2s ease;
          font-family: inherit;
        }
        
        .nav-tab:hover {
          color: #5C554C;
        }
        
        .nav-tab.active {
          color: #2A2520;
        }
        
        .nav-indicator {
          position: absolute;
          bottom: -15px;
          left: 50%;
          transform: translateX(-50%);
          width: 32px;
          height: 2px;
          background: linear-gradient(90deg, #B8895A, #D4A574);
          border-radius: 1px;
        }
        
        .consultant-header {
          display: flex;
          justify-content: space-between;
          align-items: baseline;
          margin-bottom: 12px;
        }
        
        .consultant-title {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 1.2px;
          text-transform: uppercase;
          color: #5C554C;
        }
        
        .consultant-subtitle {
          font-size: 11px;
          color: #8A8279;
        }
        
        .consultant-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
        }
        
        .consultant-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          padding: 14px 10px;
          background: #FFFFFF;
          border: 1px solid rgba(180, 140, 100, 0.18);
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: 0 1px 3px rgba(180, 140, 100, 0.08);
        }
        
        .consultant-card:hover {
          border-color: rgba(184, 137, 90, 0.5);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(184, 137, 90, 0.12);
        }
        
        .consultant-card.active {
          background: linear-gradient(135deg, rgba(184, 137, 90, 0.12), rgba(184, 137, 90, 0.06));
          border-color: #B8895A;
          box-shadow: 0 4px 12px rgba(184, 137, 90, 0.18);
        }
        
        .consultant-icon {
          font-size: 20px;
          color: #B8895A;
        }
        
        .consultant-name {
          font-size: 10px;
          font-weight: 500;
          text-align: center;
          color: #2A2520;
        }
        
        .consultant-badge {
          font-size: 8px;
          padding: 2px 6px;
          background: linear-gradient(135deg, #B8895A, #9A7348);
          color: #FFFFFF;
          border-radius: 3px;
          font-weight: 600;
          letter-spacing: 0.5px;
        }
        
        .add-card {
          background: transparent;
          border: 1px dashed rgba(180, 140, 100, 0.35);
          box-shadow: none;
        }
        
        .add-card:hover {
          border-color: rgba(184, 137, 90, 0.6);
          background: rgba(184, 137, 90, 0.05);
        }
        
        .add-icon {
          font-size: 20px;
          color: #8A8279;
        }
        
        .add-label {
          font-size: 10px;
          color: #8A8279;
        }
        
        .rft-section {
          background: #FFFFFF;
          border: 1px solid rgba(180, 140, 100, 0.18);
          border-radius: 14px;
          overflow: hidden;
          flex: 1;
          box-shadow: 0 2px 12px rgba(180, 140, 100, 0.08);
        }
        
        .rft-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          border-bottom: 1px solid rgba(180, 140, 100, 0.15);
          background: linear-gradient(135deg, rgba(184, 137, 90, 0.08), rgba(184, 137, 90, 0.02));
        }
        
        .rft-title {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        
        .rft-badge {
          font-size: 10px;
          font-weight: 700;
          padding: 3px 8px;
          background: linear-gradient(135deg, #B8895A, #9A7348);
          color: #FFFFFF;
          border-radius: 3px;
          letter-spacing: 1px;
        }
        
        .rft-name {
          font-size: 15px;
          font-weight: 600;
          letter-spacing: -0.3px;
          color: #2A2520;
        }
        
        .rft-actions {
          display: flex;
          gap: 10px;
        }
        
        .action-btn {
          padding: 8px 14px;
          background: transparent;
          border: 1px solid rgba(180, 140, 100, 0.35);
          border-radius: 6px;
          color: #2A2520;
          font-size: 11px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: inherit;
        }
        
        .action-btn:hover {
          border-color: rgba(184, 137, 90, 0.6);
          background: rgba(184, 137, 90, 0.08);
        }
        
        .action-btn.primary {
          background: linear-gradient(135deg, #B8895A, #9A7348);
          border: none;
          color: #FFFFFF;
          font-weight: 600;
          box-shadow: 0 2px 8px rgba(184, 137, 90, 0.25);
        }
        
        .action-btn.primary:hover {
          filter: brightness(1.08);
          box-shadow: 0 4px 12px rgba(184, 137, 90, 0.35);
        }
        
        .rft-content {
          padding: 20px;
          display: grid;
          grid-template-columns: 1fr 1.2fr;
          gap: 24px;
        }
        
        .rft-details {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        
        .detail-row {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        
        .detail-label {
          font-size: 9px;
          color: #8A8279;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        
        .detail-value {
          font-size: 13px;
          font-weight: 500;
          color: #2A2520;
        }
        
        .detail-date {
          font-size: 11px;
          color: #B8895A;
          margin-left: 6px;
          font-weight: 500;
        }
        
        .objectives-title {
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          color: #8A8279;
          margin-bottom: 10px;
        }
        
        .objective-card {
          padding: 12px;
          background: linear-gradient(135deg, rgba(184, 137, 90, 0.06), rgba(184, 137, 90, 0.02));
          border: 1px solid rgba(180, 140, 100, 0.15);
          border-radius: 6px;
          margin-bottom: 8px;
        }
        
        .objective-header {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 6px;
        }
        
        .objective-icon {
          font-size: 10px;
          color: #B8895A;
        }
        
        .objective-label {
          font-size: 11px;
          font-weight: 600;
          color: #2A2520;
        }
        
        .objective-text {
          font-size: 11px;
          line-height: 1.5;
          color: #5C554C;
        }
        
        .doc-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }
        
        .doc-title {
          font-size: 15px;
          font-weight: 600;
          letter-spacing: -0.3px;
          color: #2A2520;
        }
        
        .upload-btn {
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, rgba(184, 137, 90, 0.15), rgba(184, 137, 90, 0.08));
          border: 1px solid rgba(180, 140, 100, 0.3);
          border-radius: 6px;
          color: #B8895A;
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 14px;
        }
        
        .upload-btn:hover {
          background: linear-gradient(135deg, rgba(184, 137, 90, 0.25), rgba(184, 137, 90, 0.15));
          border-color: #B8895A;
        }
        
        .doc-categories {
          display: flex;
          flex-direction: column;
          gap: 3px;
          margin-bottom: 16px;
        }
        
        .doc-category {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 8px 10px;
          background: transparent;
          border: none;
          border-radius: 6px;
          color: #5C554C;
          cursor: pointer;
          transition: all 0.2s ease;
          font-family: inherit;
          text-align: left;
        }
        
        .doc-category:hover {
          background: rgba(184, 137, 90, 0.08);
        }
        
        .doc-category.active {
          background: rgba(184, 137, 90, 0.15);
          color: #2A2520;
        }
        
        .doc-category-name {
          font-size: 12px;
          font-weight: 500;
        }
        
        .doc-category-count {
          font-size: 10px;
          font-weight: 600;
          color: #9A7348;
          background: rgba(184, 137, 90, 0.18);
          padding: 2px 7px;
          border-radius: 8px;
        }
        
        .doc-list {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 6px;
          overflow: auto;
        }
        
        .doc-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 10px 12px;
          background: #FFFFFF;
          border: 1px solid rgba(180, 140, 100, 0.15);
          border-radius: 6px;
          transition: all 0.2s ease;
          box-shadow: 0 1px 2px rgba(180, 140, 100, 0.05);
        }
        
        .doc-item:hover {
          border-color: rgba(184, 137, 90, 0.4);
          background: rgba(184, 137, 90, 0.03);
          box-shadow: 0 2px 8px rgba(184, 137, 90, 0.1);
        }
        
        .doc-item-left {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        
        .doc-status {
          width: 6px;
          height: 6px;
          border-radius: 50%;
        }
        
        .doc-name {
          font-size: 11px;
          font-weight: 500;
          color: #2A2520;
        }
        
        .doc-category-tag {
          font-size: 9px;
          font-weight: 600;
          padding: 2px 6px;
          background: rgba(180, 140, 100, 0.12);
          color: #5C554C;
          border-radius: 3px;
          letter-spacing: 0.3px;
        }
        
        .doc-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 14px;
          padding-top: 14px;
          border-top: 1px solid rgba(180, 140, 100, 0.2);
        }
        
        .doc-footer-text {
          font-size: 10px;
          color: #8A8279;
        }
        
        .view-all-btn {
          font-size: 10px;
          font-weight: 600;
          color: #B8895A;
          background: transparent;
          border: none;
          cursor: pointer;
          font-family: inherit;
        }
        
        .view-all-btn:hover {
          text-decoration: underline;
        }
      `}</style>
      
      <div className="grid-overlay" />
      
      {/* Left Panel */}
      <aside className="left-panel">
        <div className="logo">
          <span className="logo-icon">▦</span>
          <span className="logo-text">assemble</span>
          <span className="logo-ai">.ai</span>
        </div>

        <div className="section-header">
          <span className="section-label">Project</span>
          <span className="section-divider" />
        </div>

        <div className="project-card">
          <h2 className="project-title">Unit 10 Extension Works</h2>
          <p className="project-address">145-151 Arthur Street, Homebush West NSW</p>
          
          <div className="project-meta">
            <div className="meta-item">
              <span className="meta-label">Lot Area</span>
              <span className="meta-value">2,135 m²</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Stories</span>
              <span className="meta-value">2</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Class</span>
              <span className="meta-value">Warehouse</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Zoning</span>
              <span className="meta-value">Industrial</span>
            </div>
          </div>
        </div>

        <div className="section-header">
          <span className="section-label">Type</span>
          <span className="section-divider" />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          {projectTypes.map((type) => (
            <button
              key={type.id}
              className={`type-button ${activeProjectType === type.id ? 'active' : ''}`}
              onClick={() => setActiveProjectType(type.id)}
            >
              <span className="type-icon">{type.icon}</span>
              <span>{type.id}</span>
            </button>
          ))}
        </div>

        <div className="progress-section">
          <div className="progress-header">
            <span className="progress-label">Project Completion</span>
            <span className="progress-value">34%</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: loaded ? '34%' : '0%' }} />
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <nav className="main-nav">
          {['Procurement', 'Cost Planning', 'Program', 'Analytics'].map((tab) => (
            <button
              key={tab}
              className={`nav-tab ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
              {activeTab === tab && <span className="nav-indicator" />}
            </button>
          ))}
        </nav>

        <section>
          <div className="consultant-header">
            <h3 className="consultant-title">Select Consultant</h3>
            <span className="consultant-subtitle">RFT Package</span>
          </div>
          
          <div className="consultant-grid">
            {consultants.map((consultant) => (
              <div
                key={consultant.name}
                className={`consultant-card ${activeConsultant === consultant.name ? 'active' : ''}`}
                onClick={() => setActiveConsultant(consultant.name)}
              >
                <div className="consultant-icon">{consultant.icon}</div>
                <span className="consultant-name">{consultant.name}</span>
                {activeConsultant === consultant.name && (
                  <span className="consultant-badge">ACTIVE</span>
                )}
              </div>
            ))}
            <div className="consultant-card add-card">
              <span className="add-icon">+</span>
              <span className="add-label">Add Firm</span>
            </div>
          </div>
        </section>

        <section className="rft-section">
          <div className="rft-header">
            <div className="rft-title">
              <span className="rft-badge">RFT</span>
              <h3 className="rft-name">Architect Services</h3>
            </div>
            <div className="rft-actions">
              <button className="action-btn">Save Transmittal</button>
              <button className="action-btn primary">Download Package</button>
            </div>
          </div>

          <div className="rft-content">
            <div className="rft-details">
              <div className="detail-row">
                <span className="detail-label">Project</span>
                <span className="detail-value">Unit 10 Extension Works</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Address</span>
                <span className="detail-value">145-151 Arthur Street, Homebush West NSW</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Document</span>
                <span className="detail-value">
                  RFT Architect
                  <span className="detail-date">21/12/2025</span>
                </span>
              </div>
            </div>

            <div>
              <h4 className="objectives-title">Objectives</h4>
              
              <div className="objective-card">
                <div className="objective-header">
                  <span className="objective-icon">◈</span>
                  <span className="objective-label">Functional</span>
                </div>
                <p className="objective-text">
                  Provide single-level warehouse tenancy with mezzanine office for storage, 
                  distribution, and materials handling.
                </p>
              </div>

              <div className="objective-card">
                <div className="objective-header">
                  <span className="objective-icon">◈</span>
                  <span className="objective-label">Quality</span>
                </div>
                <p className="objective-text">
                  Achieve institutional investment-grade product with high-quality finishes 
                  and industry best practices.
                </p>
              </div>

              <div className="objective-card">
                <div className="objective-header">
                  <span className="objective-icon">◈</span>
                  <span className="objective-label">Budget</span>
                </div>
                <p className="objective-text">
                  Design to maximize usable area within 2,135 m² gross lettable area with 
                  cost-effective construction.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Right Panel */}
      <aside className="right-panel">
        <div className="doc-header">
          <h3 className="doc-title">Documents</h3>
          <button className="upload-btn">↑</button>
        </div>

        <div className="doc-categories">
          {docCategories.map((cat) => (
            <button
              key={cat.name}
              className={`doc-category ${activeDocCategory === cat.name ? 'active' : ''}`}
              onClick={() => setActiveDocCategory(cat.name)}
            >
              <span className="doc-category-name">{cat.name}</span>
              <span className="doc-category-count">{cat.count}</span>
            </button>
          ))}
        </div>

        <div className="doc-list">
          {documents.map((doc, idx) => (
            <div key={idx} className="doc-item">
              <div className="doc-item-left">
                <span 
                  className="doc-status" 
                  style={{ backgroundColor: getStatusColor(doc.status) }}
                />
                <span className="doc-name">{doc.name}</span>
              </div>
              <span className="doc-category-tag">{doc.category}</span>
            </div>
          ))}
        </div>

        <div className="doc-footer">
          <span className="doc-footer-text">17 documents in package</span>
          <button className="view-all-btn">View All →</button>
        </div>
      </aside>
    </div>
  );
};

export default AssemblePrecisionLight;
