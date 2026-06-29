export interface Room {
  id: string;
  name: string;
  created_at: string;
  is_active: boolean;
}

export interface Visitor {
  id: string;
  room_id: string;
  profile_id: string;
  name: string;
  scanned_at: string;
}

export interface Profile {
  id: string;
  username: string;
  role: 'professor' | 'student';
  created_at: string;
}
