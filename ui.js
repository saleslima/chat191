import { state } from './state.js';

// DOM Elements
export const elements = {
  chatOverlay: document.getElementById("chat-overlay"),
  floatingChatBtn: document.getElementById("floatingChatBtn"),
  chatMinimizeBtn: document.getElementById("chatMinimizeBtn"),
  clearChatBtn: document.getElementById("clearChatBtn"),
  chatCloseBtn: document.getElementById("chatCloseBtn"),
  userSetup: document.getElementById("userSetup"),
  chatContent: document.getElementById("chatContent"),
  detailsSection: document.getElementById("detailsSection"),
  supervisorPasswordSection: document.getElementById("supervisorPasswordSection"),
  userPAInput: document.getElementById("userPA"),
  paSection: document.getElementById("paSection"),
  userRoleSelect: document.getElementById("userRole"),
  userNameInput: document.getElementById("userName"),
  supervisorPasswordInput: document.getElementById("supervisorPassword"),
  startChatBtn: document.getElementById("startChatBtn"),
  messagesContainer: document.getElementById("messagesContainer"),
  messageForm: document.getElementById("messageForm"),
  messageInput: document.getElementById("messageInput"),
  imageInput: document.getElementById("imageInput"),
  supervisorControls: document.getElementById("supervisorControls"),
  atendenteControls: document.getElementById("atendenteControls"),
  targetSelect: document.getElementById("targetSelect"),
  supervisorTypeSelect: document.getElementById("supervisorTypeSelect"),
  chatUserLabel: document.getElementById("chatUserLabel"),
  passwordHint: document.getElementById("passwordHint"),
  conversationQueue: document.getElementById("conversationQueue"),
  resetFilterBtn: document.getElementById("resetFilterBtn"),
  broadcastModal: document.getElementById("broadcastModal"),
  broadcastMessageInput: document.getElementById("broadcastMessageInput"),
  cancelBroadcastBtn: document.getElementById("cancelBroadcastBtn"),
  confirmBroadcastBtn: document.getElementById("confirmBroadcastBtn")
};

export function showBroadcastModal() {
  elements.broadcastModal.classList.remove("hidden");
  elements.broadcastMessageInput.focus();
}

export function hideBroadcastModal() {
  elements.broadcastModal.classList.add("hidden");
}

export function showChatOverlay() {
  elements.chatOverlay.classList.remove("hidden");
  elements.floatingChatBtn.classList.add("hidden");
}

export function hideChatOverlay() {
  elements.chatOverlay.classList.add("hidden");
  elements.floatingChatBtn.classList.remove("hidden");
}

export function clearMessages() {
  elements.messagesContainer.innerHTML = "";
}

export function formatRole(role) {
  if (role === 'atendente') return 'Atendente';
  if (role === 'atendente_cobom') return 'Atendente COBOM';
  if (role === 'supervisao_civil') return 'Sup. Civil';
  if (role === 'supervisao_militar') return 'Sup. Militar';
  if (role === 'supervisao_cobom') return 'Sup. COBOM';
  return role;
}

export function displayMessage(message, isBlinking = false) {
  if (!state.currentUser) return;
  
  const isSent = message.from === state.currentUser.pa;
  const messageRow = document.createElement("div");
  messageRow.className = `message-row ${isSent ? "sent" : "received"}`;
  messageRow.dataset.messageId = message.id;

  const messageBubble = document.createElement("div");
  messageBubble.className = "message-bubble";
  messageBubble.style.position = "relative";
  
  if (isBlinking) {
    messageBubble.classList.add("blinking");
  }

  // Delete button (only for sent messages and not temp messages)
  if (isSent && message.id && !message.id.startsWith('temp_')) {
    const deleteBtn = document.createElement("button");
    deleteBtn.className = "delete-btn";
    deleteBtn.innerHTML = "×";
    deleteBtn.title = "Excluir mensagem";
    deleteBtn.onclick = (e) => {
      e.stopPropagation();
      deleteMessage(message.id);
    };
    messageBubble.appendChild(deleteBtn);
  }

  // Sender Info
  const senderInfo = document.createElement("div");
  senderInfo.className = "message-sender-info";
  senderInfo.textContent = `${message.fromName || 'Usuario'} (P.A ${message.from})`;
  messageBubble.appendChild(senderInfo);

  if (message.text) {
    const textDiv = document.createElement("div");
    textDiv.textContent = message.text;
    messageBubble.appendChild(textDiv);
  }

  if (message.image) {
    const img = document.createElement("img");
    img.src = message.image;
    img.className = "message-image";
    messageBubble.appendChild(img);
  }

  const meta = document.createElement("div");
  meta.className = "message-meta";
  const time = new Date(message.timestamp).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
  meta.textContent = time;
  messageBubble.appendChild(meta);
  
  // Click to reply for supervisors
  if (!isSent && ["supervisao_civil", "supervisao_militar", "supervisao_cobom"].includes(state.currentUser.role)) {
    messageBubble.style.cursor = 'pointer';
    messageBubble.title = 'Clique para responder a este usuário';
    messageBubble.addEventListener('click', () => {
       setChatFilter(message.from);
       elements.messageInput.focus();
    });
  }

  messageRow.appendChild(messageBubble);
  elements.messagesContainer.appendChild(messageRow);
  elements.messagesContainer.scrollTop = elements.messagesContainer.scrollHeight;
}

