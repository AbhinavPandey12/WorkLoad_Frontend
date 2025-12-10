import React from 'react';

const PWAInstallPopup = ({ onInstall, onClose }) => {
    return (
        <div style={styles.overlay}>
            <div style={styles.popup}>
                <h3 style={styles.title}>Install Bluebird Star App</h3>
                <p style={styles.message}>
                    Install our app for a better experience, quick access, and offline capabilities.
                </p>
                <div style={styles.buttonContainer}>
                    <button style={styles.installButton} onClick={onInstall}>
                        Install Now
                    </button>
                    <button style={styles.closeButton} onClick={onClose}>
                        Maybe Later
                    </button>
                </div>
            </div>
        </div>
    );
};

const styles = {
    overlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 3000,
        backdropFilter: 'blur(5px)',
    },
    popup: {
        backgroundColor: '#ffffff',
        padding: '24px',
        borderRadius: '16px',
        width: '90%',
        maxWidth: '400px',
        boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
        textAlign: 'center',
        animation: 'fadeIn 0.3s ease-out',
    },
    title: {
        margin: '0 0 12px 0',
        fontSize: '1.5rem',
        fontWeight: '700',
        color: '#1a1a1a',
    },
    message: {
        margin: '0 0 24px 0',
        fontSize: '1rem',
        color: '#666666',
        lineHeight: '1.5',
    },
    buttonContainer: {
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
    },
    installButton: {
        padding: '12px 24px',
        backgroundColor: '#007bff',
        color: '#ffffff',
        border: 'none',
        borderRadius: '8px',
        fontSize: '1rem',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'background-color 0.2s',
    },
    closeButton: {
        padding: '12px 24px',
        backgroundColor: 'transparent',
        color: '#666666',
        border: '1px solid #e0e0e0',
        borderRadius: '8px',
        fontSize: '1rem',
        fontWeight: '500',
        cursor: 'pointer',
        transition: 'background-color 0.2s, color 0.2s',
    },
};

export default PWAInstallPopup;
