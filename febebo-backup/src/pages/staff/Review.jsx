import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import TopBar from '../../components/TopBar';
import BottomNav from '../../components/BottomNav';
import { Star } from 'lucide-react';

const Review = () => {
  const navigate = useNavigate();
  const [rating, setRating] = useState(0);

  const handleSubmit = (e) => {
    e.preventDefault();
    alert('Review submitted successfully!');
    navigate('/');
  };

  return (
    <div className="app-container bg-white page-content">
      <TopBar title="Review & Rating" />
      
      <div className="padding-16">
        <form onSubmit={handleSubmit}>
          
          <div className="input-group text-center mb-16">
            <label className="input-label" style={{ marginBottom: '16px' }}>Click To Rate</label>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
              {[1, 2, 3, 4, 5].map((star) => (
                <Star 
                  key={star} 
                  size={32} 
                  onClick={() => setRating(star)}
                  fill={star <= rating ? 'var(--primary)' : 'none'}
                  color={star <= rating ? 'var(--primary)' : 'var(--text-muted)'}
                  style={{ cursor: 'pointer' }}
                />
              ))}
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Student Name</label>
            <input type="text" className="form-control" defaultValue="Ravi Kumar" />
          </div>

          <div className="input-group" style={{ margin: '24px 0' }}>
            <label className="input-label" style={{ marginBottom: '12px' }}>Student Behavior ?</label>
            <div style={{ display: 'flex', gap: '24px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input type="radio" name="behavior" value="good" defaultChecked style={{ accentColor: 'var(--primary)', width: '18px', height: '18px' }} />
                <span>Good</span>
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input type="radio" name="behavior" value="bad" style={{ accentColor: 'var(--primary)', width: '18px', height: '18px' }} />
                <span>Bad</span>
              </label>
            </div>
          </div>

          <div className="input-group">
            <label className="input-label">Description</label>
            <textarea className="form-control" rows="4"></textarea>
          </div>

          <div style={{ marginTop: '32px' }}>
            <button type="submit" className="btn-primary">Submit Review</button>
          </div>
        </form>
      </div>

      <BottomNav activeNav="review" />
    </div>
  );
};

export default Review;
