const PriorityMatrix = {
  tasks: [],
  dataPath: FileManager.iCloud().documentsDirectory() + '/priority-matrix.json',

  async load() {
    try {
      const fm = FileManager.iCloud();
      if (fm.fileExists(this.dataPath)) {
        const raw = fm.readString(this.dataPath);
        this.tasks = JSON.parse(raw);
      }
    } catch {
      this.tasks = [];
    }
  },

  async save() {
    try {
      const fm = FileManager.iCloud();
      fm.writeString(this.dataPath, JSON.stringify(this.tasks));
    } catch (err) {
      const alert = new Alert();
      alert.title = 'Storage Error';
      alert.message = err.message;
      alert.addCancelAction('OK');
      await alert.present();
    }
  },

  addTask(title, quadrant) {
    if (!title.trim()) return;
    this.tasks.push({
      id: Date.now().toString(),
      title: title.trim(),
      quadrant,
      createdAt: new Date().toISOString(),
      done: false
    });
  },

  toggleTask(id) {
    const task = this.tasks.find(t => t.id === id);
    if (task) task.done = !task.done;
  },

  deleteTask(id) {
    this.tasks = this.tasks.filter(t => t.id !== id);
  },

  getByQuadrant(quadrant) {
    return this.tasks.filter(t => t.quadrant === quadrant && !t.done);
  },

  getDoneByQuadrant(quadrant) {
    return this.tasks.filter(t => t.quadrant === quadrant && t.done);
  }
};

const QuadrantColors = {
  'urgent-important': {
    bg: new Color('1C1C1E'),
    accent: new Color('FF453A'),
    label: 'Do First',
    icon: 'exclamationmark.circle.fill'
  },
  'not-urgent-important': {
    bg: new Color('1C1C1E'),
    accent: new Color('30D158'),
    label: 'Schedule',
    icon: 'calendar.circle.fill'
  },
  'urgent-not-important': {
    bg: new Color('1C1C1E'),
    accent: new Color('FF9F0A'),
    label: 'Delegate',
    icon: 'person.crop.circle.fill'
  },
  'not-urgent-not-important': {
    bg: new Color('1C1C1E'),
    accent: new Color('64D2FF'),
    label: 'Eliminate',
    icon: 'trash.circle.fill'
  }
};

async function showMain() {
  const nav = new UITable();
  nav.showSeparators = true;

  const header = new UITableRow();
  header.height = 60;
  header.backgroundColor = new Color('000000');
  const titleCell = header.addText('Priority Matrix', 'Eisenhower Method', '');
  titleCell.titleColor = Color.white();
  titleCell.subtitleColor = new Color('8E8E93');
  nav.addRow(header);

  for (const [key, config] of Object.entries(QuadrantColors)) {
    const row = new UITableRow();
    row.height = 44;
    row.backgroundColor = config.bg;
    row.dismissOnSelect = true;

    const count = PriorityMatrix.getByQuadrant(key).length;
    const icon = row.addText(config.label, `${count} tasks`, '');
    icon.titleColor = config.accent;
    icon.subtitleColor = new Color('8E8E93');

    row.onSelect = async () => {
      await showQuadrant(key);
    };
    nav.addRow(row);
  }

  const allTasks = PriorityMatrix.tasks.length;
  const doneTasks = PriorityMatrix.tasks.filter(t => t.done).length;
  const statsRow = new UITableRow();
  statsRow.height = 40;
  statsRow.backgroundColor = new Color('1C1C1E');
  const statsCell = statsRow.addText(`Total: ${allTasks}  |  Done: ${doneTasks}  |  Pending: ${allTasks - doneTasks}`);
  statsCell.titleColor = new Color('8E8E93');
  statsCell.titleFont = Font.systemFont(13);
  nav.addRow(statsRow);

  nav.addRow(new UITableRow());

  const addButton = new UITableRow();
  addButton.height = 50;
  addButton.backgroundColor = new Color('2C2C2E');
  addButton.dismissOnSelect = true;
  addButton.onSelect = async () => {
    await showAddTask();
  };
  const addCell = addButton.addText('+ New Task');
  addCell.titleColor = QuadrantColors['urgent-important'].accent;
  addCell.titleFont = Font.boldSystemFont(17);
  addCell.centerAligned();
  nav.addRow(addButton);

  nav.addRow(new UITableRow());

  const resetRow = new UITableRow();
  resetRow.height = 44;
  resetRow.backgroundColor = new Color('2C2C2E');
  resetRow.dismissOnSelect = true;
  resetRow.onSelect = async () => {
    const alert = new Alert();
    alert.title = 'Clear All Tasks';
    alert.message = 'This will remove all completed and pending tasks.';
    alert.addDestructiveAction('Clear All');
    alert.addCancelAction('Cancel');
    const action = await alert.present();
    if (action === 0) {
      PriorityMatrix.tasks = [];
      await PriorityMatrix.save();
    }
  };
  const resetCell = resetRow.addText('Reset Matrix');
  resetCell.titleColor = QuadrantColors['urgent-important'].accent;
  resetCell.centerAligned();
  nav.addRow(resetRow);

  await nav.present(true);
}