async function deleteMessage(messageId) {
  if (!confirm('Deseja excluir esta mensagem?')) return;
  
  try {
    const { remove, ref } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js");
    const { database } = await import('./firebase-config.js');
    
    await remove(ref(database, `messages/${messageId}`));
    
    // Remove from local display
    const messageRow = document.querySelector(`[data-message-id="${messageId}"]`);
    if (messageRow) {
      messageRow.remove();
    }
  } catch (error) {
    console.error("Erro ao excluir mensagem:", error);
    alert("Erro ao excluir mensagem.");
  }
}

export function populatePASelect(role) {
  elements.userPAInput.innerHTML = '<option value="" disabled selected>Selecione o P.A</option>';
  
  let paNumbers = [];
  
  if (role === 'supervisao_civil' || role === 'supervisao_militar' || role === 'supervisao_cobom') {
    // Supervisor PAs: 3161-3170
    for (let i = 3161; i <= 3170; i++) {
      paNumbers.push(i);
    }
  } else if (role === 'atendente_cobom') {
    // Atendente COBOM PAs: 1121-1127, 1140-1146, 1159-1165, 1178-1184
    for (let i = 1121; i <= 1127; i++) paNumbers.push(i);
    for (let i = 1140; i <= 1146; i++) paNumbers.push(i);
    for (let i = 1159; i <= 1165; i++) paNumbers.push(i);
    for (let i = 1178; i <= 1184; i++) paNumbers.push(i);
  } else if (role === 'atendente') {
    // Regular Atendente: 1-208 excluding supervisor and COBOM ranges
    const excludedRanges = [
      ...Array.from({length: 10}, (_, i) => 3161 + i), // 3161-3170
      ...Array.from({length: 7}, (_, i) => 1121 + i),  // 1121-1127
      ...Array.from({length: 7}, (_, i) => 1140 + i),  // 1140-1146
      ...Array.from({length: 7}, (_, i) => 1159 + i),  // 1159-1165
      ...Array.from({length: 7}, (_, i) => 1178 + i)   // 1178-1184
    ];
    
    for (let i = 1; i <= 208; i++) {
      if (!excludedRanges.includes(i)) {
        paNumbers.push(i);
      }
    }
  }
  
  // Filter out P.A.s that are already in use
  const activePAs = Object.keys(state.activeUsers || {});
  paNumbers = paNumbers.filter(num => {
    const val = num.toString().padStart(4, '0');
    return !activePAs.includes(val);
  });
  
  paNumbers.forEach(num => {
    const val = num.toString().padStart(4, '0');
    const option = document.createElement('option');
    option.value = val;
    option.textContent = `P.A ${val}`;
    elements.userPAInput.appendChild(option);
  });
}

