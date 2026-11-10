document.addEventListener('DOMContentLoaded', () => {
  const search = document.getElementById('dashboardSearch');
  const rows = [...document.querySelectorAll('.searchable')];
  search?.addEventListener('input', () => {
    const query = search.value.trim().toLowerCase();
    rows.forEach(row => { row.hidden = query !== '' && !row.dataset.search.includes(query); });
  });
});
