import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

/**
 * Component that redirects from /workers/:workerId to /worker-profile/:workerId
 */
const WorkerProfileRedirect: React.FC = () => {
  const navigate = useNavigate();
  const { workerId } = useParams<{ workerId: string }>();
  
  useEffect(() => {
    if (workerId) {
      navigate(`/worker-profile/${workerId}`, { replace: true });
    }
  }, [workerId, navigate]);
  
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <h2 className="text-xl font-semibold mb-2">Redirecting...</h2>
        <p className="text-gray-600">Taking you to the worker profile page</p>
      </div>
    </div>
  );
};

export default WorkerProfileRedirect;
