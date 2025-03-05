import React from 'react';

interface Distribution {
  category: string;
  itemName: string;
  quantity: number;
}

interface SectorDistributionsCardProps {
  sectorName: string;
  distributions: Distribution[];
  total: number;
  color: string;
}

const SectorDistributionsCard: React.FC<SectorDistributionsCardProps> = ({
  sectorName,
  distributions,
  total,
  color
}) => {
  // Group distributions by category
  const categoryTotals = distributions.reduce((acc, curr) => {
    if (!acc[curr.category]) {
      acc[curr.category] = 0;
    }
    acc[curr.category] += curr.quantity;
    return acc;
  }, {} as { [key: string]: number });

  return (
    <div className="sector-distributions-card" style={{ borderLeftColor: color }}>
      <h4>{sectorName}</h4>
      <div className="category-bars">
        {Object.entries(categoryTotals).map(([category, amount]) => (
          <div key={category} className="category-bar">
            <div className="bar-label">
              <span>{category}</span>
              <span>{amount.toLocaleString()}</span>
            </div>
            <div className="bar-container">
              <div 
                className="bar-fill"
                style={{ 
                  width: `${(amount / total) * 100}%`,
                  backgroundColor: color 
                }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="total-distributions">
        Total Items: {total.toLocaleString()}
      </div>
    </div>
  );
};

export default SectorDistributionsCard;