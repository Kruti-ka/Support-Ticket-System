import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

export const fetchTickets = (params = {}) =>
  api.get('/tickets/', { params }).then((r) => r.data)

export const createTicket = (data) =>
  api.post('/tickets/', data).then((r) => r.data)

export const updateTicket = (id, data) =>
  api.patch(`/tickets/${id}/`, data).then((r) => r.data)

export const fetchStats = () =>
  api.get('/tickets/stats/').then((r) => r.data)

export const classifyTicket = (description) =>
  api.post('/tickets/classify/', { description }).then((r) => r.data)
