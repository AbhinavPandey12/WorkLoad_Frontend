import React from 'react';
import { Modal, Button } from 'react-bootstrap';

const NotificationPermissionPopup = ({ onEnable, onCancel }) => {
    return (
        <Modal show={true} centered backdrop="static" keyboard={false}>
            <Modal.Body className="text-center p-4">
                <div className="mb-3 text-primary">
                    {/* Bootstrap Bell Icon SVG */}
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="currentColor" className="bi bi-bell-fill" viewBox="0 0 16 16">
                        <path d="M8 16a2 2 0 0 0 2-2H6a2 2 0 0 0 2 2m.995-14.901a1 1 0 1 0-1.99 0A5 5 0 0 0 3 6c0 1.098-.5 6-2 7h14c-1.5-1-2-5.902-2-7 0-2.42-1.72-4.44-4.005-4.901" />
                    </svg>
                </div>
                <h5 className="mb-3 fw-bold">Enable Notifications</h5>
                <p className="text-muted mb-4">
                    Stay updated with the latest activities, profile changes, and security alerts.
                </p>
                <div className="d-flex flex-column gap-2">
                    <Button
                        variant="primary"
                        onClick={onEnable}
                        className="fw-bold py-2 rounded-0"
                        style={{ backgroundColor: '#0d6efd' }}
                    >
                        Enable Notifications
                    </Button>
                    <Button
                        variant="light"
                        onClick={onCancel}
                        className="text-muted py-2 rounded-0 border-0"
                    >
                        Cancel
                    </Button>
                </div>
            </Modal.Body>
        </Modal>
    );
};

export default NotificationPermissionPopup;
