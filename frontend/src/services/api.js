const API_BASE = '/api';

class ApiService {
  async request(endpoint, options = {}) {
    const url = `${API_BASE}${endpoint}`;
    const headers = {
      ...options.headers
    };

    if (options.body !== undefined && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
    }

    const config = {
      ...options,
      headers
    };

    const response = await fetch(url, config);
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      const detail = payload?.error || payload?.message || 'Requisição rejeitada';
      throw new Error(`HTTP ${response.status}: ${detail}`);
    }
    return payload;
  }

  async getSessions() {
    return this.request('/sessions');
  }

  async createSession() {
    return this.request('/sessions', {
      method: 'POST',
      body: JSON.stringify({})
    });
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

  async getMessageStats() {
    return this.request('/messages/stats');
  }

  async getMessages(sessionId, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const endpoint = `/messages/${sessionId}${queryString ? `?${queryString}` : ''}`;
    return this.request(endpoint);
  }
}

export const api = new ApiService();
export default api;
