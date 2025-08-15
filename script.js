// DOM Elements
const taskForm = document.getElementById('task-form');
const tasksContainer = document.getElementById('tasks-container');
const emptyState = document.getElementById('empty-state');
const searchInput = document.getElementById('search-input');
const filterStatus = document.getElementById('filter-status');
const filterCategory = document.getElementById('filter-category');
const filterPriority = document.getElementById('filter-priority');
const progressCircle = document.getElementById('progress-circle');
const progressPercentage = document.getElementById('progress-percentage');
const themeToggle = document.getElementById('theme-toggle');
const themeToggleIcon = document.getElementById('theme-toggle-icon');
const trophySection = document.getElementById('trophy-section');
const userNameElement = document.getElementById('user-name');

// Statistics Elements
const statsTotal = document.getElementById('stats-total');
const statsCompleted = document.getElementById('stats-completed');
const statsDueToday = document.getElementById('stats-today');
const statsRecurring = document.getElementById('stats-recurring');

// Keyboard shortcuts elements
const shortcutsToggle = document.getElementById('shortcuts-toggle');
const shortcutsModal = document.getElementById('shortcuts-modal');
const closeShortcuts = document.getElementById('close-shortcuts');

// Sound effects
const addSound = document.getElementById('add-sound');
const deleteSound = document.getElementById('delete-sound');
const completeSound = document.getElementById('complete-sound');

// Task data
let tasks = [];
let filteredTasks = [];

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    // Check for dark mode preference
    const html = document.documentElement;
    if (localStorage.getItem('darkMode') === 'enabled') {
        html.classList.add('dark');
        themeToggleIcon.classList.remove('fa-moon');
        themeToggleIcon.classList.add('fa-sun');
        
        // Force initial render of dark mode
        document.body.style.display = 'none';
        document.body.offsetHeight; // Trigger a reflow
        document.body.style.display = '';
    } else {
        html.classList.remove('dark');
    }

    // Check for user name
    const userName = localStorage.getItem('userName');
    if (userName) {
        userNameElement.textContent = userName;
    } else {
        promptForUserName();
    }

    // Load tasks from localStorage
    loadTasks();

    // Initialize Sortable for drag and drop
    initSortable();

    // Add event listeners
    setupEventListeners();
});

// Prompt for user name
function promptForUserName() {
    const name = prompt('Welcome to TaskMaster! What\'s your name?');
    if (name && name.trim() !== '') {
        userNameElement.textContent = name.trim();
        localStorage.setItem('userName', name.trim());
    }
}

// Setup event listeners
function setupEventListeners() {
    // Form submission
    taskForm.addEventListener('submit', handleAddTask);

    // Search and filters
    searchInput.addEventListener('input', applyFilters);
    filterStatus.addEventListener('change', applyFilters);
    filterCategory.addEventListener('change', applyFilters);
    filterPriority.addEventListener('change', applyFilters);

    // Theme toggle
    themeToggle.addEventListener('click', toggleTheme);
    
    // Set date button
    const setDateBtn = document.getElementById('set-date-btn');
    if (setDateBtn) {
        setDateBtn.addEventListener('click', function() {
            const dueDateInput = document.getElementById('task-due-date');
            if (!dueDateInput.value) {
                const now = new Date();
                const formattedDate = now.toISOString().slice(0, 16);
                dueDateInput.value = formattedDate;
            }
        });
    }
    
    // Keyboard shortcuts modal
    if (shortcutsToggle && shortcutsModal && closeShortcuts) {
        shortcutsToggle.addEventListener('click', function() {
            shortcutsModal.classList.remove('hidden');
        });
        
        closeShortcuts.addEventListener('click', function() {
            shortcutsModal.classList.add('hidden');
        });
        
        // Close modal when clicking outside
        shortcutsModal.addEventListener('click', function(e) {
            if (e.target === shortcutsModal) {
                shortcutsModal.classList.add('hidden');
            }
        });
    }
    
    // Global keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        // Don't trigger shortcuts when typing in input fields
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        
        switch (e.key.toLowerCase()) {
            case 'n': // Add new task - focus on title input
                document.getElementById('task-title').focus();
                break;
            case 'd': // Toggle dark mode
                toggleTheme();
                break;
            case '?': // Show keyboard shortcuts
                shortcutsModal.classList.remove('hidden');
                break;
            case 'escape': // Close modals
                shortcutsModal.classList.add('hidden');
                break;
        }
        
        // Ctrl+F for search
        if (e.ctrlKey && e.key.toLowerCase() === 'f') {
            e.preventDefault(); // Prevent browser's find dialog
            searchInput.focus();
        }
    });

    // Touch events for mobile swipe actions
    setupTouchEvents();
}