async function showQuadrant(key) {
  const config = QuadrantColors[key];
  const tasks = PriorityMatrix.getByQuadrant(key);
  const done = PriorityMatrix.getDoneByQuadrant(key);

  const nav = new UITable();
  nav.showSeparators = true;

  const header = new UITableRow();
  header.height = 60;
  header.backgroundColor = new Color('000000');
  const icon = header.addText(config.label, `${tasks.length} pending · ${done.length} done`, '');
  icon.titleColor = config.accent;
  icon.subtitleColor = new Color('8E8E93');
  nav.addRow(header);

  if (tasks.length === 0 && done.length === 0) {
    const emptyRow = new UITableRow();
    emptyRow.height = 80;
    emptyRow.backgroundColor = new Color('1C1C1E');
    const emptyCell = emptyRow.addText('No tasks yet', 'Tap + to add one', '');
    emptyCell.titleColor = new Color('8E8E93');
    emptyCell.subtitleColor = new Color('636366');
    emptyCell.centerAligned();
    nav.addRow(emptyRow);
  }

  for (const task of tasks) {
    const row = new UITableRow();
    row.height = 52;
    row.backgroundColor = new Color('1C1C1E');
    row.dismissOnSelect = false;

    const circleCell = row.addButton('');
    circleCell.titleColor = config.accent;
    circleCell.titleFont = Font.systemFont(22);
    circleCell.widthWeight = 8;

    const titleCell = row.addText(task.title);
    titleCell.titleColor = Color.white();
    titleCell.titleFont = Font.systemFont(16);
    titleCell.widthWeight = 80;

    const delCell = row.addButton('✕');
    delCell.titleColor = new Color('FF453A');
    delCell.titleFont = Font.systemFont(18);
    delCell.widthWeight = 12;

    row.onSelect = async () => {
      PriorityMatrix.toggleTask(task.id);
      await PriorityMatrix.save();
    };

    const rowIndex = nav.addRow(row);

    nav.setRowCell(rowIndex, 0, circleCell);
    nav.setRowCell(rowIndex, 1, titleCell);
    nav.setRowCell(rowIndex, 2, delCell);

    row.onSelect = async () => {
      await showTaskActions(task, key);
    };
  }

  for (const task of done) {
    const row = new UITableRow();
    row.height = 44;
    row.backgroundColor = new Color('1C1C1E');
    row.dismissOnSelect = false;

    const doneCell = row.addText('✓ ' + task.title);
    doneCell.titleColor = new Color('48484A');
    doneCell.titleFont = Font.systemFont(15);

    row.onSelect = async () => {
      PriorityMatrix.toggleTask(task.id);
      await PriorityMatrix.save();
      await showQuadrant(key);
    };

    nav.addRow(row);
  }

  const backRow = new UITableRow();
  backRow.height = 44;
  backRow.backgroundColor = new Color('2C2C2E');
  backRow.dismissOnSelect = true;
  backRow.onSelect = async () => {
    await showMain();
  };
  const backCell = backRow.addText('← Back');
  backCell.titleColor = new Color('8E8E93');
  backCell.centerAligned();
  nav.addRow(backRow);

  await nav.present(true);
}

