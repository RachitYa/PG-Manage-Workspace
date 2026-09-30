import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Navigation, Search } from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useLoading } from '../context/LoadingContext';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import { Geolocation } from '@capacitor/geolocation';
import 'leaflet/dist/leaflet.css';
import './LocationPermission.css';

const MapUpdater = ({ center }) => {
  const map = useMap();
  React.useEffect(() => {
    if (center) {
      map.setView(center, 16);
    }
  }, [center, map]);
  return null;
};

const LocationPermission = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { startLoading, stopLoading } = useLoading();
  const [loading, setLoading] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [manualCity, setManualCity] = useState('');
  const [detectedLocation, setDetectedLocation] = useState(null);
  const [mapCenter, setMapCenter] = useState([28.4744, 77.5040]); // Default to Greater Noida
  const [mapRef, setMapRef] = useState(null);

  React.useEffect(() => {
    // Automatically prompt for location as soon as the page loads
    handleGrantPermission();
  }, []);

  const saveLocationToFirestore = async (locationData) => {
    try {
      startLoading();
      setLoading(true);
      await setDoc(doc(db, 'users', user.uid), { 
        location: locationData,
        email: user.email || '',
        name: user.name || '',
        profileCompleted: true
      }, { merge: true });
      
      window.location.reload();
    } catch (error) {
      console.error("Error saving location: ", error);
      alert("Failed to save location.");
      setLoading(false);
    } finally {
      stopLoading();
    }
  };

  const fetchIPLocationFallback = async (latFallback = null, lngFallback = null) => {
    try {
      let url = 'https://api.bigdatacloud.net/data/reverse-geocode-client?localityLanguage=en';
      if (latFallback && lngFallback) {
        url += `&latitude=${latFallback}&longitude=${lngFallback}`;
      }
      const fallbackRes = await fetch(url);
      const fallbackData = await fallbackRes.json();
      const parts = [fallbackData.locality, fallbackData.city, fallbackData.principalSubdivision].filter(Boolean);
      const fallbackName = parts.length > 0 ? parts.join(', ') : 'Location Detected';
      
      const lat = latFallback || fallbackData.latitude || 28.4744; // Fallback to Greater Noida
      const lng = lngFallback || fallbackData.longitude || 77.5040;
      
      setMapCenter([lat, lng]);
      setDetectedLocation({ lat, lng, name: fallbackName });
    } catch (err) {
      console.error("IP Fallback failed", err);
      setManualMode(true);
    } finally {
      setLoading(false);
    }
  };

  const handleGrantPermission = async () => {
    startLoading();
    setLoading(true);

    const safetyTimeout = setTimeout(() => {
      console.warn("Location took too long, using IP fallback");
      fetchIPLocationFallback();
      stopLoading();
    }, 15000); // Wait up to 15 seconds for GPS lock

    try {
      // Prompt for permissions and get high accuracy GPS location via Capacitor
      const position = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 14000,
        maximumAge: 0
      });

      clearTimeout(safetyTimeout);
      const { latitude, longitude } = position.coords;

      // Reverse Geocode
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`, {
        headers: { 'Accept-Language': 'en-US,en;q=0.9' }
      });
      if (!res.ok) throw new Error('Nominatim Failed');
      
      const data = await res.json();
      let locationName = '';
      
      if (data && data.display_name) {
        const parts = data.display_name.split(', ');
        locationName = parts.slice(0, 4).join(', ');
      } else {
        throw new Error('No display_name');
      }
      
      setMapCenter([latitude, longitude]);
      setDetectedLocation({ lat: latitude, lng: longitude, name: locationName });
    } catch (error) {
      clearTimeout(safetyTimeout);
      console.error("Error getting location: ", error);
      fetchIPLocationFallback();
    } finally {
      setLoading(false);
      stopLoading();
    }
  };

  const confirmDetectedLocation = () => {
    if (detectedLocation) {
      saveLocationToFirestore({ type: 'gps', lat: detectedLocation.lat, lng: detectedLocation.lng, city: detectedLocation.name });
    }
  };

  const handleManualPinConfirm = async () => {
    if (!mapRef) return;
    startLoading();
    setLoading(true);
    const center = mapRef.getCenter();
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${center.lat}&lon=${center.lng}&zoom=18&addressdetails=1`, {
        headers: { 'Accept-Language': 'en-US,en;q=0.9' }
      });
      const data = await res.json();
      let locationName = 'Selected Location';
      if (data && data.display_name) {
        const parts = data.display_name.split(', ');
        locationName = parts.slice(0, 4).join(', ');
      }
      saveLocationToFirestore({ type: 'manual_pin', lat: center.lat, lng: center.lng, city: locationName });
    } catch (e) {
      console.error(e);
      saveLocationToFirestore({ type: 'manual_pin', lat: center.lat, lng: center.lng, city: 'Selected Location' });
    }
  };

  return (
    <div className="location-container">
      <div className="map-background" style={{ padding: 0 }}>
        <MapContainer 
          center={mapCenter} 
          zoom={16} 
          zoomControl={false}
          ref={setMapRef}
          style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, zIndex: 1 }}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution="&copy; OpenStreetMap contributors"
          />
          <MapUpdater center={mapCenter} />
        </MapContainer>
        
        <div className="map-overlay"></div>
        <div className="center-pin animate-bounce" style={{ zIndex: 2 }}>
          <MapPin size={56} color="#166534" fill="#16a34a" strokeWidth={1.5} />
        </div>
      </div>

      <div className="permission-bottom-sheet">
        {manualMode ? (
          <div className="manual-location-form" style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <h2 style={{ marginBottom: '8px', color: '#0f172a', fontWeight: '800', textAlign: 'center' }}>Pin Your Location</h2>
            <p style={{ color: '#64748b', fontSize: '15px', marginBottom: '30px', textAlign: 'center', lineHeight: '1.4' }}>
              Drag the map to place the pin on your exact location, then confirm.
            </p>
            
            <button className="btn-grant-permission" onClick={handleManualPinConfirm} disabled={loading} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
              <MapPin size={22} fill={loading ? 'none' : 'currentColor'} />
              {loading ? 'Saving...' : 'Confirm Pin Location'}
            </button>
            <button onClick={() => setManualMode(false)} disabled={loading} className="btn-text" style={{ color: '#64748b', marginTop: '16px' }}>
              Cancel
            </button>
          </div>
        ) : (
          <div className="manual-location-form" style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <h2 style={{ marginBottom: '8px', color: '#0f172a', fontWeight: '800', textAlign: 'center' }}>Find PGs Near You</h2>
            <p style={{ color: '#64748b', fontSize: '15px', marginBottom: '32px', textAlign: 'center', lineHeight: '1.4' }}>
              Allow location access so we can show you the best accommodations within a 5km radius.
            </p>
            
            {detectedLocation ? (
              <>
                <h3 style={{ marginBottom: '16px', color: '#0f172a', fontWeight: '700', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                  <MapPin size={20} color="#d3a429" />
                  {detectedLocation.name || 'Location Detected'}
                </h3>
                <button className="btn-grant-permission" onClick={confirmDetectedLocation} disabled={loading} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                  <MapPin size={22} fill={loading ? 'none' : 'currentColor'} />
                  {loading ? 'Saving...' : 'Confirm Location'}
                </button>
                <button onClick={() => setDetectedLocation(null)} disabled={loading} className="btn-text" style={{ color: '#64748b', marginTop: '16px' }}>
                  Detect Again
                </button>
              </>
            ) : (
              <button className="btn-grant-permission" onClick={handleGrantPermission} disabled={loading} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
                <Navigation size={22} fill={loading ? 'none' : 'currentColor'} />
                {loading ? 'Locating...' : 'Use Current Location'}
              </button>
            )}
            
            <button onClick={() => setManualMode(true)} disabled={loading} className="btn-text" style={{ color: '#64748b', marginTop: '16px' }}>
              Enter Location Manually
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LocationPermission;
