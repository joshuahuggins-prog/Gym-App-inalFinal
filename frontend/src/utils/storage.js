// LocalStorage utility functions for workout data

const STORAGE_KEYS = {
  WORKOUTS: 'gym_workouts',
  SETTINGS: 'gym_settings',
  BODY_WEIGHT: 'gym_body_weight',
  PERSONAL_RECORDS: 'gym_personal_records',
  VIDEO_LINKS: 'gym_video_links',
  PROGRAMMES: 'gym_programmes',
  EXERCISES: 'gym_exercises',
  PROGRESSION_SETTINGS: 'gym_progression_settings'
};

// Get data from localStorage
export const getStorageData = (key) => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  } catch (error) {
    console.error(`Error reading ${key} from localStorage:`, error);
    return null;
  }
};

// Set data to localStorage
export const setStorageData = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.error(`Error writing ${key} to localStorage:`, error);
    return false;
  }
};

// Workout Sessions
export const getWorkouts = () => {
  return getStorageData(STORAGE_KEYS.WORKOUTS) || [];
};

export const saveWorkout = (workout) => {
  const workouts = getWorkouts();
  const newWorkout = {
    ...workout,
    id: workout.id || Date.now().toString(),
    date: workout.date || new Date().toISOString()
  };
  workouts.unshift(newWorkout);
  return setStorageData(STORAGE_KEYS.WORKOUTS, workouts);
};

export const updateWorkout = (id, updates) => {
  const workouts = getWorkouts();
  const index = workouts.findIndex(w => w.id === id);
  if (index !== -1) {
    workouts[index] = { ...workouts[index], ...updates };
    return setStorageData(STORAGE_KEYS.WORKOUTS, workouts);
  }
  return false;
};

export const deleteWorkout = (id) => {
  const workouts = getWorkouts();
  const filtered = workouts.filter(w => w.id !== id);
  return setStorageData(STORAGE_KEYS.WORKOUTS, filtered);
};

// Settings
export const getSettings = () => {
  return getStorageData(STORAGE_KEYS.SETTINGS) || {
    weightUnit: 'lbs',
    theme: 'dark'
  };
};

export const updateSettings = (updates) => {
  const settings = getSettings();
  return setStorageData(STORAGE_KEYS.SETTINGS, { ...settings, ...updates });
};

// Body Weight Tracking
export const getBodyWeights = () => {
  return getStorageData(STORAGE_KEYS.BODY_WEIGHT) || [];
};

export const addBodyWeight = (weight, note = '') => {
  const weights = getBodyWeights();
  const newEntry = {
    id: Date.now().toString(),
    weight,
    note,
    date: new Date().toISOString()
  };
  weights.unshift(newEntry);
  return setStorageData(STORAGE_KEYS.BODY_WEIGHT, weights);
};

export const deleteBodyWeight = (id) => {
  const weights = getBodyWeights();
  const filtered = weights.filter(w => w.id !== id);
  return setStorageData(STORAGE_KEYS.BODY_WEIGHT, filtered);
};

// Personal Records
export const getPersonalRecords = () => {
  return getStorageData(STORAGE_KEYS.PERSONAL_RECORDS) || {};
};

export const updatePersonalRecord = (exerciseName, weight, reps, date) => {
  const prs = getPersonalRecords();
  const key = exerciseName.toLowerCase().replace(/\s+/g, '_');
  
  if (!prs[key] || weight > prs[key].weight) {
    prs[key] = {
      exerciseName,
      weight,
      reps,
      date: date || new Date().toISOString(),
      previousWeight: prs[key]?.weight || null
    };
    setStorageData(STORAGE_KEYS.PERSONAL_RECORDS, prs);
    return true;
  }
  return false;
};

// Video Links
export const getVideoLinks = () => {
  return getStorageData(STORAGE_KEYS.VIDEO_LINKS) || getDefaultVideoLinks();
};

export const updateVideoLink = (exerciseName, url) => {
  const links = getVideoLinks();
  const key = exerciseName.toLowerCase().replace(/\s+/g, '_');
  links[key] = url;
  return setStorageData(STORAGE_KEYS.VIDEO_LINKS, links);
};

// Default video links
const getDefaultVideoLinks = () => ({
  'weighted_dips': 'https://www.youtube.com/watch?v=2z8JmcrW-As',
  'incline_db_bench': 'https://www.youtube.com/watch?v=8iPEnn-ltC8',
  'flat_db_bench': 'https://www.youtube.com/watch?v=VmB1G1K7v94',
  'overhead_press': 'https://www.youtube.com/watch?v=2yjwXTZQDDI',
  'lateral_raises': 'https://www.youtube.com/watch?v=3VcKaXpzqRo',
  'triceps_pushdowns': 'https://www.youtube.com/watch?v=-xa-6cQaZKY',
  'weighted_chinups': 'https://www.youtube.com/watch?v=tB3X4TjTIuc',
  'seated_cable_rows': 'https://www.youtube.com/watch?v=xQNrFHEMhI4',
  'bulgarian_split_squats': 'https://www.youtube.com/watch?v=2C-uNgKwPLE',
  'incline_hammer_curls': 'https://www.youtube.com/watch?v=zC3nLlEvin4',
  'face_pulls': 'https://www.youtube.com/watch?v=rep-qVOkqgk'
});

// Programmes Management
export const getProgrammes = () => {
  const programmes = getStorageData(STORAGE_KEYS.PROGRAMMES);
  if (!programmes || programmes.length === 0) {
    // Initialize with default programmes from workoutData
    const { WORKOUT_A, WORKOUT_B } = require('../data/workoutData');
    const defaultProgrammes = [WORKOUT_A, WORKOUT_B];
    setStorageData(STORAGE_KEYS.PROGRAMMES, defaultProgrammes);
    return defaultProgrammes;
  }
  return programmes;
};

