import React from "react";
import { useNavigate } from "react-router-dom";
import { MessageSquare } from "lucide-react";
import { Button } from "./ui/button";

interface StartConversationButtonProps {
  userId: string;
  jobId?: string;
  variant?: "default" | "outline" | "ghost" | "link";
  size?: "default" | "sm" | "lg";
  className?: string;
  showIcon?: boolean;
  label?: string;
}

export const StartConversationButton = ({
  userId,
  jobId,
  variant = "default",
  size = "default",
  className = "",
  showIcon = true,
  label = "Message"
}: StartConversationButtonProps) => {
  const navigate = useNavigate();

  const handleClick = () => {
    const queryParams = new URLSearchParams();
    
    if (userId) {
      queryParams.set("user", userId);
    }
    
    if (jobId) {
      queryParams.set("job", jobId);
    }
    
    navigate(`/messages?${queryParams.toString()}`);
  };

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={handleClick}
    >
      {showIcon && <MessageSquare className="h-5 w-5 mr-2" />}
      {label}
    </Button>
  );
};

export { Button };
