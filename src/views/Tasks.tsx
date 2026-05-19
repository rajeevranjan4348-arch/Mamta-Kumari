import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RiAddLine, RiDeleteBinLine, RiTimeLine, RiNotification3Line, RiCalendarEventLine, RiImageAddLine, RiCloseLine } from 'react-icons/ri';
import { useNotificationStore } from '../store/notificationStore';
import { playNotification } from '../utils/audio';

interface Task {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  reminderTime?: string;
  priority: 'Low' | 'Medium' | 'High';
  completed: boolean;
  createdAt: number;
  notified?: boolean;
  imageUrl?: string;
}

export default function TasksView() {
  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem('iris_tasks');
    return saved ? JSON.parse(saved) : [];
  });
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [reminderTime, setReminderTime] = useState('');
  const [priority, setPriority] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const [imageAttachment, setImageAttachment] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedDraft = localStorage.getItem('iris_task_draft');
    if (savedDraft) {
      try {
        const draft = JSON.parse(savedDraft);
        setTitle(draft.title || '');
        setDescription(draft.description || '');
        setDueDate(draft.dueDate || '');
        setReminderTime(draft.reminderTime || '');
        setPriority(draft.priority || 'Medium');
      } catch (e) {
        console.error('Failed to parse task draft', e);
      }
    }
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (title || description || dueDate || reminderTime || priority !== 'Medium') {
        localStorage.setItem('iris_task_draft', JSON.stringify({ title, description, dueDate, reminderTime, priority }));
      } else {
        localStorage.removeItem('iris_task_draft');
      }
    }, 1000);
    return () => clearTimeout(timeoutId);
  }, [title, description, dueDate, reminderTime, priority]);

  const addNotification = useNotificationStore(state => state.addNotification);

  // Check for due reminders
  useEffect(() => {
    // Request notification permission if not already done
    if ("Notification" in window && Notification.permission !== "denied" && Notification.permission !== "granted") {
      Notification.requestPermission();
    }

    const interval = setInterval(() => {
      const now = Date.now();
      setTasks(prevTasks => {
        let updated = false;
        const nextTasks = prevTasks.map(task => {
          if (!task.completed && task.reminderTime && !task.notified) {
            const reminderMs = new Date(task.reminderTime).getTime();
            if (now >= reminderMs) {
              updated = true;
              addNotification({
                title: `Task Reminder: ${task.priority}`,
                message: task.title,
                type: 'info'
              });
              
              // Trigger browser Native notification
              if ("Notification" in window && Notification.permission === "granted") {
                new Notification(`Task Reminder: ${task.title}`, {
                  body: task.description || `Priority: ${task.priority}`,
                  icon: '/favicon.ico'
                });
              }

              playNotification();
              return { ...task, notified: true };
            }
          }
          return task;
        });
        return updated ? nextTasks : prevTasks;
      });
    }, 10000); // Check every 10 seconds

    return () => clearInterval(interval);
  }, [addNotification]);

  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'dueDate' | 'priority' | 'createdAt'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'ACTIVE' | 'COMPLETED'>('ALL');
  const [filterPriority, setFilterPriority] = useState<'ALL' | 'High' | 'Medium' | 'Low'>('ALL');

  useEffect(() => {
    localStorage.setItem('iris_tasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    const handleTasksUpdated = () => {
      const saved = localStorage.getItem('iris_tasks');
      if (saved) {
        setTasks(JSON.parse(saved));
      }
    };
    window.addEventListener('iris_tasks_updated', handleTasksUpdated);
    return () => window.removeEventListener('iris_tasks_updated', handleTasksUpdated);
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setImageAttachment(event.target?.result as string);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleAddTask = () => {
    if (!title.trim()) return;
    const newTask: Task = {
      id: Math.random().toString(36).substring(7),
      title,
      description,
      dueDate,
      reminderTime: reminderTime || undefined,
      priority,
      completed: false,
      createdAt: Date.now(),
      imageUrl: imageAttachment || undefined,
    };
    setTasks(prev => [...prev, newTask]);
    setTitle('');
    setDescription('');
    setDueDate('');
    setReminderTime('');
    setPriority('Medium');
    setImageAttachment(null);
    localStorage.removeItem('iris_task_draft');
  };

  const toggleTaskCompletion = (task: Task) => {
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, completed: !t.completed } : t));
  };

  const confirmDelete = (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id));
    setTaskToDelete(null);
  };

  const filteredTasks = tasks.filter(task => {
    if (filterStatus === 'ACTIVE' && task.completed) return false;
    if (filterStatus === 'COMPLETED' && !task.completed) return false;
    if (filterPriority !== 'ALL' && task.priority !== filterPriority) return false;
    return true;
  });

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    let comparison = 0;
    if (sortBy === 'dueDate') {
      const dateA = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
      const dateB = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
      comparison = dateA - dateB;
    } else if (sortBy === 'priority') {
      const priorityWeights = { High: 3, Medium: 2, Low: 1 };
      comparison = priorityWeights[a.priority] - priorityWeights[b.priority];
    } else {
      comparison = a.createdAt - b.createdAt;
    }
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  return (
    <div className="flex h-full bg-[#111111] p-6 gap-6 font-sans text-white relative">
      <AnimatePresence>
        {taskToDelete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-zinc-900 border border-white/10 p-6 rounded-2xl shadow-2xl max-w-sm w-full"
            >
              <h3 className="text-xl font-bold text-white mb-2">Delete Task</h3>
              <p className="text-zinc-400 mb-6 text-sm leading-relaxed">Are you sure you want to permanently delete this task? This action cannot be undone.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => confirmDelete(taskToDelete)}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white font-bold py-2.5 rounded-lg transition-colors text-sm"
                  aria-label="Confirm deletion of task"
                >
                  Delete
                </button>
                <button
                  onClick={() => setTaskToDelete(null)}
                  className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-2.5 rounded-lg transition-colors text-sm"
                  aria-label="Cancel deletion of task"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="w-1/3 flex flex-col gap-4 border-r border-white/10 pr-6">
        <h2 className="text-xl font-bold tracking-widest">NEW TASK</h2>
        <input
          type="text"
          placeholder="Task Title"
          aria-label="Task Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-sm focus:outline-none focus:border-emerald-500"
        />
        <textarea
          placeholder="Description"
          aria-label="Task Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-sm h-24 resize-none focus:outline-none focus:border-emerald-500"
        />
        <div className="flex flex-col gap-1">
          <label className="text-xs text-zinc-500 uppercase font-semibold tracking-wider">Due Date</label>
          <input
            type="datetime-local"
            aria-label="Task Due Date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-zinc-500 uppercase font-semibold tracking-wider">Reminder</label>
          <input
            type="datetime-local"
            aria-label="Task Reminder Time"
            value={reminderTime}
            onChange={(e) => setReminderTime(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value as any)}
          aria-label="Task Priority"
          className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-sm focus:outline-none focus:border-emerald-500"
        >
          <option value="Low">Low Priority</option>
          <option value="Medium">Medium Priority</option>
          <option value="High">High Priority</option>
        </select>
        
        {imageAttachment ? (
          <div className="relative w-full h-24 bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden group">
            <img src={imageAttachment} alt="Attachment Preview" className="w-full h-full object-cover opacity-80" />
            <button 
              onClick={() => setImageAttachment(null)}
              className="absolute top-2 right-2 bg-black/50 hover:bg-red-500 text-white p-1.5 rounded-full transition-colors opacity-0 group-hover:opacity-100"
              aria-label="Remove image attachment"
            >
              <RiCloseLine size={16} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => fileInputRef.current?.click()}
            className="bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg p-3 text-sm text-zinc-400 transition-colors flex items-center justify-center gap-2 border-dashed"
            aria-label="Attach an image to the task"
          >
            <RiImageAddLine size={18} /> Attach Image
          </button>
        )}
        <input 
          type="file" 
          accept="image/*"
          className="hidden" 
          ref={fileInputRef} 
          onChange={handleImageUpload} 
          aria-hidden="true"
          tabIndex={-1}
        />

        <button
          onClick={handleAddTask}
          className="bg-emerald-500 hover:bg-emerald-600 text-black font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2 mt-2"
          aria-label="Add new task"
        >
          <RiAddLine /> Add Task
        </button>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold tracking-widest">TASKS</h2>
          <div className="flex gap-2 items-center flex-wrap justify-end">
            <select
              value={filterStatus}
              aria-label="Filter tasks by status"
              onChange={(e) => setFilterStatus(e.target.value as any)}
              className="bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-xs focus:outline-none focus:border-emerald-500 text-zinc-300"
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="COMPLETED">Completed</option>
            </select>
            <select
              value={filterPriority}
              aria-label="Filter tasks by priority"
              onChange={(e) => setFilterPriority(e.target.value as any)}
              className="bg-zinc-900 border border-zinc-800 rounded-lg p-2 text-xs focus:outline-none focus:border-emerald-500 text-zinc-300"
            >
              <option value="ALL">All Priorities</option>
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
                    <div className="w-px h-6 bg-zinc-800 mx-1"></div>
            <div className="flex bg-zinc-900 border border-zinc-800 rounded-lg p-1 gap-1">
              {(['dueDate', 'priority', 'createdAt'] as const).map(field => (
                <button
                  key={field}
                  onClick={() => {
                    if (sortBy === field) {
                      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')
                    } else {
                      setSortBy(field)
                      setSortOrder('asc')
                    }
                  }}
                  className={`px-3 py-1.5 text-xs rounded-md font-bold tracking-wider flex items-center gap-1 transition-colors ${
                    sortBy === field ? 'bg-zinc-800 text-emerald-400' : 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5'
                  }`}
                >
                  {field === 'dueDate' ? 'Due' : field === 'priority' ? 'Priority' : 'Created'}
                  {sortBy === field && (
                    <span className="text-emerald-500">
                      {sortOrder === 'asc' ? '↑' : '↓'}
                    </span>
                  )}
                </button>
              ))}
            </div>
            <button
              onClick={() => {
                const csvContent = "data:text/csv;charset=utf-8," 
                  + "Title,Description,Priority,Due Date,Completed\n"
                  + tasks.map(t => `"${t.title}","${t.description}","${t.priority}","${t.dueDate}","${t.completed}"`).join("\n");
                const encodedUri = encodeURI(csvContent);
                const link = document.createElement("a");
                link.setAttribute("href", encodedUri);
                link.setAttribute("download", "iris_tasks.csv");
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
              }}
              className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-emerald-500 hover:bg-zinc-800 text-zinc-300 flex items-center gap-2"
            >
              Export CSV
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-2">
          {sortedTasks.length === 0 ? (
            <div className="text-zinc-500 text-sm tracking-widest text-center mt-10">NO TASKS FOUND</div>
          ) : (
            <AnimatePresence>
              {sortedTasks.map(task => (
                <motion.div 
                  key={task.id} 
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ 
                    opacity: task.completed ? 0.6 : 1, 
                    y: 0, 
                    scale: task.completed ? 0.98 : 1,
                    backgroundColor: task.completed ? 'rgba(24, 24, 27, 0.5)' : 'rgba(24, 24, 27, 1)'
                  }}
                  exit={{ opacity: 0, scale: 0.9 }}
                   transition={{ duration: 0.3, ease: "easeOut" }}
                  className={`p-4 rounded-xl border flex items-center gap-4 transition-colors card-hover ${
                    task.completed ? 'border-zinc-800' : 'border-zinc-700'
                  }`}
                >
                  <motion.button 
                    whileTap={{ scale: 0.8 }}
                    onClick={() => toggleTaskCompletion(task)}
                    aria-label={`Mark task "${task.title}" as ${task.completed ? 'incomplete' : 'complete'}`}
                    className={`w-6 h-6 rounded-full border flex items-center justify-center shrink-0 transition-colors relative overflow-hidden ${
                      task.completed ? 'bg-emerald-500 border-emerald-500 text-black' : 'border-zinc-500 hover:border-emerald-500'
                    }`}
                  >
                    {task.completed && (
                      <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 2, opacity: 0 }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                        className="absolute inset-0 bg-white rounded-full"
                      />
                    )}
                    <AnimatePresence>
                      {task.completed && (
                        <motion.svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="w-3 h-3 text-black"
                          initial={{ pathLength: 0, opacity: 0 }}
                          animate={{ pathLength: 1, opacity: 1 }}
                          exit={{ opacity: 0, scale: 0 }}
                          transition={{ duration: 0.3, ease: "easeOut" }}
                        >
                          <motion.path
                            d="M20 6L9 17l-5-5"
                            initial={{ pathLength: 0 }}
                            animate={{ pathLength: 1 }}
                            transition={{ duration: 0.4, ease: "easeOut", delay: 0.1 }}
                          />
                        </motion.svg>
                      )}
                    </AnimatePresence>
                  </motion.button>

                  <div className="flex-1 overflow-hidden">
                    <div className="flex items-center gap-2">
                      <h3 className={`font-bold truncate transition-all ${task.completed ? 'line-through text-zinc-500' : 'text-zinc-200'}`}>
                        {task.title}
                      </h3>
                      {!task.completed && task.dueDate && new Date(task.dueDate).getTime() < Date.now() && (
                        <span className="text-[9px] font-bold bg-red-500/20 text-red-500 px-1.5 py-0.5 rounded uppercase tracking-wider">
                          Overdue
                        </span>
                      )}
                    </div>
                    {task.description && <p className="text-xs text-zinc-400 truncate mt-1">{task.description}</p>}
                    {task.imageUrl && (
                      <div className="mt-2 w-20 h-20 rounded-lg overflow-hidden border border-white/10">
                        <img src={task.imageUrl} alt="Task attachment" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="flex items-center gap-3 mt-2 text-[10px] font-mono">
                      {task.dueDate && (
                        <span className={`flex items-center gap-1 ${!task.completed && new Date(task.dueDate).getTime() < Date.now() ? 'text-red-400' : 'text-blue-400'}`}>
                          <RiTimeLine /> Due: {new Date(task.dueDate).toLocaleString()}
                        </span>
                      )}
                      {task.reminderTime && (
                        <span className="flex items-center gap-1 text-purple-400">
                          <RiNotification3Line /> Reminder: {new Date(task.reminderTime).toLocaleString()}
                        </span>
                      )}
                      <span className={`px-2 py-0.5 rounded-full ${
                        task.priority === 'High' ? 'bg-red-500/20 text-red-400' : 
                        task.priority === 'Medium' ? 'bg-yellow-500/20 text-yellow-400' : 
                        'bg-blue-500/20 text-blue-400'
                      }`}>
                        {task.priority}
                      </span>
                    </div>
                  </div>

                  <button 
                    onClick={() => setTaskToDelete(task.id)}
                    className="p-2 text-red-500 hover:bg-red-500/20 rounded-lg transition-colors"
                    aria-label={`Delete task "${task.title}"`}
                  >
                    <RiDeleteBinLine />
                  </button>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>
    </div>
  );
}