export function updateTargetSelect() {
  if (!state.currentUser || !['supervisao_civil', 'supervisao_militar', 'supervisao_cobom'].includes(state.currentUser.role)) return;
  
  // If we are locked to a filter, don't rebuild significantly or lose value
  const currentVal = elements.targetSelect.value;
  elements.targetSelect.innerHTML = '<option value="" disabled selected>Selecione...</option>';
  
  const allOption = document.createElement('option');
  allOption.value = 'all';
  allOption.textContent = '📣 ENVIAR A TODOS (GERAL)';
  elements.targetSelect.appendChild(allOption);

  const allAtendentesOption = document.createElement('option');
  allAtendentesOption.value = 'broadcast_atendentes';
  allAtendentesOption.textContent = '📣 ENVIAR A TODOS (ATENDENTES)';
  elements.targetSelect.appendChild(allAtendentesOption);
  
  Object.keys(state.activeUsers).sort().forEach(paKey => {
     if (paKey === state.currentUser.pa) return;
     
     const user = state.activeUsers[paKey];
     const option = document.createElement('option');
     option.value = paKey;
     option.textContent = `P.A ${paKey} - ${user.name} (${formatRole(user.role)})`;
     elements.targetSelect.appendChild(option);
  });
  
  if (state.chatFilter) {
    // Ensure the filtered user is available in the dropdown even if offline
    if (!elements.targetSelect.querySelector(`option[value="${state.chatFilter}"]`)) {
       const option = document.createElement('option');
       option.value = state.chatFilter;
       option.textContent = `P.A ${state.chatFilter}`;
       elements.targetSelect.appendChild(option);
    }
    elements.targetSelect.value = state.chatFilter;
    elements.targetSelect.disabled = true;
  } else {
    elements.targetSelect.disabled = false;
    if (currentVal && elements.targetSelect.querySelector(`option[value="${currentVal}"]`)) {
      elements.targetSelect.value = currentVal;
    }
  }
}

export function updateConversationQueue() {
  if (!state.currentUser || !['supervisao_civil', 'supervisao_militar', 'supervisao_cobom'].includes(state.currentUser.role)) return;

  const queueContainer = elements.conversationQueue;
  queueContainer.innerHTML = '';
  
  if (state.conversations.size === 0) {
    queueContainer.innerHTML = '<span style="font-size:11px; color:#999; padding:4px;">Nenhuma conversa recente</span>';
    return;
  }

  state.conversations.forEach(pa => {
    const isPending = state.pendingPAs && state.pendingPAs.has(pa);
    const btn = document.createElement('button');
    btn.className = `queue-item ${state.chatFilter === pa ? 'active' : ''} ${isPending ? 'pending' : ''}`;
    btn.textContent = `P.A ${pa}`;
    btn.title = `Abrir conversa com P.A ${pa}`;
    
    btn.onclick = () => {
      setChatFilter(pa);
    };
    
    queueContainer.appendChild(btn);
  });
}

export function setChatFilter(pa, clearTarget = true) {
  state.chatFilter = pa;
  
  if (pa) {
    // Reply Mode (Filtering by specific PA)
    elements.resetFilterBtn.classList.remove('hidden');
    
    // Ensure option exists before setting value (for offline users)
    if (!elements.targetSelect.querySelector(`option[value="${pa}"]`)) {
       const option = document.createElement('option');
       option.value = pa;
       option.textContent = `P.A ${pa}`;
       elements.targetSelect.appendChild(option);
    }

    elements.targetSelect.value = pa;
    elements.targetSelect.disabled = true; // Lock selection in reply mode
    
    // Highlight in queue
    Array.from(elements.conversationQueue.children).forEach(child => {
      if (child.textContent.includes(pa)) child.classList.add('active');
      else child.classList.remove('active');
    });

  } else {
    // Overview Mode (Viewing all messages or Broadcast)
    elements.resetFilterBtn.classList.add('hidden');
    elements.targetSelect.disabled = false;
    
    if (clearTarget) {
      elements.targetSelect.value = ""; // Reset selection
    }
    
    Array.from(elements.conversationQueue.children).forEach(child => {
       child.classList.remove('active');
    });
  }
  
  // Refresh messages to show only filtered
  import('./chat.js').then(module => {
    module.displayRelevantMessages();
  }).catch(err => console.error("Failed to refresh messages:", err));
}

export function resetLoginForm() {
  elements.userNameInput.value = "";
  elements.supervisorPasswordInput.value = "";
  elements.messageInput.value = "";
  elements.userPAInput.value = "";
  elements.userRoleSelect.value = "";
  elements.paSection.classList.add("hidden");
}