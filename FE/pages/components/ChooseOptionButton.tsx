import React from "react";

interface MeetingButtonProps {
  label: string;
  onClick: () => void;
  color: string;
}

const MeetingButton: React.FC<MeetingButtonProps> = ({
  label,
  onClick,
  color,
}) => {
  return (
    <button
      onClick={onClick}
      className={`w-48 py-3 px-6 font-semibold rounded-lg shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 ${color}`}
    >
      {label}
    </button>
  );
};

export default MeetingButton;
