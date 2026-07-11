(() => {
  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const LOCATION_ORDER = ['Beaumont', 'Port Arthur', 'Mossville', 'Leesville'];

  const scheduleRoot = document.querySelector('#schedule');
  const summaryRoot = document.querySelector('#summary');
  const searchInput = document.querySelector('#job-search');
  const countLabel = document.querySelector('#visible-job-count');

  let allJobs = [];

  function parseCSV(text) {
    const rows = [];
    let row = [];
    let cell = '';
    let quoted = false;

    for (let index = 0; index < text.length; index += 1) {
      const character = text[index];
      const nextCharacter = text[index + 1];

      if (character === '"' && quoted && nextCharacter === '"') {
        cell += '"';
        index += 1;
        continue;
      }
      if (character === '"') {
        quoted = !quoted;
        continue;
      }
      if (character === ',' && !quoted) {
        row.push(cell);
        cell = '';
        continue;
      }
      if ((character === '\n' || character === '\r') && !quoted) {
        if (character === '\r' && nextCharacter === '\n') index += 1;
        row.push(cell);
        cell = '';
        if (row.some((value) => value.trim() !== '')) rows.push(row);
        row = [];
        continue;
      }
      cell += character;
    }

    if (cell || row.length) {
      row.push(cell);
      rows.push(row);
    }

    const headers = rows.shift() || [];
    return rows.map((values) => Object.fromEntries(headers.map((header, index) => [header, values[index] || ''])));
  }

  function escapeHTML(value) {
    return String(value ?? '').replace(/[&<>"']/g, (character) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[character]));
  }

  function renderSummary(jobs) {
    if (!summaryRoot) return;

    summaryRoot.innerHTML = DAYS.map((day) => {
      const workingJobs = jobs.filter((job) => job[day] !== 'OFF');
      const people = workingJobs.reduce((total, job) => total + Number(job.crew_count || 0), 0);
      const jobIds = workingJobs.map((job) => job.job_id).join(', ');

      return `
        <article class="demand-card">
          <strong>${day}</strong>
          <span class="demand-number">${people}</span>
          <span>${workingJobs.length} jobs</span>
          <small>${escapeHTML(jobIds)}</small>
        </article>
      `;
    }).join('');
  }

  function renderSchedule(jobs) {
    if (!scheduleRoot) return;

    const sections = LOCATION_ORDER.map((location) => {
      const locationJobs = jobs.filter((job) => job.location_group === location);
      if (!locationJobs.length) return '';

      const rows = locationJobs.map((job) => `
        <tr>
          <td class="job-id">${escapeHTML(job.job_id)}</td>
          <td>${escapeHTML(job.craft)}</td>
          <td>${escapeHTML(job.crew_count)}</td>
          <td>${escapeHTML(job.starting_location)}</td>
          ${DAYS.map((day) => `<td class="${job[day] === 'OFF' ? 'off-cell' : ''}">${escapeHTML(job[day])}</td>`).join('')}
          <td>${escapeHTML(job.workday)}</td>
          <td class="notes-cell">${escapeHTML(job.notes)}</td>
        </tr>
      `).join('');

      return `
        <section class="location-section" id="${location.toLowerCase().replace(/\s+/g, '-')}">
          <header class="location-heading">
            <div>
              <p class="eyebrow dark">Location</p>
              <h2>${location}</h2>
            </div>
            <span>${locationJobs.length} jobs</span>
          </header>
          <div class="table-scroll" tabindex="0" aria-label="${location} assignment schedule; scroll sideways to see all columns">
            <table class="schedule-table">
              <thead>
                <tr>
                  <th>Job ID</th>
                  <th>Craft</th>
                  <th>Crew</th>
                  <th>Starting location</th>
                  ${DAYS.map((day) => `<th>${day.slice(0, 3)}</th>`).join('')}
                  <th>Workday</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        </section>
      `;
    }).join('');

    scheduleRoot.innerHTML = sections || `
      <section class="empty-results">
        <h2>No matching jobs found</h2>
        <p>Try a job ID, location, craft, start time, or day of the week.</p>
      </section>
    `;

    if (countLabel) countLabel.textContent = `${jobs.length} of ${allJobs.length} jobs shown`;
  }

  function filterJobs() {
    const query = (searchInput?.value || '').trim().toLowerCase();
    if (!query) {
      renderSchedule(allJobs);
      return;
    }

    const filtered = allJobs.filter((job) => Object.values(job).some((value) => String(value).toLowerCase().includes(query)));
    renderSchedule(filtered);
  }

  fetch('jobs.csv')
    .then((response) => {
      if (!response.ok) throw new Error(`Schedule data returned ${response.status}`);
      return response.text();
    })
    .then((text) => {
      allJobs = parseCSV(text);
      renderSummary(allJobs);
      renderSchedule(allJobs);
    })
    .catch((error) => {
      scheduleRoot.innerHTML = `
        <section class="empty-results error-state">
          <h2>Could not load the schedule</h2>
          <p>${escapeHTML(error.message)}</p>
        </section>
      `;
    });

  if (searchInput) searchInput.addEventListener('input', filterJobs);
})();
