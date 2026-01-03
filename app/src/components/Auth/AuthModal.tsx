import React, { useState } from 'react';
import { Modal, ModalHeader, ModalBody, ModalFooter, Button, Input, FormGroup, Label, Alert } from 'reactstrap';
import { supabase } from '../../utils/supabase';

interface IProps {
    isOpen: boolean;
    toggle: () => void;
    mode: 'login' | 'signup';
    onSuccess: () => void;
}

export const AuthModal: React.FC<IProps> = ({ isOpen, toggle, mode: initialMode, onSuccess }) => {
    const [mode, setMode] = useState<'login' | 'signup'>(initialMode);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Sync internal mode if prop changes when opening
    React.useEffect(() => {
        if (isOpen) {
            setMode(initialMode);
            setError(null);
            setEmail('');
            setPassword('');
        }
    }, [isOpen, initialMode]);

    const handleAuth = async () => {
        setLoading(true);
        setError(null);

        try {
            let result;
            if (mode === 'signup') {
                result = await supabase.auth.signUp({
                    email,
                    password,
                });
            } else {
                result = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
            }

            if (result.error) {
                setError(result.error.message);
            } else {
                // Success
                onSuccess();
                toggle();
            }
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred');
        } finally {
            setLoading(false);
        }
    };

    const switchMode = () => {
        setMode(mode === 'login' ? 'signup' : 'login');
        setError(null);
    };

    const title = mode === 'login' ? 'Log In' : 'Sign Up';
    const switchLabel = mode === 'login' ? "Don't have an account? Sign Up" : 'Already have an account? Log In';

    return (
        <Modal isOpen={isOpen} toggle={toggle} centered>
            <ModalHeader toggle={toggle}>{title}</ModalHeader>
            <ModalBody>
                {error && <Alert color="danger">{error}</Alert>}
                <FormGroup>
                    <Label for="email">Email</Label>
                    <Input
                        type="email"
                        id="email"
                        placeholder="example@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={loading}
                    />
                </FormGroup>
                <FormGroup>
                    <Label for="password">Password</Label>
                    <Input
                        type="password"
                        id="password"
                        placeholder="********"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={loading}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleAuth();
                        }}
                    />
                </FormGroup>
                <div className="text-center mt-3">
                    <Button color="link" onClick={switchMode} className="p-0">
                        <small>{switchLabel}</small>
                    </Button>
                </div>
            </ModalBody>
            <ModalFooter>
                <Button color="secondary" onClick={toggle} disabled={loading}>Cancel</Button>
                <Button color="primary" onClick={handleAuth} disabled={loading}>
                    {loading ? 'Processing...' : title}
                </Button>
            </ModalFooter>
        </Modal>
    );
};
