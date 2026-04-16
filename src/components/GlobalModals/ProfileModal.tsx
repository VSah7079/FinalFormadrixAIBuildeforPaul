import React from "react";

interface ProfileModalProps {
  show: boolean;
  overlayStyle: React.CSSProperties;
  onClose: () => void;
}

const ProfileModal: React.FC<ProfileModalProps> = ({
  show,
  overlayStyle,
  onClose,
}) => {
  if (!show) return null;

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div
        style={{
          width: "420px",
          backgroundColor: "#fff",
          padding: "32px",
          borderRadius: "16px",
          border: "1px solid #e2e8f0",
          boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ fontSize: "18px", fontWeight: 800, marginBottom: "10px" }}>
          User Profile
        </h2>

        <p style={{ fontSize: "13px", color: "#475569", marginBottom: "20px" }}>
          Profile settings and account information will appear here in a future
          update.
        </p>

        <button
          onClick={onClose}
          style={{
            width: "100%",
            padding: "10px",
            borderRadius: "8px",
            border: "2px solid #e2e8f0",
            background: "white",
            color: "#475569",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
};

export default ProfileModal;