async function showTaskActions(task, quadrantKey) {
  const alert = new Alert();
  alert.title = task.title;
  alert.addAction('Toggle Done');
  alert.addDestructiveAction('Delete');
  alert.addCancelAction('Cancel');
  const action = await alert.present();

  if (action === 0) {
    PriorityMatrix.toggleTask(task.id);
    await PriorityMatrix.save();
    await showQuadrant(quadrantKey);
  } else if (action === 1) {
    PriorityMatrix.deleteTask(task.id);
    await PriorityMatrix.save();
    await showQuadrant(quadrantKey);
  }
}

async function showAddTask() {
  const alert = new Alert();
  alert.title = 'New Task';
  alert.addTextField('What needs to be done?', '');
  alert.addAction('Urgent & Important');
  alert.addAction('Not Urgent & Important');
  alert.addAction('Urgent & Not Important');
  alert.addAction('Not Urgent & Not Important');
  alert.addCancelAction('Cancel');

  const action = await alert.present();
  if (action < 0 || action > 3) return;

  const textField = alert.textFieldValue(0);
  if (!textField || !textField.trim()) {
    const warn = new Alert();
    warn.title = 'Task cannot be empty';
    warn.addCancelAction('OK');
    await warn.present();
    return;
  }

  const quadrants = ['urgent-important', 'not-urgent-important', 'urgent-not-important', 'not-urgent-not-important'];
  PriorityMatrix.addTask(textField, quadrants[action]);
  await PriorityMatrix.save();
}

async function showShortcutsPanel() {
  const alert = new Alert();
  alert.title = 'Shortcuts Integration';
  alert.message = 'Use these URLs in Shortcuts:\n\nAdd Task:\nscriptable:///run/Priority%20Matrix?add=TaskTitle&quadrant=urgent-important\n\nQuadrants: urgent-important, not-urgent-important, urgent-not-important, not-urgent-not-important';
  alert.addCancelAction('Done');
  await alert.present();
}

async function handleURLParams() {
  const args = Args || {};
  const query = args.queryParameters || {};

  if (query.add) {
    const quadrant = query.quadrant || 'urgent-important';
    PriorityMatrix.addTask(query.add, quadrant);
    await PriorityMatrix.save();
    const notification = new Notification();
    notification.title = 'Priority Matrix';
    notification.body = `"${query.add}" added to ${QuadrantColors[quadrant].label}`;
    notification.schedule();
    Script.complete();
    return true;
  }

  if (query.action === 'report') {
    const total = PriorityMatrix.tasks.length;
    const done = PriorityMatrix.tasks.filter(t => t.done).length;
    const pending = total - done;
    const notification = new Notification();
    notification.title = 'Priority Matrix Report';
    notification.body = `${total} total · ${pending} pending · ${done} done`;
    notification.schedule();
    Script.complete();
    return true;
  }

  return false;
}

(async () => {
  try {
    await PriorityMatrix.load();

    if (config && config.runsInApp) {
      const handled = await handleURLParams();
      if (handled) return;
    }

    if (config && config.runsInNotification) {
      Script.complete();
      return;
    }

    if (config && config.runsWithSiri) {
      const total = PriorityMatrix.tasks.length;
      const done = PriorityMatrix.tasks.filter(t => t.done).length;
      const speech = new Speech();
      speech.speak(`You have ${total} tasks in your priority matrix. ${done} are completed.`);
      Script.complete();
      return;
    }

    await showMain();
  } catch (err) {
    const alert = new Alert();
    alert.title = 'Error';
    alert.message = err.message;
    alert.addCancelAction('OK');
    await alert.present();
  }
})();
