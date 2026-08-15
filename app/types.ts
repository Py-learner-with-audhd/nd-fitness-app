export type CapacityRating = 'low' | 'medium' | 'high';

export type Slot = {
  id: number;
  name: string;
  order_index: number;
};

export type Variation = {
  id: number;
  slot_id: number;
  name: string;
  is_default: number;
};

export type Session = {
  id: number;
  date: string;
  capacity_rating: CapacityRating;
  notes: string | null;
};

export type ExerciseInSession = {
  id: number;
  session_id: number;
  slot_id: number;
  variation_id: number;
  order_index: number;
};

export type SetEntry = {
  id: number;
  exercise_in_session_id: number;
  weight: number;
  reps: number;
  rir: number;
};

export type LastSetForVariation = {
  weight: number;
  reps: number;
  rir: number;
  date: string;
};