// Initialize Sortable.js for drag and drop
function initSortable() {
    new Sortable(tasksContainer, {
        animation: 150,
        ghostClass: 'sortable-ghost',
        chosenClass: 'sortable-chosen',
        onEnd: function(evt) {
            // Update tasks array order based on DOM order
            const taskElements = Array.from(tasksContainer.querySelectorAll('.task-card'));
            const newTasks = [];
            
            taskElements.forEach(element => {
                const taskId = element.dataset.id;
                const task = tasks.find(t => t.id === taskId);
                if (task) {
                    newTasks.push(task);
                }
            });
            
            tasks = newTasks;
            saveTasks();
        }
    });
}

// Setup touch events for mobile swipe actions
function setupTouchEvents() {
    let touchStartX = 0;
    let touchEndX = 0;
    
    tasksContainer.addEventListener('touchstart', function(e) {
        if (!e.target.closest('.task-card')) return;
        touchStartX = e.changedTouches[0].screenX;
        
        // Reset any existing swipe indicators
        const allIndicators = document.querySelectorAll('.swipe-indicator');
        allIndicators.forEach(indicator => indicator.style.width = '0');
    }, false);
    
    tasksContainer.addEventListener('touchmove', function(e) {
        if (!e.target.closest('.task-card')) return;
        const taskCard = e.target.closest('.task-card');
        touchEndX = e.changedTouches[0].screenX;
        const diffX = touchEndX - touchStartX;
        
        // Show swipe indicator based on direction
        if (Math.abs(diffX) > 20) {
            let indicator;
            if (diffX > 0) {
                // Swiping right - complete
                indicator = taskCard.querySelector('.swipe-indicator-right');
            } else {
                // Swiping left - delete
                indicator = taskCard.querySelector('.swipe-indicator-left');
            }
            
            if (indicator) {
                const width = Math.min(Math.abs(diffX) / 3, 60);
                indicator.style.width = `${width}px`;
            }
        }
    }, false);
    
    tasksContainer.addEventListener('touchend', function(e) {
        if (!e.target.closest('.task-card')) return;
        const taskCard = e.target.closest('.task-card');
        const taskId = taskCard.dataset.id;
        touchEndX = e.changedTouches[0].screenX;
        const diffX = touchEndX - touchStartX;
        
        // Reset indicators
        const indicators = taskCard.querySelectorAll('.swipe-indicator');
        indicators.forEach(indicator => indicator.style.width = '0');
        
        // Execute action if swipe is significant
        if (Math.abs(diffX) > 100) {
            if (diffX > 0) {
                // Swipe right - mark as complete
                toggleTaskComplete(taskId);
            } else {
                // Swipe left - delete task
                deleteTask(taskId);
            }
        }
    }, false);
}

// Handle adding a new task
function handleAddTask(e) {
    e.preventDefault();
    
    const titleInput = document.getElementById('task-title');
    const descriptionInput = document.getElementById('task-description');
    const categorySelect = document.getElementById('task-category');
    const prioritySelect = document.getElementById('task-priority');
    const dueDateInput = document.getElementById('task-due-date');
    const recurringSelect = document.getElementById('task-recurring');
    
    const title = titleInput.value.trim();
    if (!title) return;
    
    const newTask = {
        id: Date.now().toString(),
        title,
        description: descriptionInput.value.trim(),
        category: categorySelect.value,
        priority: prioritySelect.value,
        dueDate: dueDateInput.value,
        recurring: recurringSelect.value,
        completed: false,
        createdAt: new Date().toISOString()
    };
    
    // Add task to array
    tasks.unshift(newTask);
    
    // Save to localStorage
    saveTasks();
    
    // Render tasks
    renderTasks();
    
    // Reset form
    taskForm.reset();
    
    // Play add sound
    playSound(addSound);
    
    // Show animation
    const firstTaskCard = tasksContainer.querySelector('.task-card');
    if (firstTaskCard) {
        firstTaskCard.classList.add('task-add-animation');
        setTimeout(() => {
            firstTaskCard.classList.remove('task-add-animation');
        }, 500);
    }
}

