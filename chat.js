import { push, onValue, query, limitToLast } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { messagesRef } from './firebase-config.js';
import { state } from './state.js';
import * as UI from './ui.js';
import { isMessageRelevant, isMessageExpired, fileToBase64 } from './utils.js';

export function displayRelevantMessages() {
  UI.clearMessages();
  
  // Create a map to identify the last message for each PA to handle blinking logic
  const lastMsgIds = new Set();
  
  if (['supervisao_civil', 'supervisao_militar', 'supervisao_cobom'].includes(state.currentUser.role)) {
    const lastMsgByPA = {};
    state.messagesHistory.forEach(msg => {
      if (!isMessageRelevant(msg)) return;
      const otherPA = msg.from === state.currentUser.pa ? msg.target : msg.from;
      if (otherPA && otherPA !== 'all') {
        lastMsgByPA[otherPA] = msg.id;
      }
    });
    Object.values(lastMsgByPA).forEach(id => lastMsgIds.add(id));
  }

  state.messagesHistory.forEach((message) => {
    if (isMessageRelevant(message)) {
      // Determine if message should blink (is pending and is the last one)
      const isPending = state.pendingPAs && state.pendingPAs.has(message.from) && lastMsgIds.has(message.id);

      // Filter logic for Supervisors in specific chat mode
      if (state.chatFilter) {
        const isFromFilter = message.from === state.chatFilter;
        const isToFilter = message.target === state.chatFilter;
        
        if (isFromFilter || isToFilter) {
          UI.displayMessage(message, isPending);
        }
      } else {
        // Show all
        UI.displayMessage(message, isPending);
      }
    }
  });
}

export function setupFirebaseListener() {
  if (state.messagesUnsubscribe) state.messagesUnsubscribe();

  const messagesQuery = query(messagesRef, limitToLast(100));
  
  state.messagesUnsubscribe = onValue(messagesQuery, async (snapshot) => {
    if (!state.currentUser) return;
    
    const messages = [];
    const expiredMessages = [];
    
    snapshot.forEach((childSnapshot) => {
      const msg = {
        id: childSnapshot.key,
        ...childSnapshot.val()
      };
      
      if (isMessageExpired(msg.timestamp)) {
        expiredMessages.push(childSnapshot.key);
      } else {
        messages.push(msg);
      }
    });
    
    // Delete expired messages from Firebase
    if (expiredMessages.length > 0) {
      const { remove, ref } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js");
      const { database } = await import('./firebase-config.js');
      
      for (const msgId of expiredMessages) {
        try {
          await remove(ref(database, `messages/${msgId}`));
        } catch (err) {
          console.error("Erro ao remover mensagem expirada:", err);
        }
      }
    }
    
    state.messagesHistory = messages;

    // Update Conversation Queue (Supervisors only)
    if (['supervisao_civil', 'supervisao_militar', 'supervisao_cobom'].includes(state.currentUser.role)) {
       const activePAs = new Set();
       const pendingPAs = new Set();
       const lastMessageByPA = {};

       messages.forEach(msg => {
         // Determine the "other" party
         if (isMessageRelevant(msg)) {
            let pa = null;
            if (msg.from !== state.currentUser.pa) {
              pa = msg.from;
            } else if (msg.target && msg.target !== 'all' && msg.target !== state.currentUser.pa) {
              pa = msg.target;
            }
            
            if (pa) {
              activePAs.add(pa);
              lastMessageByPA[pa] = msg; // Messages are chronological, so last one stays
            }
         }
       });

       activePAs.forEach(pa => {
         const lastMsg = lastMessageByPA[pa];
         // If last message is FROM the user, it is unanswered/pending
         if (lastMsg && lastMsg.from === pa) {
           pendingPAs.add(pa);
         }
       });

       state.conversations = activePAs;
       state.pendingPAs = pendingPAs;
       UI.updateConversationQueue();
    }

    // Refresh Display
    displayRelevantMessages();
    
    // Notifications for new messages
    if (!state.isFirstLoad) {
       const recentMessage = messages[messages.length - 1];
       // If valid, relevant, and not from me
       if (recentMessage && 
           recentMessage.from !== state.currentUser.pa && 
           isMessageRelevant(recentMessage) && 
           !state.messagesHistory.some(m => m.id === recentMessage.id && m.id.startsWith('temp_'))) {
           
           UI.showChatOverlay();
       }
    }
    state.isFirstLoad = false;
  });
}

export async function sendMessage(text, imageFile, targetOverride = null) {
  let imageData = null;

  if (imageFile) {
    imageData = await fileToBase64(imageFile);
  }

  if (!text && !imageData) return;

  const messageData = {
    from: state.currentUser.pa,
    fromName: state.currentUser.name.toUpperCase(),
    fromRole: state.currentUser.role,
    text: text || "",
    image: imageData,
  };

  // Supervisor target logic
  if (["supervisao_civil", "supervisao_militar", "supervisao_cobom"].includes(state.currentUser.role)) {
    if (targetOverride) {
      messageData.target = targetOverride;
    } else {
      if (!UI.elements.targetSelect.value) {
        alert("Selecione um destinatário.");
        return;
      }
      messageData.target = UI.elements.targetSelect.value;
    }
    
    if (messageData.target !== 'all' && messageData.target !== 'broadcast_atendentes' && state.activeUsers[messageData.target]) {
      messageData.targetName = state.activeUsers[messageData.target].name.toUpperCase();
    }
  } else if (state.currentUser.role === "atendente" || state.currentUser.role === "atendente_cobom") {
    messageData.supervisorType = UI.elements.supervisorTypeSelect.value;
  }

  // Temp display
  const messageWithId = {
    ...messageData,
    id: `temp_${Date.now()}`,
    timestamp: new Date().toISOString()
  };
  
  UI.displayMessage(messageWithId);
  state.messagesHistory.push(messageWithId);
  
  try {
    const msgToSend = {
      ...messageData,
      timestamp: new Date().toISOString()
    };
    await push(messagesRef, msgToSend);
    console.log("Mensagem enviada");
  } catch (err) {
    console.error("Falha ao enviar mensagem:", err);
    alert("Erro ao enviar mensagem.");
  }
}