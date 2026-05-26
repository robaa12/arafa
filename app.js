/*
 * app.js
 * Arafa Day Supplications & Azkar Interactive Logic Engine
 */

document.addEventListener('DOMContentLoaded', () => {
  // --- APPLICATION STATE ---
  let duaas = [];
  let currentIndex = 0;
  let currentRepCount = 0;
  let targetReps = 1;
  let globalTargetReps = 1;
  let bookmarkedIds = [];
  let currentFilter = 'all'; // 'all' or 'favorites'
  let currentFontSize = 2.2; // in rem
  let activeTheme = 'dark';
  
  // --- DOM ELEMENTS ---
  const duaaCard = document.getElementById('duaa-card');
  const duaaArabic = document.getElementById('duaa-arabic');
  const duaaReference = document.getElementById('duaa-reference');
  const duaaMeta = document.getElementById('duaa-meta');
  const bookmarkBtn = document.getElementById('bookmark-btn');
  const currentRepEl = document.getElementById('current-rep-count');
  const targetRepEl = document.getElementById('target-rep-count');
  const ringProgress = document.getElementById('ring-progress');
  const instructionLabel = document.getElementById('instruction-label');
  
  // Toolbars & Nav controls
  const prevBtn = document.getElementById('prev-btn');
  const nextBtn = document.getElementById('next-btn');
  const navIndicator = document.getElementById('nav-indicator');
  const progressPct = document.getElementById('progress-percentage');
  const progressBarInner = document.getElementById('progress-bar-inner');
  const copyBtn = document.getElementById('copy-btn');
  const shareBtn = document.getElementById('share-btn');
  
  // Setting & Drawers
  const themeToggle = document.getElementById('theme-toggle');
  const settingsToggle = document.getElementById('settings-toggle');
  const settingsHud = document.getElementById('settings-hud');
  const fontSizeSlider = document.getElementById('font-size-slider');
  const repsSlider = document.getElementById('reps-slider');
  const repsValueLabel = document.getElementById('reps-value');
  
  const drawerToggle = document.getElementById('drawer-toggle');
  const drawerOverlay = document.getElementById('drawer-overlay');
  const selectorDrawer = document.getElementById('selector-drawer');
  const drawerClose = document.getElementById('drawer-close');
  const filterAllBtn = document.getElementById('filter-all-btn');
  const filterFavBtn = document.getElementById('filter-fav-btn');
  const allCountEl = document.getElementById('all-count');
  const favCountEl = document.getElementById('fav-count');
  const duaaListContainer = document.getElementById('duaa-list-container');
  
  const toast = document.getElementById('toast');
  const toastText = document.getElementById('toast-text');

  // --- INITIALIZATION ---
  async function initializeApp() {
    // Load local storage preferences
    currentIndex = parseInt(localStorage.getItem('arafa_duaa_index')) || 0;
    globalTargetReps = parseInt(localStorage.getItem('arafa_duaa_reps')) || 1;
    targetReps = globalTargetReps;
    bookmarkedIds = JSON.parse(localStorage.getItem('arafa_duaa_favorites')) || [];
    currentFontSize = parseFloat(localStorage.getItem('arafa_duaa_font_size')) || 2.2;
    activeTheme = localStorage.getItem('arafa_duaa_theme') || 'dark';
    
    // Set active settings views
    fontSizeSlider.value = currentFontSize;
    repsSlider.value = globalTargetReps;
    updateRepsLabel(globalTargetReps);
    setTheme(activeTheme);
    
    // Fetch supplications list
    try {
      const response = await fetch('duaas.json');
      duaas = await response.json();
    } catch (error) {
      console.error('Failed to load duaas.json, using offline fallback', error);
      duaas = [
        {
          "id": "best_arafa",
          "title": "أفضل دعاء يوم عرفة",
          "text": "لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ، وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ.",
          "source": "رواه الترمذي (حديث صحيح)",
          "reps": 1
        }
      ];
    }

    // Safeguard current index bounds
    if (currentIndex >= duaas.length || currentIndex < 0) {
      currentIndex = 0;
    }
    
    // Update interface views
    renderDuaa();
    renderDrawerList();
    updateCounts();
  }

  // --- UI RENDER SYSTEM ---
  function renderDuaa() {
    if (duaas.length === 0) return;
    
    const duaa = duaas[currentIndex];
    
    // Set texts
    duaaArabic.textContent = duaa.text;
    duaaReference.textContent = duaa.source;
    duaaMeta.textContent = duaa.title || `الدعاء النبوي ${currentIndex + 1}`;
    
    // Apply font size
    duaaArabic.style.fontSize = `${currentFontSize}rem`;
    
    // Bookmark status update
    const isBookmarked = bookmarkedIds.includes(duaa.id);
    if (isBookmarked) {
      bookmarkBtn.classList.add('active');
      bookmarkBtn.querySelector('i').className = 'fa-solid fa-bookmark';
    } else {
      bookmarkBtn.classList.remove('active');
      bookmarkBtn.querySelector('i').className = 'fa-regular fa-bookmark';
    }
    
    // Reset Tasbeeh counter for the new card: Use duaa-specific reps if > 1, otherwise global preference
    const duaaReps = duaa.reps || 1;
    targetReps = duaaReps > 1 ? duaaReps : globalTargetReps;
    currentRepCount = 0;
    updateTasbeehCounter();
    
    // Navigation indicators
    navIndicator.textContent = `${currentIndex + 1} / ${duaas.length}`;
    prevBtn.disabled = currentIndex === 0;
    nextBtn.disabled = currentIndex === duaas.length - 1;
    
    // Progression percentage and slider width
    const completionPercentage = Math.round(((currentIndex + 1) / duaas.length) * 100);
    progressPct.textContent = `${completionPercentage}%`;
    progressBarInner.style.width = `${completionPercentage}%`;
    
    // Update selected class in drawer list
    document.querySelectorAll('.list-item-duaa').forEach((item, index) => {
      if (index === currentIndex) {
        item.classList.add('active');
        item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } else {
        item.classList.remove('active');
      }
    });
  }

  // Update Tasbeeh metrics and svg offset
  function updateTasbeehCounter() {
    currentRepEl.textContent = currentRepCount;
    targetRepEl.textContent = `/ ${targetReps}`;
    
    // Circular progress stroke offset formula
    const circumference = 263.89; // 2 * PI * r (42)
    const progress = currentRepCount / targetReps;
    const strokeDashoffset = circumference - (progress * circumference);
    ringProgress.style.strokeDashoffset = strokeDashoffset;
    
    // Update instruction label
    if (targetReps > 1) {
      instructionLabel.innerHTML = `<i class="fa-solid fa-hand-pointer"></i> <span>انقر لتكرار التسبيح (${currentRepCount}/${targetReps})</span>`;
    } else {
      instructionLabel.innerHTML = `<i class="fa-solid fa-hand-pointer"></i> <span>انقر فوق البطاقة للانتقال للتالي</span>`;
    }
  }

  // Handle reps target change
  function updateRepsLabel(val) {
    globalTargetReps = val;
    localStorage.setItem('arafa_duaa_reps', globalTargetReps);
    if (val === 1) {
      repsValueLabel.textContent = "مرة واحدة";
    } else if (val === 2) {
      repsValueLabel.textContent = "مرتين (٢)";
    } else if (val >= 3 && val <= 10) {
      repsValueLabel.textContent = `${val} مرات`;
    } else {
      repsValueLabel.textContent = `${val} تكرار`;
    }
    
    // If the active duaa has its own custom reps > 1, use that, otherwise use global slider
    const duaa = duaas[currentIndex];
    const duaaReps = (duaa && duaa.reps) ? duaa.reps : 1;
    targetReps = duaaReps > 1 ? duaaReps : globalTargetReps;
    
    updateTasbeehCounter();
  }

  // --- TRANSITIONS & NAV ENGINE ---
  function navigateTo(index, direction = 'next') {
    if (index < 0 || index >= duaas.length) return;
    
    // Add slide exit animation to card
    const exitClass = direction === 'next' ? 'slide-out-left' : 'slide-out-right';
    const enterClass = direction === 'next' ? 'slide-in-right' : 'slide-in-left';
    
    duaaCard.classList.add(exitClass);
    
    setTimeout(() => {
      currentIndex = index;
      localStorage.setItem('arafa_duaa_index', currentIndex);
      renderDuaa();
      
      // Clean up exit class and add entrance class
      duaaCard.classList.remove(exitClass);
      duaaCard.classList.add(enterClass);
      
      // Remove enter class after animation finishes
      setTimeout(() => {
        duaaCard.classList.remove(enterClass);
      }, 450);
    }, 350);
  }

  // Trigger next or loop
  function handleNext() {
    if (currentIndex < duaas.length - 1) {
      navigateTo(currentIndex + 1, 'next');
    } else {
      showToast("تقبل الله طاعاتكم! أتممت مجلس الذكر.");
      navigateTo(0, 'next');
    }
  }

  // Trigger prev
  function handlePrev() {
    if (currentIndex > 0) {
      navigateTo(currentIndex - 1, 'prev');
    }
  }

  // --- TASBEEH TAPPING HANDLER ---
  function handleCardTap(e) {
    // Avoid tapping trigger when clicking inner bookmark button
    if (e.target.closest('#bookmark-btn')) return;
    
    // Visual ripple effect inside card at click position
    createRipple(e);
    
    // Increment repeat count
    currentRepCount++;
    
    if (currentRepCount >= targetReps) {
      // Completed current duaa reps!
      
      // Flash glowing emerald border
      duaaCard.classList.add('matched');
      setTimeout(() => {
        duaaCard.classList.remove('matched');
        handleNext();
      }, 700);
    } else {
      updateTasbeehCounter();
    }
  }

  function createRipple(event) {
    const rect = duaaCard.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    const ripple = document.createElement('span');
    ripple.classList.add('ripple-element');
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    
    duaaCard.appendChild(ripple);
    
    setTimeout(() => {
      ripple.remove();
    }, 750);
  }

  // --- BOOKMARKS & FAVORITES ENGINE ---
  function toggleBookmark() {
    if (duaas.length === 0) return;
    
    const currentId = duaas[currentIndex].id;
    const index = bookmarkedIds.indexOf(currentId);
    
    if (index === -1) {
      // Add bookmark
      bookmarkedIds.push(currentId);
      bookmarkBtn.classList.add('active');
      bookmarkBtn.querySelector('i').className = 'fa-solid fa-bookmark';
      showToast("تم الحفظ في قائمة المفضلة");
    } else {
      // Remove bookmark
      bookmarkedIds.splice(index, 1);
      bookmarkBtn.classList.remove('active');
      bookmarkBtn.querySelector('i').className = 'fa-regular fa-bookmark';
      showToast("تم الحذف من المفضلة");
    }
    
    localStorage.setItem('arafa_duaa_favorites', JSON.stringify(bookmarkedIds));
    
    // Refresh drawer views
    updateCounts();
    renderDrawerList();
  }

  function updateCounts() {
    allCountEl.textContent = duaas.length;
    favCountEl.textContent = bookmarkedIds.length;
  }

  // --- DRAWER SELECTOR & GRID VIEW ---
  function renderDrawerList() {
    duaaListContainer.innerHTML = '';
    
    let filteredList = duaas;
    if (currentFilter === 'favorites') {
      filteredList = duaas.filter(d => bookmarkedIds.includes(d.id));
    }
    
    if (filteredList.length === 0) {
      const emptyMsg = document.createElement('div');
      emptyMsg.style.textAlign = 'center';
      emptyMsg.style.padding = '2rem';
      emptyMsg.style.color = 'var(--text-secondary)';
      emptyMsg.style.fontSize = '0.9rem';
      emptyMsg.textContent = currentFilter === 'favorites' ? "لا يوجد أدعية محفوظة في المفضلة حالياً." : "لا يوجد أدعية متوفرة.";
      duaaListContainer.appendChild(emptyMsg);
      return;
    }
    
    filteredList.forEach((duaa) => {
      // Find its absolute index in main list
      const mainIndex = duaas.findIndex(d => d.id === duaa.id);
      
      const item = document.createElement('div');
      item.classList.add('list-item-duaa');
      if (mainIndex === currentIndex) {
        item.classList.add('active');
      }
      
      item.innerHTML = `
        <div class="item-meta">
          <span>الدعاء ${mainIndex + 1}</span>
          <span style="opacity: 0.8;">${duaa.source}</span>
        </div>
        <div class="item-preview">${duaa.text}</div>
      `;
      
      item.addEventListener('click', () => {
        navigateTo(mainIndex, mainIndex > currentIndex ? 'next' : 'prev');
        toggleDrawer(false);
      });
      
      duaaListContainer.appendChild(item);
    });
  }

  function toggleDrawer(forceState = null) {
    const isOpen = forceState !== null ? forceState : !selectorDrawer.classList.contains('contains');
    
    if (isOpen) {
      selectorDrawer.classList.add('active');
      drawerOverlay.classList.add('active');
      selectorDrawer.setAttribute('aria-hidden', 'false');
      renderDrawerList();
    } else {
      selectorDrawer.classList.remove('active');
      drawerOverlay.classList.remove('active');
      selectorDrawer.setAttribute('aria-hidden', 'true');
    }
  }

  // --- SETTINGS HUD & GENERAL EVENT BINDINGS ---
  function setTheme(theme) {
    activeTheme = theme;
    localStorage.setItem('arafa_duaa_theme', theme);
    document.body.setAttribute('data-theme', theme);
    
    if (theme === 'light') {
      themeToggle.innerHTML = '<i class="fa-solid fa-sun"></i>';
      themeToggle.title = "المظهر الداكن";
    } else {
      themeToggle.innerHTML = '<i class="fa-solid fa-moon"></i>';
      themeToggle.title = "المظهر المضيء";
    }
  }

  function showToast(message) {
    toastText.textContent = message;
    toast.classList.add('show');
    
    setTimeout(() => {
      toast.classList.remove('show');
    }, 2800);
  }

  function handleCopy() {
    if (duaas.length === 0) return;
    const duaa = duaas[currentIndex];
    const copyString = `✨ أذكار وأدعية ✨\n\n${duaa.text}\n\n📚 المصدر: ${duaa.source}\n\n🕌 أذكار وأدعية يوم عرفة - نسألكم صالح الدعاء`;
    
    navigator.clipboard.writeText(copyString)
      .then(() => showToast("تم نسخ الدعاء والمصدر إلى الحافظة"))
      .catch(() => showToast("عذراً، فشل نسخ النص"));
  }

  function handleShare() {
    if (duaas.length === 0) return;
    const duaa = duaas[currentIndex];
    
    const shareData = {
      title: 'أدعية يوم عرفة',
      text: `${duaa.text}\n\n📚 المصدر: ${duaa.source}`,
      url: window.location.href
    };
    
    if (navigator.share) {
      navigator.share(shareData)
        .then(() => console.log('Successfully shared'))
        .catch((error) => console.log('Error sharing:', error));
    } else {
      handleCopy();
    }
  }

  // Bind Event Listeners
  duaaCard.addEventListener('click', handleCardTap);
  prevBtn.addEventListener('click', handlePrev);
  nextBtn.addEventListener('click', handleNext);
  bookmarkBtn.addEventListener('click', toggleBookmark);
  copyBtn.addEventListener('click', handleCopy);
  shareBtn.addEventListener('click', handleShare);
  
  // Drawer controls
  drawerToggle.addEventListener('click', () => toggleDrawer(true));
  drawerClose.addEventListener('click', () => toggleDrawer(false));
  drawerOverlay.addEventListener('click', () => toggleDrawer(false));
  
  filterAllBtn.addEventListener('click', () => {
    currentFilter = 'all';
    filterAllBtn.classList.add('active');
    filterFavBtn.classList.remove('active');
    renderDrawerList();
  });
  
  filterFavBtn.addEventListener('click', () => {
    currentFilter = 'favorites';
    filterFavBtn.classList.add('active');
    filterAllBtn.classList.remove('active');
    renderDrawerList();
  });
  
  // Settings controls
  settingsToggle.addEventListener('click', (e) => {
    e.stopPropagation();
    settingsHud.classList.toggle('active');
  });
  
  document.addEventListener('click', (e) => {
    if (settingsHud.classList.contains('active') && !e.target.closest('#settings-hud') && !e.target.closest('#settings-toggle')) {
      settingsHud.classList.remove('active');
    }
  });

  fontSizeSlider.addEventListener('input', (e) => {
    currentFontSize = parseFloat(e.target.value);
    localStorage.setItem('arafa_duaa_font_size', currentFontSize);
    duaaArabic.style.fontSize = `${currentFontSize}rem`;
  });

  repsSlider.addEventListener('input', (e) => {
    const val = parseInt(e.target.value);
    updateRepsLabel(val);
  });

  themeToggle.addEventListener('click', () => {
    const newTheme = activeTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
  });

  duaaCard.addEventListener('keydown', (e) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      handleCardTap(e);
    } else if (e.key === 'ArrowLeft') {
      handleNext();
    } else if (e.key === 'ArrowRight') {
      handlePrev();
    }
  });

  // --- KICKSTART APPLICATION ---
  initializeApp();
});