// Toggle task completion status
function toggleTaskComplete(taskId) {
    const taskIndex = tasks.findIndex(task => task.id === taskId);
    if (taskIndex !== -1) {
        tasks[taskIndex].completed = !tasks[taskIndex].completed;
        
        // If task is recurring and marked as completed, create next occurrence
        if (tasks[taskIndex].completed && tasks[taskIndex].recurring !== 'none') {
            createNextRecurringTask(tasks[taskIndex]);
        }
        
        saveTasks();
        renderTasks();
        
        // Play complete sound if task is marked as completed
        if (tasks[taskIndex].completed) {
            playSound(completeSound);
            
            // Show animation
            const taskElement = document.querySelector(`[data-id="${taskId}"]`);
            if (taskElement) {
                taskElement.classList.add('task-complete-animation');
            }
        }
        
        // Check if all tasks for today are completed
        checkAllTasksCompleted();
    }
}

// Create next occurrence of a recurring task
function createNextRecurringTask(task) {
    if (!task.dueDate) return;
    
    const dueDate = new Date(task.dueDate);
    let nextDueDate = new Date(dueDate);
    
    switch (task.recurring) {
        case 'daily':
            nextDueDate.setDate(dueDate.getDate() + 1);
            break;
        case 'weekly':
            nextDueDate.setDate(dueDate.getDate() + 7);
            break;
        case 'monthly':
            nextDueDate.setMonth(dueDate.getMonth() + 1);
            break;
        default:
            return;
    }
    
    const newTask = {
        ...task,
        id: Date.now().toString(),
        completed: false,
        dueDate: nextDueDate.toISOString().slice(0, 16),
        createdAt: new Date().toISOString()
    };
    
    tasks.push(newTask);
}

// Delete a task
function deleteTask(taskId) {
    const taskElement = document.querySelector(`[data-id="${taskId}"]`);
    if (taskElement) {
        // Play delete sound
        playSound(deleteSound);
        
        // Show delete animation
        taskElement.classList.add('task-delete-animation');
        
        // Remove task after animation completes
        setTimeout(() => {
            tasks = tasks.filter(task => task.id !== taskId);
            saveTasks();
            renderTasks();
        }, 300);
    }
}

