  window.addEventListener('DOMContentLoaded', function() {
    const yearElement = document.getElementById('copyright-year');
    const currentYear = new Date().getFullYear();
    if (yearElement) {
      yearElement.textContent = currentYear;
    } else {
      console.warn('Copyright year element with ID "copyright-year" not found');
    }
  });
