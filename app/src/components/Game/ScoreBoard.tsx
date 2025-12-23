import React from 'react';
import { Card, CardBody, CardTitle } from 'reactstrap';

interface ScoreBoardProps {
    score: number;
}

const ScoreBoard: React.FC<ScoreBoardProps> = ({ score }) => {
    return (
        <Card className="bg-dark text-light border-secondary mb-3">
            <CardBody className="text-center">
                <CardTitle tag="h5" className="text-muted text-uppercase small">Score</CardTitle>
                <div className="display-4 font-weight-bold">{score}</div>
            </CardBody>
        </Card>
    );
};

export default ScoreBoard;
