let calendar;
let assignments = [];

function loadAssignments() {
  try {
    const data = localStorage.getItem('assignments');
    assignments = data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Failed to load assignments', e);
    assignments = [];
  }
}

function saveAssignments() {
  localStorage.setItem('assignments', JSON.stringify(assignments));
}

function refreshCalendar() {
  calendar.removeAllEvents();
  assignments.filter(a => !a.completed).forEach(a => {
    calendar.addEvent({
      id: a.id,
      title: a.title,
      start: a.dueDate,
      backgroundColor: a.color,
      borderColor: a.color
    });
  });
}

function updateUpcoming() {
  const list = document.getElementById('upcomingList');
  list.innerHTML = '';
  const now = new Date();
  const upcoming = assignments.filter(a => !a.completed && new Date(a.dueDate) >= now)
    .sort((a,b) => new Date(a.dueDate) - new Date(b.dueDate));

  upcoming.forEach(a => {
    const li = document.createElement('li');
    const due = new Date(a.dueDate);
    li.textContent = `${a.title} - ${due.toLocaleString()}`;
    if (due < now) li.classList.add('overdue');
    li.style.borderLeftColor = a.color;
    list.appendChild(li);
  });
}

function openModal(assignment = null) {
  const modal = document.getElementById('assignmentModal');
  modal.classList.remove('hidden');
  document.getElementById('assignmentForm').reset();
  document.getElementById('assignmentId').value = assignment ? assignment.id : '';
  document.getElementById('modalTitle').textContent = assignment ? 'Edit Assignment' : 'New Assignment';
  if (assignment) {
    document.getElementById('title').value = assignment.title;
    document.getElementById('subject').value = assignment.subject || '';
    document.getElementById('dueDate').value = assignment.dueDate.substring(0,16);
    document.getElementById('color').value = assignment.color;
    document.getElementById('description').value = assignment.description || '';
  }
}

function closeModal() {
  document.getElementById('assignmentModal').classList.add('hidden');
}

function addOrUpdateAssignment(evt) {
  evt.preventDefault();
  const id = document.getElementById('assignmentId').value;
  const assignment = {
    id: id || Date.now().toString(),
    title: document.getElementById('title').value,
    subject: document.getElementById('subject').value,
    dueDate: document.getElementById('dueDate').value,
    color: document.getElementById('color').value,
    description: document.getElementById('description').value,
    completed: false
  };
  const idx = assignments.findIndex(a => a.id === assignment.id);
  if (idx >= 0) {
    assignments[idx] = assignment;
  } else {
    assignments.push(assignment);
  }
  saveAssignments();
  refreshCalendar();
  updateUpcoming();
  closeModal();
}

function handleEventClick(info) {
  const assignment = assignments.find(a => a.id === info.event.id);
  if (!assignment) return;
  const options = ['Mark Complete', 'Edit', 'Delete', 'Cancel'];
  const choice = prompt(`Assignment: ${assignment.title}\nChoose action:\n1) Mark Complete\n2) Edit\n3) Delete\n4) Cancel`);
  if (choice === '1') {
    assignment.completed = true;
  } else if (choice === '2') {
    openModal(assignment);
    return;
  } else if (choice === '3') {
    assignments = assignments.filter(a => a.id !== assignment.id);
  }
  saveAssignments();
  refreshCalendar();
  updateUpcoming();
}

function exportAssignments() {
  const dataStr = JSON.stringify(assignments, null, 2);
  const blob = new Blob([dataStr], {type: 'application/json'});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'assignments.json';
  a.click();
  URL.revokeObjectURL(url);
}

function importAssignments(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const imported = JSON.parse(e.target.result);
      if (Array.isArray(imported)) {
        assignments = imported;
        saveAssignments();
        refreshCalendar();
        updateUpcoming();
      }
    } catch(err) {
      alert('Invalid file');
    }
  };
  reader.readAsText(file);
}

function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

function notifyUpcoming() {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const now = new Date();
  const soon = new Date(now.getTime() + 24*60*60*1000);
  assignments.forEach(a => {
    if (a.completed) return;
    const due = new Date(a.dueDate);
    if (due > now && due <= soon && !a.notified) {
      new Notification('Upcoming Assignment', {
        body: `${a.title} due ${due.toLocaleString()}`
      });
      a.notified = true;
    }
  });
  saveAssignments();
}

function initCalendar() {
  calendar = new FullCalendar.Calendar(document.getElementById('calendar'), {
    initialView: 'dayGridMonth',
    height: '100%',
    selectable: true,
    eventClick: handleEventClick
  });
  calendar.render();
}

function init() {
  loadAssignments();
  initCalendar();
  refreshCalendar();
  updateUpcoming();
  requestNotificationPermission();
  setInterval(notifyUpcoming, 60 * 60 * 1000); // check every hour

  document.getElementById('addAssignmentBtn').addEventListener('click', () => openModal());
  document.getElementById('closeModal').addEventListener('click', closeModal);
  document.getElementById('assignmentForm').addEventListener('submit', addOrUpdateAssignment);
  document.getElementById('exportBtn').addEventListener('click', exportAssignments);
  document.getElementById('importInput').addEventListener('change', (e) => {
    if (e.target.files.length) importAssignments(e.target.files[0]);
  });
}

document.addEventListener('DOMContentLoaded', init);