export const saveProgramme = (programme) => {
  const programmes = getProgrammes();
  const existing = programmes.find(p => p.type === programme.type);
  
  if (existing) {
    const updated = programmes.map(p => p.type === programme.type ? programme : p);
    return setStorageData(STORAGE_KEYS.PROGRAMMES, updated);
  } else {
    programmes.push(programme);
    return setStorageData(STORAGE_KEYS.PROGRAMMES, programmes);
  }
};

export const deleteProgramme = (type) => {
  const programmes = getProgrammes();
  const filtered = programmes.filter(p => p.type !== type);
  return setStorageData(STORAGE_KEYS.PROGRAMMES, filtered);
};

// Exercises Management
export const getExercises = () => {
  const exercises = getStorageData(STORAGE_KEYS.EXERCISES);
  if (!exercises || exercises.length === 0) {
    // Initialize with default exercises
    const programmes = getProgrammes();
    const allExercises = [];
    
    programmes.forEach(prog => {
      prog.exercises.forEach(ex => {
        if (!allExercises.find(e => e.id === ex.id)) {
          allExercises.push({
            ...ex,
            assignedTo: [prog.type]
          });
        } else {
          const existing = allExercises.find(e => e.id === ex.id);
          if (!existing.assignedTo.includes(prog.type)) {
            existing.assignedTo.push(prog.type);
          }
        }
      });
    });
    
    setStorageData(STORAGE_KEYS.EXERCISES, allExercises);
    return allExercises;
  }
  return exercises;
};

export const saveExercise = (exercise) => {
  const exercises = getExercises();
  const existing = exercises.find(e => e.id === exercise.id);
  
  if (existing) {
    const updated = exercises.map(e => e.id === exercise.id ? exercise : e);
    return setStorageData(STORAGE_KEYS.EXERCISES, updated);
  } else {
    exercises.push(exercise);
    return setStorageData(STORAGE_KEYS.EXERCISES, exercises);
  }
};

export const deleteExercise = (id) => {
  const exercises = getExercises();
  const filtered = exercises.filter(e => e.id !== id);
  return setStorageData(STORAGE_KEYS.EXERCISES, filtered);
};

// Progression Settings
export const getProgressionSettings = () => {
  return getStorageData(STORAGE_KEYS.PROGRESSION_SETTINGS) || {
    globalIncrementLbs: 5,
    globalIncrementKg: 2.5,
    rptSet2Percentage: 90,
    rptSet3Percentage: 80,
    exerciseSpecific: {}
  };
};

export const updateProgressionSettings = (settings) => {
  return setStorageData(STORAGE_KEYS.PROGRESSION_SETTINGS, settings);
};

// Export/Import CSV
export const exportToCSV = () => {
  const workouts = getWorkouts();
  if (workouts.length === 0) return null;
  
  const headers = ['Date', 'Workout', 'Exercise', 'Set', 'Weight', 'Reps', 'Notes'];
  const rows = [];
  
  workouts.forEach(workout => {
    workout.exercises.forEach(exercise => {
      exercise.sets.forEach((set, index) => {
        rows.push([
          new Date(workout.date).toLocaleDateString(),
          workout.type,
          exercise.name,
          index + 1,
          set.weight || '',
          set.reps || '',
          exercise.notes || ''
        ]);
      });
    });
  });
  
  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  return csv;
};

export const importFromCSV = (csvText) => {
  try {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) {
      return { success: false, error: 'CSV file is empty or invalid' };
    }
    
    const headers = lines[0].split(',').map(h => h.trim());
    const requiredHeaders = ['Date', 'Workout', 'Exercise', 'Set', 'Weight', 'Reps'];
    
    const hasAllHeaders = requiredHeaders.every(h => headers.includes(h));
    if (!hasAllHeaders) {
      return {
        success: false,
        error: `Missing required headers. Expected: ${requiredHeaders.join(', ')}`
      };
    }
    
    const workoutMap = new Map();
    const errors = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      if (values.length < 6) {
        errors.push(`Line ${i + 1}: Insufficient columns`);
        continue;
      }
      
      const [date, workoutType, exercise, set, weight, reps, notes = ''] = values;
      
      if (!date || !workoutType || !exercise) {
        errors.push(`Line ${i + 1}: Missing required fields`);
        continue;
      }
      
      const workoutKey = `${date}_${workoutType}`;
      
      if (!workoutMap.has(workoutKey)) {
        workoutMap.set(workoutKey, {
          id: `import_${Date.now()}_${i}`,
          date: new Date(date).toISOString(),
          type: workoutType,
          exercises: []
        });
      }
      
      const workout = workoutMap.get(workoutKey);
      let exerciseObj = workout.exercises.find(e => e.name === exercise);
      
      if (!exerciseObj) {
        exerciseObj = {
          name: exercise,
          sets: [],
          notes: notes
        };
        workout.exercises.push(exerciseObj);
      }
      
      exerciseObj.sets.push({
        weight: parseFloat(weight) || 0,
        reps: parseInt(reps) || 0,
        completed: true
      });
    }
    
    const workouts = Array.from(workoutMap.values());
    const existing = getWorkouts();
    const combined = [...workouts, ...existing];
    
    setStorageData(STORAGE_KEYS.WORKOUTS, combined);
    
    return {
      success: true,
      imported: workouts.length,
      errors: errors.length > 0 ? errors : null
    };
  } catch (error) {
    return {
      success: false,
      error: `Failed to parse CSV: ${error.message}`
    };
  }
};

export default STORAGE_KEYS;