import React from 'react';

const ExerciseCard = ({ exercise }) => {
    return (
        <div className="exercise-card">
            <h3>{exercise.title}</h3>
            <p>{exercise.description}</p>
            <button>{exercise.completed ? 'Completed' : 'Complete'}</button>
        </div>
    );
};

export default ExerciseCard;