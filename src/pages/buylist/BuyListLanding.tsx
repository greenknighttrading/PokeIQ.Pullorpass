import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Landing gate removed — redirect straight to the main buylist page
export default function BuyListLanding() {
  const navigate = useNavigate();
  useEffect(() => { navigate('/buylist/list', { replace: true }); }, [navigate]);
  return null;
}
