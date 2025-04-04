import React from "react";
import { Search } from "lucide-react";
import { Button } from "./ui/button";

interface SearchButtonProps {
  onClick: (e?: React.FormEvent) => void;
  variant?: "default" | "outline" | "ghost" | "link";
  size?: "default" | "sm" | "lg";
  className?: string;
  label?: string;
  showIcon?: boolean;
  disabled?: boolean;
}

export const SearchButton = ({
  onClick,
  variant = "default",
  size = "default",
  className = "",
  label = "Search",
  showIcon = true,
  disabled = false
}: SearchButtonProps) => {
  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={onClick}
      type="submit"
      disabled={disabled}
    >
      {showIcon && <Search className="h-5 w-5 mr-2" />}
      {label}
    </Button>
  );
};