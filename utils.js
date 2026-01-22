import { state } from './state.js';

export function isMessageExpired(timestamp) {
  if (!timestamp) return false;
  const sixtyMinutes = 60 * 60 * 1000;
  return (Date.now() - new Date(timestamp).getTime()) > sixtyMinutes;
}

export function isMessageRelevant(message) {
  if (isMessageExpired(message.timestamp)) return false;
  if (!state.currentUser) return false;

  const myPA = state.currentUser.pa;
  const myName = state.currentUser.name.toUpperCase();

  // 1. Sent by me
  if (message.from === myPA) {
    return message.fromName === myName;
  }

  // 2. Sent to me
  
  // Broadcast
  if (message.target === 'all') return true;

  // Broadcast to Atendentes
  if (message.target === 'broadcast_atendentes') {
    if (state.currentUser.role === 'atendente' || state.currentUser.role === 'atendente_cobom') return true;
    if (["supervisao_civil", "supervisao_militar", "supervisao_cobom"].includes(state.currentUser.role)) return true;
    return false;
  }

  // Targeted at my PA
  if (message.target === myPA) {
    return true;
  }

  // Targeted at my Role
  if (["supervisao_civil", "supervisao_militar", "supervisao_cobom"].includes(state.currentUser.role)) {
     if (message.supervisorType === state.currentUser.role) return true;
  }

  // 3. If I'm a supervisor, show messages from other supervisors of same type
  if (["supervisao_civil", "supervisao_militar", "supervisao_cobom"].includes(state.currentUser.role)) {
    // Show ALL messages sent by supervisors of my same type (including to specific attendants)
    if (message.fromRole === state.currentUser.role) {
      return true;
    }
    // Show messages sent TO supervisors of my same type (attendant replies)
    if (message.supervisorType === state.currentUser.role) {
      return true;
    }
  }

  return false;
}

export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}