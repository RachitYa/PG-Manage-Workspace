import React, { useState } from 'react';
import { TopBar } from '../App';
import BottomNav from '../components/BottomNav';
import { Star, CheckCircle, AlertCircle } from 'lucide-react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import './Rating.css';

const Rating = () => {
  const { user } = useAuth();
  const [rating, setRating] = useState(4);
  const [behavior, setBehavior] = useState('Good');
  const [selectedStaff, setSelectedStaff] = useState('Electrician');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    if (!description.trim()) {
      setError('Please write a short description before submitting.');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'users', user.uid, 'ratings'), {
        rating,
        behavior,
        staffType: selectedStaff,
        description,
        createdAt: new Date().toISOString()
      });
      setSubmitted(true);
      // Reset form after 2.5 seconds
      setTimeout(() => {
        setSubmitted(false);
        setRating(4);
        setBehavior('Good');
        setSelectedStaff('Electrician');
        setDescription('');
      }, 2500);
    } catch (err) {
      console.error('Error saving review:', err);
      alert('Failed to submit review. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="page-content bg-white" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px' }}>
        <CheckCircle size={64} color="#16a34a" />
        <h2 style={{ color: '#0f172a', fontWeight: '800' }}>Review Submitted!</h2>
        <p style={{ color: '#64748b', textAlign: 'center' }}>Thank you for your feedback. It helps us improve our services.</p>
        <BottomNav activeNav="" />
      </div>
    );
  }

  return (
    <div className="page-content bg-white">
      <TopBar title="Review & Rating" />

      <div className="rating-container">
        <div className="form-group">
          <label className="form-label">Click To Rate</label>
          <div className="stars-container">
            {[1, 2, 3, 4, 5].map(star => (
              <Star 
                key={star} 
                size={32} 
                className={`rating-star ${star <= rating ? 'filled' : ''}`}
                onClick={() => setRating(star)}
              />
            ))}
          </div>
        </div>

        <div className="form-group mt-4">
          <label className="form-label">Select Staff</label>
          <select className="form-select" value={selectedStaff} onChange={e => setSelectedStaff(e.target.value)}>
            <option>Electrician</option>
            <option>Plumber</option>
            <option>Cleaner</option>
            <option>Manager</option>
          </select>
        </div>

        <div className="form-group mt-4">
          <label className="form-label">Staff Person Behavior?</label>
          <div className="radio-group">
            <label className="radio-label">
              <input 
                type="radio" 
                name="behavior" 
                checked={behavior === 'Good'} 
                onChange={() => setBehavior('Good')} 
              /> Good
            </label>
            <label className="radio-label">
              <input 
                type="radio" 
                name="behavior" 
                checked={behavior === 'Bad'} 
                onChange={() => setBehavior('Bad')} 
              /> Bad
            </label>
          </div>
        </div>

        <div className="form-group mt-4">
          <label className="form-label">Description</label>
          <textarea
            className="form-textarea"
            rows="4"
            placeholder="Share your experience..."
            value={description}
            onChange={e => setDescription(e.target.value)}
          ></textarea>
        </div>

        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', background: '#fef2f2', borderRadius: '10px', marginBottom: '12px' }}>
            <AlertCircle size={16} color="#ef4444" />
            <span style={{ color: '#ef4444', fontSize: '13px', fontWeight: '600' }}>{error}</span>
          </div>
        )}

        <button
          className="btn-submit-review"
          onClick={handleSubmit}
          disabled={submitting}
          style={{ opacity: submitting ? 0.7 : 1 }}
        >
          {submitting ? 'Submitting...' : 'Submit Review'}
        </button>
      </div>
      <BottomNav activeNav="" />
    </div>
  );
};

export default Rating;
