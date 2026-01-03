import { useState, useEffect } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter, Button, Form, FormGroup, Label, Input, Alert, Spinner } from 'reactstrap';
import { useUsername } from '../../hooks/useUsername';
import { supabase } from '../../utils/supabase';
import { User, Lock, Mail, Save, X } from 'lucide-react';

interface ProfileModalProps {
    isOpen: boolean;
    toggle: () => void;
}

export const ProfileModal = ({ isOpen, toggle }: ProfileModalProps) => {
    const { username, updateUsername, email: currentEmail, refetchUser } = useUsername();

    // Local State
    const [displayName, setDisplayName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    // Status State
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'danger' | 'info', text: string } | null>(null);

    // Initialize fields when modal opens
    useEffect(() => {
        if (isOpen) {
            setDisplayName(username);
            setEmail(currentEmail || '');
            setPassword('');
            setMessage(null);
        }
    }, [isOpen, username, currentEmail]);

    const handleUpdateProfile = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setMessage(null);

        try {
            const updates: string[] = [];
            let needsBackendSync = false;

            // 1. Update Username (API)
            if (displayName && displayName !== username) {
                const result = await updateUsername(displayName);
                if (result === 'taken') {
                    throw new Error(`Username "${displayName}" is already taken.`);
                } else if (result === false) {
                    throw new Error('Failed to update username.');
                }
                updates.push('Display Name');
            }

            // 2. Update Email (Supabase)
            if (email && email !== currentEmail) {
                const { error } = await supabase.auth.updateUser({ email });
                if (error) throw error;
                updates.push('Email (Confirmation sent)');
                needsBackendSync = true;
            }

            // 3. Update Password (Supabase)
            if (password) {
                const { error } = await supabase.auth.updateUser({ password });
                if (error) throw error;
                updates.push('Password');
            }

            if (updates.length > 0) {
                // setMessage({
                //     type: 'success',
                //     text: `Successfully updated: ${updates.join(', ')}. ${updates.includes('Email (Confirmation sent)') ? 'Please check your inbox to confirm your new email.' : ''}`
                // });

                // Clear password field
                setPassword('');

                // Trigger Sync if email changed (though it won't be fully active until confirmed)
                // Or if we just want to ensure everything is aligned.
                if (needsBackendSync) {
                    const { data: { session } } = await supabase.auth.getSession();
                    if (session?.access_token) {
                        await fetch('/api/account/sync', {
                            method: 'POST',
                            headers: { 'Authorization': `Bearer ${session.access_token}` }
                        });
                        // Refetch locally to update context
                        await refetchUser();
                    }
                }
                toggle();
            } else {
                toggle();
            }

        } catch (err: any) {
            console.error('Profile update error:', err);
            setMessage({ type: 'danger', text: err.message || 'An error occurred while updating profile.' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} toggle={toggle} centered>
            <Form onSubmit={handleUpdateProfile}>
                <ModalHeader toggle={toggle}>Edit Profile</ModalHeader>
                <ModalBody>
                    {message && (
                        <Alert color={message.type} toggle={() => setMessage(null)} className="mb-3">
                            {message.text}
                        </Alert>
                    )}

                    {/* Display Name */}
                    <FormGroup className="mb-3">
                        <Label for="displayName">Display Name</Label>
                        <Input
                            id="displayName"
                            type="text"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            placeholder="Enter display name"
                            disabled={loading}
                        />
                    </FormGroup>

                    {/* Email */}
                    {/* <FormGroup className="mb-3">
                        <Label for="email">Email Address</Label>
                        <div className="input-group">
                            <span className="input-group-text"><Mail size={18} /></span>
                            <Input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="Enter email address"
                                disabled={loading}
                            />
                        </div>
                    </FormGroup> */}

                    {/* Password */}
                    <FormGroup className="mb-4">
                        <Label for="password">New Password</Label>
                        <Input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Leave blank to keep current"
                            disabled={loading}
                            minLength={6}
                        />
                    </FormGroup>
                    <div className="form-text text-muted">
                        Only enter a value if you want to change your password.
                    </div>

                </ModalBody>
                <ModalFooter className="d-flex gap-2">
                    {/* "Close" button on the left (or right based on preference, standard is right for primary actions) */}
                    <Button color="accent" type="submit" size="sm" disabled={loading} className="d-flex align-items-center">
                        {loading ? <Spinner size="sm" className="me-2" /> : ''}
                        Save
                    </Button>
                    <Button color="secondary" outline size="sm" onClick={toggle} disabled={loading}>
                        Close
                    </Button>
                </ModalFooter>
            </Form>
        </Modal >
    );
};
