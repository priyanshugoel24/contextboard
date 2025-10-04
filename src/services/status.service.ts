import axios from 'axios';

export interface UserStatus {
  state: string;
  updatedAt: string;
}

export class StatusService {
  static async getUserStatus(): Promise<UserStatus> {
    const response = await axios.get('/api/status');
    return response.data.status;
  }

  static async updateUserStatus(state: string): Promise<UserStatus> {
    const response = await axios.post('/api/status', {
      state
    });
    return response.data.status;
  }
}