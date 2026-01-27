// Workout A and B definitions

export const WORKOUT_A = {
  name: 'Workout A',
  type: 'A',
  focus: 'Chest Emphasis',
  exercises: [
    {
      id: 'weighted_dips',
      name: 'Weighted Dips',
      sets: 3,
      repScheme: 'RPT',
      goalReps: [6, 8, 10],
      restTime: 180, // seconds
      notes: 'Reverse Pyramid Training - Start heavy, drop weight each set'
    },
    {
      id: 'hanging_knee_raises',
      name: 'Hanging Knee Raises',
      sets: 3,
      repScheme: 'Kino Reps',
      goalReps: [12, 12, 12],
      restTime: 60, // seconds
      notes: 'When you can complete 3 sets of 12 reps, increase the weight. Rest for only a minue betwewn sets'
    },
    {
      id: 'incline_db_bench',
      name: 'Incline DB Bench',
      sets: 3,
      repScheme: 'RPT',
      goalReps: [6, 8, 10],
      restTime: 180,
      notes: '30-45 degree incline angle'
    },
    {
      id: 'flat_db_bench',
      name: 'Flat DB Bench',
      sets: 4,
      repScheme: 'Kino Reps',
      goalReps: [10, 10, 12, 12],
      restTime: 90,
      notes: 'Focus on controlled tempo and squeeze'
    },
    {
      id: 'overhead_press',
      name: 'Overhead Press',
      sets: 2,
      repScheme: 'RPT',
      goalReps: [8, 10],
      restTime: 180,
      notes: 'Standing or seated barbell/dumbbell press'
    },
    {
      id: 'lateral_raises',
      name: 'Lateral Raises',
      sets: 1,
      repScheme: 'Rest-Pause',
      goalReps: [12,6,6,6],
      restTime: 15,
      notes: '12-15 reps + 3 mini-sets of 4-6 reps (15s rest)'
    },
    {
      id: 'triceps_pushdowns',
      name: 'Triceps Pushdowns',
      sets: 3,
      repScheme: 'RPT',
      goalReps: [8, 10, 12],
      restTime: 120,
      notes: 'Cable or band pushdowns'
    }
  ]
};

export const WORKOUT_B = {
  name: 'Workout B',
  type: 'B',
  focus: 'Back/Legs',
  exercises: [
    {
      id: 'weighted_chinups',
      name: 'Weighted Chinups',
      sets: 3,
      repScheme: 'RPT',
      goalReps: [5, 6, 8],
      restTime: 180,
      notes: 'Reverse Pyramid Training - Underhand grip'
    },
    {
      id: 'db_romanian_deadlifts',
      name: 'DB Romanian Deadlifts',
      sets: 4,
      repScheme: 'RPT',
      goalReps: [12, 12, 12, 12],
      restTime: 150,
      notes: 'after four sets for 12 reps, increase by 5 lb pounds per dumbbell on each set. After reaching 60 increase be 10 lb.'
    },
    {
      id: 'bulgarian_split_squats',
      name: 'Bulgarian Split Squats',
      sets: 3,
      repScheme: 'RPT',
      goalReps: [6, 8, 10],
      restTime: 120,
      notes: 'Each leg - dumbbells or barbell'
    },
    {
      id: 'incline_hammer_curls',
      name: 'Incline Hammer Curls',
      sets: 3,
      repScheme: 'RPT',
      goalReps: [6, 8, 10],
      restTime: 120,
      notes: 'Seated on incline bench, neutral grip'
    },
    {
      id: 'face_pulls',
      name: 'Face Pulls',
      sets: 4,
      repScheme: 'Kino Reps',
      goalReps: [12, 12, 15, 15],
      restTime: 60,
      notes: 'Rear delts and upper back, external rotation'
    }
  ]
};

// Exercise alternatives
export const EXERCISE_ALTERNATIVES = {
  weighted_dips: ['Decline Bench Press', 'Close-Grip Bench Press', 'Chest Dips (Bodyweight)'],
  incline_db_bench: ['Incline Barbell Bench', 'Incline Smith Machine Press', 'Low-to-High Cable Fly'],
  flat_db_bench: ['Flat Barbell Bench', 'Push-ups (Weighted)', 'Chest Press Machine'],
  overhead_press: ['Dumbbell Shoulder Press', 'Arnold Press', 'Machine Shoulder Press'],
  lateral_raises: ['Cable Lateral Raises', 'Machine Lateral Raises', 'Dumbbell Lateral Raises'],
  triceps_pushdowns: ['Overhead Tricep Extension', 'Close-Grip Bench', 'Dips'],
  weighted_chinups: ['Lat Pulldown', 'Assisted Chinups', 'Inverted Rows'],
  db_romanian_deadlifts: ['Reverse Lunges', 'Weighted Step-Ups','Single-Leg Leg Press'],
  bulgarian_split_squats: ['Walking Lunges', 'Reverse Lunges', 'Leg Press'],
  incline_hammer_curls: ['Standing Hammer Curls', 'Rope Hammer Curls', 'Cross-Body Curls'],
  face_pulls: ['Reverse Fly', 'Band Pull-Aparts', 'Rear Delt Fly Machine'],
  hanging_knee_raises: ['Lying Leg Raises', 'Reverse Crunches', 'Captains Chair Knee Raises', 'Ab Wheel Rollouts']
};

// Helper functions
export const calculateRPTWeights = (topSetWeight, setNumber, progressionSettings = null) => {
  if (setNumber === 1) return topSetWeight;
  
  // Use custom progression settings if provided
  const set2Percentage = progressionSettings?.rptSet2Percentage || 90;
  const set3Percentage = progressionSettings?.rptSet3Percentage || 80;
  
  if (setNumber === 2) return Math.round((topSetWeight * (set2Percentage / 100)) / 2.5) * 2.5;
  if (setNumber === 3) return Math.round((topSetWeight * (set3Percentage / 100)) / 2.5) * 2.5;
  return topSetWeight;
};

export const calculateWarmupWeights = (topSetWeight) => {
  return [
    { percent: 50, weight: Math.round((topSetWeight * 0.5) / 2.5) * 2.5, reps: 6 },
    { percent: 70, weight: Math.round((topSetWeight * 0.7) / 2.5) * 2.5, reps: 5 },
    { percent: 80, weight: Math.round((topSetWeight * 0.8) / 2.5) * 2.5, reps: 3 }
  ];
};

export const calculatePlates = (targetWeight, unit = 'lbs') => {
  const barWeight = unit === 'lbs' ? 45 : 20;
  let remainingWeight = targetWeight - barWeight;
  
  if (remainingWeight <= 0) {
    return [];
  }
  
  remainingWeight = remainingWeight / 2; // Each side
  
  const plateSet = unit === 'lbs' 
    ? [45, 35, 25, 10, 5, 2.5]
    : [25, 20, 15, 10, 5, 2.5, 1.25];
  
  const plates = [];
  
  for (const plate of plateSet) {
    while (remainingWeight >= plate) {
      plates.push(plate);
      remainingWeight -= plate;
    }
  }
  
  return plates;
};

export const shouldLevelUp = (completedReps, goalReps) => {
  return completedReps >= goalReps;
};

export const getNextWorkoutType = (lastWorkoutType) => {
  return lastWorkoutType === 'A' ? 'B' : 'A';
};

export const getWorkoutByType = (type) => {
  return type === 'A' ? WORKOUT_A : WORKOUT_B;
};
