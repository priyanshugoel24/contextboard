import axios from 'axios';

export class AuthService {
  static async signIn(provider: string, callbackUrl?: string) {
    const response = await axios.post('/api/auth/signin', { provider, callbackUrl });
    return response.data;
  }

  static async signOut() {
    const response = await axios.post('/api/auth/signout');
    return response.data;
  }

  static async getSession() {
    const response = await axios.get('/api/auth/session');
    return response.data;
  }

  static async updateProfile(data: { name?: string; email?: string }) {
    const response = await axios.patch('/api/auth/profile', data);
    return response.data;
  }

  static async deleteAccount() {
    const response = await axios.delete('/api/auth/account');
    return response.data;
  }
}