// Edit a task
function editTask(taskId) {
    const task = tasks.find(task => task.id === taskId);
    if (!task) return;
    
    // Create edit form by cloning the add task form
    const editForm = document.createElement('form');
    editForm.className = 'space-y-4';
    editForm.innerHTML = `
        <div>
            <label for="edit-title" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Task Title</label>
            <input type="text" id="edit-title" class="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" value="${task.title}" required>
        </div>
        
        <div>
            <label for="edit-description" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Description (optional)</label>
            <textarea id="edit-description" rows="3" class="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">${task.description || ''}</textarea>
        </div>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label for="edit-category" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Category</label>
                <select id="edit-category" class="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="work" ${task.category === 'work' ? 'selected' : ''}>Work</option>
                    <option value="personal" ${task.category === 'personal' ? 'selected' : ''}>Personal</option>
                    <option value="urgent" ${task.category === 'urgent' ? 'selected' : ''}>Urgent</option>
                    <option value="shopping" ${task.category === 'shopping' ? 'selected' : ''}>Shopping</option>
                    <option value="health" ${task.category === 'health' ? 'selected' : ''}>Health</option>
                </select>
            </div>
            
            <div>
                <label for="edit-priority" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Priority</label>
                <select id="edit-priority" class="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="low" ${task.priority === 'low' ? 'selected' : ''}>Low</option>
                    <option value="medium" ${task.priority === 'medium' ? 'selected' : ''}>Medium</option>
                    <option value="high" ${task.priority === 'high' ? 'selected' : ''}>High</option>
                </select>
            </div>
        </div>
        
        <div>
            <label for="edit-due-date" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Due Date & Time</label>
            <div class="flex space-x-2">
                <input type="datetime-local" id="edit-due-date" class="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500" value="${task.dueDate}">
                <button type="button" id="edit-set-date-btn" class="mt-1 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-md transition duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <i class="fas fa-check mr-1"></i>Set
                </button>
            </div>
        </div>
        
        <div>
            <label for="edit-recurring" class="block text-sm font-medium text-gray-700 dark:text-gray-300">Recurring</label>
            <select id="edit-recurring" class="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="none" ${task.recurring === 'none' ? 'selected' : ''}>None</option>
                <option value="daily" ${task.recurring === 'daily' ? 'selected' : ''}>Daily</option>
                <option value="weekly" ${task.recurring === 'weekly' ? 'selected' : ''}>Weekly</option>
                <option value="monthly" ${task.recurring === 'monthly' ? 'selected' : ''}>Monthly</option>
            </select>
        </div>
        
        <div class="flex space-x-2">
            <button type="submit" class="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-md transition duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50">
                <i class="fas fa-save mr-2"></i>Save
            </button>
            <button type="button" id="cancel-edit" class="flex-1 bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-700 text-gray-800 dark:text-white font-bold py-2 px-4 rounded-md transition duration-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50">
                <i class="fas fa-times mr-2"></i>Cancel
            </button>
        </div>
    `;
    
    // Replace task card content with edit form
    const taskElement = document.querySelector(`[data-id="${taskId}"]`);
    if (taskElement) {
        const taskContent = taskElement.querySelector('.task-content');
        const originalContent = taskContent.innerHTML;
        taskContent.innerHTML = '';
        taskContent.appendChild(editForm);
        
        // Handle form submission
        editForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Update task with new values
            task.title = document.getElementById('edit-title').value.trim();
            task.description = document.getElementById('edit-description').value.trim();
            task.category = document.getElementById('edit-category').value;
            task.priority = document.getElementById('edit-priority').value;
            task.dueDate = document.getElementById('edit-due-date').value;
            task.recurring = document.getElementById('edit-recurring').value;
            
            saveTasks();
            renderTasks();
        });
        
        // Handle set date button
        const editSetDateBtn = document.getElementById('edit-set-date-btn');
        if (editSetDateBtn) {
            editSetDateBtn.addEventListener('click', function() {
                const editDueDateInput = document.getElementById('edit-due-date');
                const now = new Date();
                const formattedDate = now.toISOString().slice(0, 16);
                editDueDateInput.value = formattedDate;
            });
        }
        
        // Handle cancel button
        document.getElementById('cancel-edit').addEventListener('click', function() {
            taskContent.innerHTML = originalContent;
            setupTaskCardEventListeners(taskElement, taskId);
        });
    }
}

// Apply filters and search
function applyFilters() {
    const searchTerm = searchInput.value.toLowerCase();
    const statusFilter = filterStatus.value;
    const categoryFilter = filterCategory.value;
    const priorityFilter = filterPriority.value;
    
    filteredTasks = tasks.filter(task => {
        // Search term filter
        const matchesSearch = task.title.toLowerCase().includes(searchTerm);
        
        // Status filter
        const matchesStatus = 
            statusFilter === 'all' || 
            (statusFilter === 'completed' && task.completed) || 
            (statusFilter === 'pending' && !task.completed);
        
        // Category filter
        const matchesCategory = 
            categoryFilter === 'all' || 
            task.category === categoryFilter;
        
        // Priority filter
        const matchesPriority = 
            priorityFilter === 'all' || 
            task.priority === priorityFilter;
        
        return matchesSearch && matchesStatus && matchesCategory && matchesPriority;
    });
    
    renderFilteredTasks();
}

// Render filtered tasks
function renderFilteredTasks() {
    tasksContainer.innerHTML = '';
    
    if (filteredTasks.length === 0) {
        emptyState.classList.remove('hidden');
    } else {
        emptyState.classList.add('hidden');
        
        filteredTasks.forEach(task => {
            const taskElement = createTaskElement(task);
            tasksContainer.appendChild(taskElement);
        });
    }
    
    updateProgressBar();
}

