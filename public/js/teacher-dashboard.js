document.addEventListener("DOMContentLoaded", () => {
  const studentSearch = document.getElementById("studentSearch");
  const globalSearch = document.getElementById("globalSearch");
  const searchable = [...document.querySelectorAll(".searchable")];

  function filterRows(value) {
    const query = value.trim().toLowerCase();
    searchable.forEach(item => {
      item.hidden = query !== "" && !item.dataset.search.includes(query);
    });
  }

  studentSearch?.addEventListener("input", () => filterRows(studentSearch.value));
  globalSearch?.addEventListener("input", () => {
    filterRows(globalSearch.value);
    if (studentSearch) studentSearch.value = globalSearch.value;
  });
});