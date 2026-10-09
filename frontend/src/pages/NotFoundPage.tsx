import React from 'react';
import { useNavigate } from 'react-router-dom';
import { EmptyState } from '../components/common/EmptyState';
import { AlertCircle } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="py-12">
      <EmptyState
        title="404 — Page Not Found"
        description="The requested clinical page or view could not be located in SehatSetu."
        icon={<AlertCircle className="w-6 h-6 text-red-600" />}
        actionText="Return to Dashboard"
        onAction={() => navigate('/')}
      />
    </div>
  );
};