// Create a task element
function createTaskElement(task) {
    const taskElement = document.createElement('div');
    taskElement.className = `task-card relative bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 mb-4 priority-${task.priority}`;
    taskElement.dataset.id = task.id;
    
    // Add swipe indicators for mobile
    const rightIndicator = document.createElement('div');
    rightIndicator.className = 'swipe-indicator swipe-indicator-right';
    rightIndicator.innerHTML = '<i class="fas fa-check text-green-500"></i>';
    
    const leftIndicator = document.createElement('div');
    leftIndicator.className = 'swipe-indicator swipe-indicator-left';
    leftIndicator.innerHTML = '<i class="fas fa-trash text-red-500"></i>';
    
    taskElement.appendChild(rightIndicator);
    taskElement.appendChild(leftIndicator);
    
    // Task content
    const taskContent = document.createElement('div');
    taskContent.className = 'task-content';
    
    // Format due date
    let formattedDueDate = '';
    if (task.dueDate) {
        const dueDate = new Date(task.dueDate);
        formattedDueDate = dueDate.toLocaleString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    
    // Recurring indicator
    let recurringText = '';
    if (task.recurring !== 'none') {
        recurringText = `<span class="ml-2 text-xs text-gray-500 dark:text-gray-400"><i class="fas fa-sync-alt mr-1"></i>${task.recurring}</span>`;
    }
    
    taskContent.innerHTML = `
        <div class="flex items-start justify-between">
            <div class="flex items-start space-x-3">
                <button class="complete-button mt-1 flex-shrink-0 w-5 h-5 rounded-full border-2 ${task.completed ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 dark:border-gray-600'} flex items-center justify-center">
                    ${task.completed ? '<i class="fas fa-check text-xs"></i>' : ''}
                </button>
                
                <div>
                    <h3 class="task-title text-lg font-medium text-gray-800 dark:text-white ${task.completed ? 'task-title-complete text-gray-500 dark:text-gray-400' : ''}">${task.title}</h3>
                    
                    ${task.description ? `<p class="text-sm text-gray-600 dark:text-gray-400 mt-1">${task.description}</p>` : ''}
                    
                    <div class="mt-2 flex flex-wrap gap-2">
                        <span class="category-${task.category} text-xs px-2 py-1 rounded-full">${task.category.charAt(0).toUpperCase() + task.category.slice(1)}</span>
                        
                        <span class="text-xs px-2 py-1 rounded-full ${getPriorityClass(task.priority)}">
                            ${getPriorityIcon(task.priority)} ${task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                        </span>
                        
                        ${task.dueDate ? `
                        <span class="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                            <i class="far fa-clock mr-1"></i>${formattedDueDate}
                        </span>
                        ` : ''}
                        
                        ${recurringText}
                    </div>
                </div>
            </div>
            
            <div class="flex space-x-2">
                <button class="edit-button p-1 text-gray-500 hover:text-blue-500 dark:text-gray-400 dark:hover:text-blue-400 transition-colors duration-200">
                    <i class="fas fa-edit"></i>
                </button>
                
                <button class="delete-button p-1 text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400 transition-colors duration-200">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
        </div>
    `;
    
    taskElement.appendChild(taskContent);
    
    // Setup event listeners for the task card
    setupTaskCardEventListeners(taskElement, task.id);
    
    return taskElement;
}

// Setup event listeners for task card buttons
function setupTaskCardEventListeners(taskElement, taskId) {
    const completeButton = taskElement.querySelector('.complete-button');
    const editButton = taskElement.querySelector('.edit-button');
    const deleteButton = taskElement.querySelector('.delete-button');
    
    if (completeButton) {
        completeButton.addEventListener('click', () => toggleTaskComplete(taskId));
    }
    
    if (editButton) {
        editButton.addEventListener('click', () => editTask(taskId));
    }
    
    if (deleteButton) {
        deleteButton.addEventListener('click', () => deleteTask(taskId));
    }
}

// Get priority class for styling
function getPriorityClass(priority) {
    switch (priority) {
        case 'high':
            return 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300';
        case 'medium':
            return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300';
        case 'low':
            return 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300';
        default:
            return 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
    }
}

// Get priority icon
function getPriorityIcon(priority) {
    switch (priority) {
        case 'high':
            return '<i class="fas fa-exclamation-circle mr-1"></i>';
        case 'medium':
            return '<i class="fas fa-exclamation mr-1"></i>';
        case 'low':
            return '<i class="fas fa-arrow-down mr-1"></i>';
        default:
            return '';
    }
}

// Update progress bar
function updateProgressBar() {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(task => task.completed).length;
    
    let percentage = 0;
    if (totalTasks > 0) {
        percentage = Math.round((completedTasks / totalTasks) * 100);
    }
    
    // Update circle progress
    const circumference = 2 * Math.PI * 40; // 40 is the radius of the circle
    const offset = circumference - (percentage / 100) * circumference;
    progressCircle.style.strokeDashoffset = offset;
    progressPercentage.textContent = `${percentage}%`;
}

// Check if all tasks for today are completed
function checkAllTasksCompleted() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Filter tasks due today
    const todayTasks = tasks.filter(task => {
        if (!task.dueDate) return false;
        
        const dueDate = new Date(task.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        
        return dueDate.getTime() === today.getTime();
    });
    
    // Check if all today's tasks are completed
    if (todayTasks.length > 0 && todayTasks.every(task => task.completed)) {
        showTrophy();
    } else {
        hideTrophy();
    }
}

// Show trophy animation
function showTrophy() {
    trophySection.classList.remove('hidden');
    trophySection.classList.add('show');
}

// Hide trophy
function hideTrophy() {
    trophySection.classList.add('hidden');
    trophySection.classList.remove('show');
}

// Toggle dark/light theme
function toggleTheme() {
    const html = document.documentElement;
    
    if (html.classList.contains('dark')) {
        html.classList.remove('dark');
        localStorage.setItem('darkMode', 'disabled');
        themeToggleIcon.classList.remove('fa-sun');
        themeToggleIcon.classList.add('fa-moon');
    } else {
        html.classList.add('dark');
        localStorage.setItem('darkMode', 'enabled');
        themeToggleIcon.classList.remove('fa-moon');
        themeToggleIcon.classList.add('fa-sun');
    }
    
    // Force redraw to ensure theme changes are applied
    document.body.classList.add('theme-transition');
    setTimeout(() => {
        document.body.classList.remove('theme-transition');
    }, 1000);
}

// Play sound effect
function playSound(audioElement) {
    if (audioElement) {
        audioElement.currentTime = 0;
        audioElement.play().catch(error => {
            console.log('Audio playback error:', error);
        });
    }
}

// Load tasks from localStorage
function loadTasks() {
    const savedTasks = localStorage.getItem('tasks');
    if (savedTasks) {
        tasks = JSON.parse(savedTasks);
        renderTasks();
    } else {
        tasks = [];
        emptyState.classList.remove('hidden');
    }
}

// Save tasks to localStorage
function saveTasks() {
    localStorage.setItem('tasks', JSON.stringify(tasks));
}

// Render all tasks
function renderTasks() {
    // Apply current filters
    applyFilters();
    
    // Check if all tasks for today are completed
    checkAllTasksCompleted();
    
    // Update task statistics
    updateTaskStatistics();
}

// Update task statistics
function updateTaskStatistics() {
    if (!statsTotal || !statsCompleted || !statsDueToday || !statsRecurring) return;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(task => task.completed).length;
    
    const dueTodayTasks = tasks.filter(task => {
        if (!task.dueDate) return false;
        const dueDate = new Date(task.dueDate);
        dueDate.setHours(0, 0, 0, 0);
        return dueDate.getTime() === today.getTime();
    }).length;
    
    const recurringTasks = tasks.filter(task => task.recurring !== 'none').length;
    
    statsTotal.textContent = totalTasks;
    statsCompleted.textContent = completedTasks;
    statsDueToday.textContent = dueTodayTasks;
    statsRecurring.textContent = recurringTasks;
}