import { useUsername } from '../../hooks/useUsername';

const Header = () => {
    const username = useUsername();

    return (
        <div className="position-relative text-center mb-3 fade-in">
            <h1 className="h2 fw-bold mb-1 text-emerald d-inline-flex align-items-center gap-2">
                <img
                    src="/borderline_globe_small.png"
                    alt="Globe"
                    style={{ height: '1.5em' }}
                />
                BorderLINE
            </h1>
            {username && (
                <span
                    className="position-absolute end-0 bottom-0 text-muted small"
                    style={{ fontSize: '0.7rem' }}
                >
                    {username}
                </span>
            )}
        </div>
    );
};

export default Header;
