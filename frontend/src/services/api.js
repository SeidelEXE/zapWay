const API_BASE = '/api';

class ApiService {
  async request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    };

    const response = await fetch(url, config);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
  }

  async getSessions() {
    return this.request('/sessions');
  }

  async createSession() {
    return this.request('/sessions', { method: 'POST' });
  }

  async deleteSession(sessionId) {
    return this.request(`/sessions/${sessionId}`, { method: 'DELETE' });
  }

  async getRules() {
    return this.request('/rules');
  }

  async createRule(ruleData) {
    return this.request('/rules', {
      method: 'POST',
      body: JSON.stringify(ruleData)
    });
  }

  async updateRule(ruleId, ruleData) {
    return this.request(`/rules/${ruleId}`, {
      method: 'PUT',
      body: JSON.stringify(ruleData)
    });
  }

  async deleteRule(ruleId) {
    return this.request(`/rules/${ruleId}`, { method: 'DELETE' });
  }

  async getLogs(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = queryString ? `/logs?${queryString}` : '/logs';
    return this.request(endpoint);
  }

  async getMessages(sessionId, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = `/messages/${sessionId}${queryString ? `?${queryString}` : ''}`;
    return this.request(endpoint);
  }
}

export const api = new ApiService();
export default api;
