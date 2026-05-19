import { useEffect, useRef } from 'react';

interface VoiceCommandActions {
  toggleSystem: () => void;
  isSystemActive: boolean;
  toggleMic: () => void;
  isMicMuted: boolean;
  startVision: (mode: 'camera' | 'screen') => void;
  stopVision: () => void;
  isVideoOn: boolean;
  setActiveTab: (tab: string) => void;
  getActiveTab?: () => string;
}

export function useVoiceCommands(actions: VoiceCommandActions) {
  const actionsRef = useRef(actions);
  
  useEffect(() => {
    actionsRef.current = actions;
  }, [actions]);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.warn("Speech recognition not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      const last = event.results.length - 1;
      const command = event.results[last][0].transcript.trim().toLowerCase();
      
      console.log("Voice command received:", command);
      const currActions = actionsRef.current;

      // Natural language matching with regex for better intent recognition
      const isSystemCommand = /\b(system|iris|assistant|ai|rishi)\b/i.test(command);
      const isMicCommand = /\b(mic|microphone|audio|voice|listening|sound|hear)\b/i.test(command);
      const isVisionCommand = /\b(vision|camera|video|eye|look|see|watch|observe)\b/i.test(command);
      const isScreenCommand = /\b(screen|display|monitor|desktop|share)\b/i.test(command);
      
      let recognizedAction = "";

      if (isSystemCommand) {
        if (/\b(on|start|wake|connect|activate|enable|up|hello|hi|hey)\b/i.test(command)) {
          if (!currActions.isSystemActive) { currActions.toggleSystem(); recognizedAction = "Activating System"; }
        } else if (/\b(off|stop|sleep|disconnect|deactivate|disable|down|bye|goodbye)\b/i.test(command)) {
          if (currActions.isSystemActive) { currActions.toggleSystem(); recognizedAction = "Deactivating System"; }
        }
      }

      if (isMicCommand) {
        if (/\b(unmute|turn on|enable|start|listen|hear me)\b/i.test(command)) {
          if (currActions.isMicMuted) { currActions.toggleMic(); recognizedAction = "Unmuting Mic"; }
        } else if (/\b(mute|turn off|disable|stop|quiet|silence)\b/i.test(command)) {
          if (!currActions.isMicMuted) { currActions.toggleMic(); recognizedAction = "Muting Mic"; }
        }
      }

      if (isVisionCommand) {
        if (/\b(start|turn on|enable|open|activate|look at me|switch to camera)\b/i.test(command)) {
          currActions.startVision('camera'); 
          recognizedAction = "Switching to Camera Vision";
        } else if (/\b(stop|turn off|disable|close|deactivate|stop looking)\b/i.test(command)) {
          if (currActions.isVideoOn) { currActions.stopVision(); recognizedAction = "Stopping Vision"; }
        }
      }
      
      if (isScreenCommand) {
         if (/\b(share|start|turn on|enable|show|present|switch to screen)\b/i.test(command)) {
           currActions.startVision('screen'); 
           recognizedAction = "Switching to Screen Share";
         } else if (/\b(stop|turn off|disable|hide|unshare)\b/i.test(command)) {
           if (currActions.isVideoOn) { currActions.stopVision(); recognizedAction = "Stopping Screen Share"; }
         }
      }

      // Contextual response filtering
      const activeTab = currActions.getActiveTab ? currActions.getActiveTab() : 'DASHBOARD';
      console.log('Voice Command Context:', activeTab);
      // App Navigation with expanded synonyms
      if (/\b(open|go to|show|launch|start|switch to|navigate to|view|bring up|display|take me to|i want to see|let's look at)\b/i.test(command)) {
        if (/\b(chat|messages|conversation|talk|discuss|chatting)\b/i.test(command)) { currActions.setActiveTab('CHAT'); recognizedAction = "Opening Chat"; }
        else if (/\b(notes|memory|notepad|journal|diary|brain|remember)\b/i.test(command)) { currActions.setActiveTab('MEMORY'); recognizedAction = "Opening Memory"; }
        else if (/\b(tasks|todo|to-do|reminders|list|chores|errands)\b/i.test(command)) { currActions.setActiveTab('TASKS'); recognizedAction = "Opening Tasks"; }
        else if (/\b(gallery|vault|photos|images|pictures|pics|album)\b/i.test(command)) { currActions.setActiveTab('GALLERY'); recognizedAction = "Opening Gallery"; }
        else if (/\b(phone|calls|dialer|contacts|call)\b/i.test(command)) { currActions.setActiveTab('PHONE'); recognizedAction = "Opening Phone"; }
        else if (/\b(settings|command center|preferences|options|config|setup)\b/i.test(command)) { currActions.setActiveTab('SETTINGS'); recognizedAction = "Opening Settings"; }
        else if (/\b(dashboard|home|main|menu|overview)\b/i.test(command)) { currActions.setActiveTab('DASHBOARD'); recognizedAction = "Opening Dashboard"; }
        else if (/\b(apps|applications|programs|software|tools)\b/i.test(command)) { currActions.setActiveTab('APPS'); recognizedAction = "Opening Apps"; }
        else if (/\b(coding|code|programming|dev|development|scripting|editor)\b/i.test(command)) { currActions.setActiveTab('CODING'); recognizedAction = "Opening Code"; }
        else if (/\b(workflows|workflow|automations|scripts|macros)\b/i.test(command)) { currActions.setActiveTab('WORKFLOWS'); recognizedAction = "Opening Workflows"; }
        else if (/\b(calendar|schedule|agenda|events|meetings|planner)\b/i.test(command)) { currActions.setActiveTab('CALENDAR'); recognizedAction = "Opening Calendar"; }
        else if (/\b(documents|files|docs|folders|pdfs)\b/i.test(command)) { currActions.setActiveTab('DOCUMENTS'); recognizedAction = "Opening Documents"; }
        else if (/\b(terminal|console|shell|prompt|cmd|command line)\b/i.test(command)) { currActions.setActiveTab('TERMINAL'); recognizedAction = "Opening Terminal"; }
      }

      // Contextual "Add/Create" commands based on the current active tab
      let taskMatch = command.match(/\b(?:add task|create task|remind me to|add a task to)\s+(.+)/i);
      let noteMatch = command.match(/\b(?:create a new note|create note|add note|new note|write down|take a note)\b(?:\s+(?:called|about|named|that)?\s*(.+))?/i);
      
      // If we're in TASKS, "add X" or "create X" might implicitly mean a task
      if (activeTab === 'TASKS' && !taskMatch) {
         const implicitTaskMatch = command.match(/\b(?:add|new|create)\s+(.+)/i);
         if (implicitTaskMatch && !/\b(note|image|folder|file|event)\b/i.test(implicitTaskMatch[1])) {
             taskMatch = implicitTaskMatch;
         }
      }

      // If we're in MEMORY, "add X" or "write X" might implicitly mean a note
      if (activeTab === 'MEMORY' && !noteMatch && !taskMatch) {
         const implicitNoteMatch = command.match(/\b(?:add|new|create|write)\s+(.+)/i);
         if (implicitNoteMatch && !/\b(task|image|folder|file|event)\b/i.test(implicitNoteMatch[1])) {
             noteMatch = implicitNoteMatch;
         }
      }

      if (taskMatch) {
        const taskTitle = taskMatch[1].replace(/^(to)\s+/i, '').trim();
        const savedTasks = localStorage.getItem('iris_tasks');
        const tasks = savedTasks ? JSON.parse(savedTasks) : [];
        tasks.push({
          id: Math.random().toString(36).substring(7),
          title: taskTitle.charAt(0).toUpperCase() + taskTitle.slice(1),
          description: 'Added via voice command',
          dueDate: '',
          priority: 'Medium',
          completed: false,
          createdAt: Date.now()
        });
        localStorage.setItem('iris_tasks', JSON.stringify(tasks));
        window.dispatchEvent(new Event('iris_tasks_updated'));
        
        currActions.setActiveTab('TASKS');
        recognizedAction = `Added Task: ${taskTitle}`;
      } else if (noteMatch) {
        let noteTitle = noteMatch[1] ? noteMatch[1].trim() : "Voice Note";
        
        const savedMemories = localStorage.getItem('iris_memories');
        const memories = savedMemories ? JSON.parse(savedMemories) : [];
        memories.unshift({
          id: Math.random().toString(36).substring(7),
          title: noteTitle.charAt(0).toUpperCase() + noteTitle.slice(1),
          content: '',
          createdAt: Date.now()
        });
        localStorage.setItem('iris_memories', JSON.stringify(memories));
        window.dispatchEvent(new Event('iris_memories_updated'));

        currActions.setActiveTab('MEMORY');
        recognizedAction = `Created Note: ${noteTitle}`;
      }
      
      if (activeTab === 'GALLERY' && /\b(generate|create image|draw|paint|picture of)\b/i.test(command)) {
         const promptMatch = command.match(/\b(?:generate|create image|draw|paint|picture of)\s+(.+)/i);
         if (promptMatch) {
             recognizedAction = `Generate Image: ${promptMatch[1]}`;
             // Fetch API call logic would normally be handled elsewhere or triggered via an event.
             // We'll dispatch a CustomEvent that the Gallery could listen to in a real implementation.
             const generateEvent = new CustomEvent('generate-image-request', { detail: { prompt: promptMatch[1] }});
             window.dispatchEvent(generateEvent);
         }
      }

      
      if (recognizedAction) {
        const event = new CustomEvent('voice-command-recognized', { detail: { action: recognizedAction, command } });
        window.dispatchEvent(event);
      }
    };

    let isRunning = false;
    let retryOnInteraction = false;

    const startRecognition = () => {
      if (isRunning) return;
      try {
        recognition.start();
        isRunning = true;
      } catch (e) {
        console.warn("Failed to start speech recognition:", e);
      }
    };

    recognition.onstart = () => {
      isRunning = true;
    };

    recognition.onerror = (event: any) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        console.warn("Microphone access denied or requires user interaction for voice commands.");
        isRunning = false;
        retryOnInteraction = true;
        recognition.onend = null; // Don't auto-restart
      } else {
        console.warn("Speech recognition error:", event.error);
      }
    };

    recognition.onend = () => {
      isRunning = false;
      // Restart recognition if it ends to keep it continuous, unless blocked
      if (recognition.onend) {
        try {
          recognition.start();
        } catch (e) {
          // Ignore errors
        }
      }
    };

    startRecognition();

    const handleInteraction = () => {
      if (retryOnInteraction && !isRunning) {
        retryOnInteraction = false;
        // Re-attach onend handler so it can loop again
        recognition.onend = () => {
          isRunning = false;
          if (recognition.onend) {
            try { recognition.start(); } catch (e) {}
          }
        };
        startRecognition();
      }
    };

    document.addEventListener('click', handleInteraction);
    document.addEventListener('keydown', handleInteraction);

    return () => {
      document.removeEventListener('click', handleInteraction);
      document.removeEventListener('keydown', handleInteraction);
      recognition.onend = null; // Prevent restarting
      recognition.stop();
    };
  }, []);
}
