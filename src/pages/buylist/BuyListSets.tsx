import { Navigate } from 'react-router-dom';

// Redirect to Market Movers with sets tab
export default function BuyListSets() {
  return <Navigate to="/buylist/list" replace />;
}
