// O ponto de entrada da nossa aplicação. Será chamado quando o DOM estiver pronto.
document.addEventListener('DOMContentLoaded', () => {
    TodoApp.init();
});

// MUDANÇA: Todo o código está encapsulado dentro do objeto TodoApp.
// Isso evita a poluição do escopo global e organiza melhor o código.
const TodoApp = {

    // --- ESTADO DA APLICAÇÃO ---
    // Variáveis que controlam o estado atual da lista.
    tasks: [],
    currentFilter: 'all',
    currentSort: 'default',
    taskToDeleteId: null, // MUDANÇA: Usamos ID em vez de índice.
    isClearingAll: false,

    // --- ELEMENTOS DO DOM ---
    // Referências aos elementos HTML para não ficar buscando toda hora.
    elements: {
        todoForm: document.getElementById('todo-form'),
        todoInput: document.getElementById('todo-input'),
        todoTimeInput: document.getElementById('todo-time'),
        todoImportanceInput: document.getElementById('todo-importance'),
        todoList: document.getElementById('todo-list'),
        filterButtons: document.querySelectorAll('.filter-btn'),
        sortButtons: document.querySelectorAll('.sort-btn'),
        darkModeToggle: document.getElementById('dark-mode-toggle'),
        clearCompletedBtn: document.getElementById('clear-completed-btn'),
        activeTasksCountSpan: document.getElementById('active-tasks-count'),
        completedTasksCountSpan: document.getElementById('completed-tasks-count'),
        emptyListMessage: document.getElementById('empty-list-message'),
        confirmationModal: document.getElementById('confirmation-modal'),
        modalMessage: document.getElementById('modal-message'),
        modalConfirmBtn: document.getElementById('modal-confirm-btn'),
        modalCancelBtn: document.getElementById('modal-cancel-btn'),
        toastContainer: document.getElementById('toast-container')
    },

    // --- INICIALIZAÇÃO ---
    // Método principal que inicia a aplicação.
    init() {
        this.loadDarkModePreference();
        this.loadTasks();
        this.addEventListeners();
        this.renderTasks();
    },

    // Configura todos os event listeners da página.
    addEventListeners() {
        // MUDANÇA: Usamos .bind(this) para garantir que 'this' se refira ao objeto TodoApp
        this.elements.todoForm.addEventListener('submit', this.addTask.bind(this));
        this.elements.darkModeToggle.addEventListener('click', this.toggleDarkMode.bind(this));
        this.elements.clearCompletedBtn.addEventListener('click', this.showClearCompletedConfirmation.bind(this));
        this.elements.modalConfirmBtn.addEventListener('click', this.handleModalConfirmation.bind(this));
        this.elements.modalCancelBtn.addEventListener('click', this.hideModal.bind(this));

        this.elements.filterButtons.forEach(button => {
            button.addEventListener('click', () => this.setFilter(button.dataset.filter));
        });

        this.elements.sortButtons.forEach(button => {
            button.addEventListener('click', () => this.setSort(button.dataset.sort));
        });
    },

    // --- MANIPULAÇÃO DE DADOS (LocalStorage) ---
    loadTasks() {
        const storedTasks = localStorage.getItem('tasks');
        if (storedTasks) {
            this.tasks = JSON.parse(storedTasks);
        }
    },

    saveTasks() {
        localStorage.setItem('tasks', JSON.stringify(this.tasks));
    },

    // --- LÓGICA PRINCIPAL (Tarefas) ---
    addTask(event) {
        event.preventDefault();
        const newTodoText = this.elements.todoInput.value.trim();

        if (newTodoText === '') {
            this.showToast('O texto da tarefa não pode ser vazio!', 'error');
            this.elements.todoInput.classList.add('error');
            setTimeout(() => this.elements.todoInput.classList.remove('error'), 1500);
            return;
        }

        this.tasks.push({
            id: Date.now(), // MUDANÇA: Adicionamos um ID único à tarefa.
            text: newTodoText,
            completed: false,
            time: this.elements.todoTimeInput.value,
            importance: this.elements.todoImportanceInput.value
        });

        this.saveTasks();
        this.renderTasks();
        this.showToast('Tarefa adicionada com sucesso!', 'success');

        this.elements.todoForm.reset(); // Maneira mais simples de limpar o formulário
        this.elements.todoTimeInput.value = '09:00'; // Resetar valor padrão
        this.elements.todoImportanceInput.value = 'media';
    },

    toggleCompleteTask(id) {
        // MUDANÇA: Encontramos a tarefa pelo ID.
        const taskIndex = this.tasks.findIndex(t => t.id === id);
        if (taskIndex === -1) return;

        this.tasks[taskIndex].completed = !this.tasks[taskIndex].completed;
        this.saveTasks();
        this.renderTasks();

        const message = this.tasks[taskIndex].completed ? 'Tarefa marcada como concluída!' : 'Tarefa reativada!';
        this.showToast(message, 'success');
    },

    confirmDeleteTask(id) {
        // MUDANÇA: Deleta a tarefa pelo ID.
        this.tasks = this.tasks.filter(t => t.id !== id);
        this.saveTasks();
        this.renderTasks();
        this.showToast('Tarefa excluída!', 'success');
    },
    
    confirmClearCompletedTasks() {
        this.tasks = this.tasks.filter(task => !task.completed);
        this.saveTasks();
        this.renderTasks();
        this.showToast('Todas as tarefas concluídas foram removidas!', 'success');
    },

    saveTaskEdit(id, field, newValue) {
        const taskIndex = this.tasks.findIndex(t => t.id === id);
        if (taskIndex === -1) return;

        const trimmedValue = typeof newValue === 'string' ? newValue.trim() : newValue;
        if (trimmedValue !== '' && trimmedValue !== this.tasks[taskIndex][field]) {
            this.tasks[taskIndex][field] = trimmedValue;
            this.saveTasks();
            this.showToast('Tarefa atualizada com sucesso!', 'success');
        }
        this.renderTasks();
    },

    // --- RENDERIZAÇÃO E DOM ---
    renderTasks() {
        this.elements.todoList.innerHTML = ''; // Limpa a lista para renderizar novamente

        let tasksToRender = [...this.tasks]; // Cria uma cópia para não modificar o array original

        // 1. Filtrar
        if (this.currentFilter !== 'all') {
            tasksToRender = tasksToRender.filter(task =>
                this.currentFilter === 'completed' ? task.completed : !task.completed
            );
        }

        // 2. Ordenar
        if (this.currentSort !== 'default') {
            const importanceOrder = { 'alta': 3, 'media': 2, 'baixa': 1 };
            tasksToRender.sort((a, b) => {
                if (this.currentSort === 'time') {
                    return (a.time || "").localeCompare(b.time || "");
                }
                if (this.currentSort === 'importance') {
                    return importanceOrder[b.importance] - importanceOrder[a.importance];
                }
                return 0;
            });
        }
        
        // 3. Atualizar contadores e mensagem de lista vazia
        this.updateUI(tasksToRender.length);

        // 4. Renderizar cada tarefa na tela
        tasksToRender.forEach(task => {
            const listItem = this.createTaskElement(task);
            this.elements.todoList.appendChild(listItem);
        });
    },

    createTaskElement(task) {
        const listItem = document.createElement('li');
        listItem.id = `task-${task.id}`;
        listItem.className = `importance-${task.importance}`;
        if (task.completed) {
            listItem.classList.add('completed');
        }

        // Conteúdo Principal
        const taskMainContent = document.createElement('div');
        taskMainContent.className = 'task-main-content';

        const taskText = document.createElement('span');
        taskText.className = 'task-text';
        taskText.textContent = task.text;
        if (!task.completed) {
            taskText.addEventListener('click', () => this.enableEdit(task.id, 'text', taskText));
        }
        
        // Botões de Ação
        const actionsDiv = this.createActionButtons(task);

        // Detalhes da Tarefa
        const taskDetails = this.createTaskDetails(task);

        taskMainContent.appendChild(taskText);
        listItem.appendChild(taskMainContent);
        listItem.appendChild(actionsDiv);
        listItem.appendChild(taskDetails);
        
        return listItem;
    },

    createActionButtons(task) {
        const actionsDiv = document.createElement('div');
        actionsDiv.className = 'actions';

        const completeBtn = document.createElement('button');
        completeBtn.className = 'complete-btn';
        completeBtn.innerHTML = '<i class="fas fa-check"></i>';
        completeBtn.title = 'Marcar como concluída';
        completeBtn.addEventListener('click', () => this.toggleCompleteTask(task.id));
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.innerHTML = '<i class="fas fa-trash-alt"></i>';
        deleteBtn.title = 'Excluir tarefa';
        deleteBtn.addEventListener('click', () => this.showDeleteConfirmation(task.id));

        actionsDiv.appendChild(completeBtn);
        actionsDiv.appendChild(deleteBtn);
        return actionsDiv;
    },

    createTaskDetails(task) {
        const taskDetails = document.createElement('div');
        taskDetails.className = 'task-details';

        const timeSpan = document.createElement('span');
        timeSpan.innerHTML = `<i class="far fa-clock"></i> ${task.time}`;
        if (!task.completed) {
            timeSpan.addEventListener('click', () => this.enableEdit(task.id, 'time', timeSpan));
        }

        const importanceSpan = document.createElement('span');
        importanceSpan.className = 'importance';
        importanceSpan.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${task.importance.charAt(0).toUpperCase() + task.importance.slice(1)}`;
        if (!task.completed) {
            importanceSpan.addEventListener('click', () => this.enableEdit(task.id, 'importance', importanceSpan));
        }
        
        taskDetails.appendChild(timeSpan);
        taskDetails.appendChild(importanceSpan);
        return taskDetails;
    },

    enableEdit(id, field, elementToReplace) {
        const task = this.tasks.find(t => t.id === id);
        if (!task || task.completed) return;

        let editElement;
        if (field === 'text') {
            editElement = document.createElement('input');
            editElement.type = 'text';
            editElement.value = task.text;
            editElement.className = 'edit-input';
        } else if (field === 'time') {
            editElement = document.createElement('input');
            editElement.type = 'time';
            editElement.value = task.time;
            editElement.className = 'edit-time-input';
        } else if (field === 'importance') {
            editElement = document.createElement('select');
            editElement.className = 'edit-importance-select';
            ['baixa', 'media', 'alta'].forEach(opt => {
                const option = document.createElement('option');
                option.value = opt;
                option.textContent = opt.charAt(0).toUpperCase() + opt.slice(1);
                if (opt === task.importance) option.selected = true;
                editElement.appendChild(option);
            });
        }

        elementToReplace.parentNode.replaceChild(editElement, elementToReplace);
        editElement.focus();
        
        const save = () => this.saveTaskEdit(id, field, editElement.value);
        editElement.addEventListener('blur', save);
        editElement.addEventListener('keypress', e => { if(e.key === 'Enter') editElement.blur(); });
    },
    
    updateUI(filteredTasksCount) {
        const activeCount = this.tasks.filter(task => !task.completed).length;
        const completedCount = this.tasks.length - activeCount;

        this.elements.activeTasksCountSpan.textContent = `Ativas: ${activeCount}`;
        this.elements.completedTasksCountSpan.textContent = `Concluídas: ${completedCount}`;

        if (filteredTasksCount === 0) {
            this.elements.emptyListMessage.classList.remove('hidden');
            let message = 'Nenhuma tarefa aqui ainda! Adicione uma nova.';
            if (this.currentFilter === 'active') message = 'Nenhuma tarefa ativa encontrada.';
            else if (this.currentFilter === 'completed') message = 'Nenhuma tarefa concluída encontrada.';
            this.elements.emptyListMessage.textContent = message;
        } else {
            this.elements.emptyListMessage.classList.add('hidden');
        }
    },


    // --- FUNÇÕES AUXILIARES (Filtros, Modal, Toast, DarkMode) ---
    setFilter(filterType) {
        this.currentFilter = filterType;
        this.elements.filterButtons.forEach(button => {
            button.classList.toggle('active', button.dataset.filter === filterType);
        });
        this.showToast(`Filtro "${filterType.charAt(0).toUpperCase() + filterType.slice(1)}" ativado!`, 'success');
        this.renderTasks();
    },

    setSort(sortType) {
        this.currentSort = sortType;
        this.elements.sortButtons.forEach(button => {
            button.classList.toggle('active', button.dataset.sort === sortType);
        });
        this.showToast(`Ordenação por "${sortType.charAt(0).toUpperCase() + sortType.slice(1)}" ativada!`, 'success');
        this.renderTasks();
    },

    handleModalConfirmation() {
        if (this.isClearingAll) {
            this.confirmClearCompletedTasks();
        } else if (this.taskToDeleteId !== null) {
            this.confirmDeleteTask(this.taskToDeleteId);
        }
        this.hideModal();
    },
    
    showDeleteConfirmation(id) {
        this.taskToDeleteId = id;
        this.isClearingAll = false;
        const task = this.tasks.find(t => t.id === id);
        if (!task) return;
        this.elements.modalMessage.textContent = `Tem certeza que deseja excluir a tarefa "${task.text}"?`;
        this.elements.confirmationModal.classList.add('visible');
    },

    showClearCompletedConfirmation() {
        const completedTasksExist = this.tasks.some(task => task.completed);
        if (!completedTasksExist) {
            this.showToast('Não há tarefas concluídas para limpar.', 'error');
            return;
        }
        this.isClearingAll = true;
        this.elements.modalMessage.textContent = 'Tem certeza que deseja limpar TODAS as tarefas concluídas?';
        this.elements.confirmationModal.classList.add('visible');
    },

    hideModal() {
        this.elements.confirmationModal.classList.remove('visible');
        this.taskToDeleteId = null;
        this.isClearingAll = false;
    },
    
    showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icon = type === 'success' ? '<i class="fas fa-check-circle"></i>' : '<i class="fas fa-times-circle"></i>';
        toast.innerHTML = `${icon} <span>${message}</span>`;
        
        this.elements.toastContainer.appendChild(toast);

        toast.addEventListener('animationend', e => {
            if (e.animationName === 'fadeOut') toast.remove();
        });
    },

    toggleDarkMode() {
        document.body.classList.toggle('dark-mode');
        const isDarkMode = document.body.classList.contains('dark-mode');
        localStorage.setItem('darkMode', isDarkMode);
        this.showToast(`Modo Escuro ${isDarkMode ? 'ativado' : 'desativado'}!`, 'success');
    },

    loadDarkModePreference() {
        if (localStorage.getItem('darkMode') === 'true') {
            document.body.classList.add('dark-mode');
        }
    }
};