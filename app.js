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
  
  // Audio synthesis & speech recognition states
  let isListening = false;
  let recognition = null;
  let isReciting = false;
  let currentUtterance = null;
  
  // --- DOM ELEMENTS ---
  const duaaCard = document.getElementById('duaa-card');
  const duaaArabic = document.getElementById('duaa-arabic');
  const duaaReference = document.getElementById('duaa-reference');
  const duaaMeta = document.getElementById('duaa-meta');
  const bookmarkBtn = document.getElementById('bookmark-btn');
  const currentRepEl = document.getElementById('current-rep-count');
  const targetRepEl = document.getElementById('target-rep-count');
  const ringProgress = document.getElementById('ring-progress');
  const speechWave = document.getElementById('speech-wave');
  const instructionLabel = document.getElementById('instruction-label');
  
  // Toolbars & Nav controls
  const prevBtn = document.getElementById('prev-btn');
  const nextBtn = document.getElementById('next-btn');
  const navIndicator = document.getElementById('nav-indicator');
  const progressPct = document.getElementById('progress-percentage');
  const progressBarInner = document.getElementById('progress-bar-inner');
  const speakSynthesisBtn = document.getElementById('speak-synthesis-btn');
  const voiceRecognitionToggle = document.getElementById('voice-recognition-toggle');
  const speechBtnLabel = document.getElementById('speech-btn-label');
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

  // --- AUDIO HELPER (SYNTHESIZED DING SOUND) ---
  // Uses Web Audio API to play a sweet, spiritual chime when a duaa or tasbeeh is successfully completed
  function playSuccessChime(isTasbeeh = false) {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      
      if (isTasbeeh) {
        // High soft bubble tap sound
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
        gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.15);
      } else {
        // Double sweet spiritual bell/chime
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
        osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.1); // E5
        osc.frequency.setValueAtTime(1046.50, audioCtx.currentTime + 0.2); // C6
        
        gain.gain.setValueAtTime(0.12, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.6);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.6);
      }
    } catch (e) {
      console.log('Web Audio context not allowed or not supported yet.', e);
    }
  }

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
      // Inline robust fallback to ensure it NEVER fails
      duaas = [
        {
          "id": "best_arafa",
          "title": "أفضل دعاء يوم عرفة",
          "text": "لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ، وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ.",
          "source": "رواه الترمذي (حديث صحيح)",
          "meaning": "La ilaha illallah, wahdahu la sharika lah, lahul-mulku wa lahul-hamdu, wa huwa 'ala kulli shay'in qadir."
        },
        {
          "id": "ibn_baz_1",
          "title": "جوامع الاستغفار والتوبة",
          "text": "اللَّهُمَّ اغْفِرْ لِي خَطِيئَتِي وَجَهْلِي، وَإِسْرَافِي فِي أَمْرِي، وَمَا أَنْتَ أَعْلَمُ بِهِ مِنِّي، اللَّهُمَّ اغْفِرْ لِي جَدِّي وَهَزْلِي، وَخَطَئِي وَعَمْدِي، وَكُلُّ ذَلِكَ عِنْدِي، اللَّهُمَّ اغْفِرْ لِي مَا قَدَّمْتُ وَمَا أَخَّرْتُ، وَمَا أَسْرَرْتُ وَمَا أَعْلَنْتُ، وَمَا أَنْتَ أَعْلَمُ بِهِ مِنِّي، أَنْتَ الْمُقَدِّمُ وَأَنْتَ الْمُؤَخِّرُ، وَأَنْتَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ.",
          "source": "رواه البخاري ومسلم"
        },
        {
          "id": "ibn_baz_2",
          "title": "صلاح الدين والدنيا والآخرة",
          "text": "اللَّهُمَّ أَصْلِحْ لِي دِينِي الَّذِي هُوَ عِصْمَةُ أَمْرِي، وَأَصْلِحْ لِي دُنْيَايَ الَّتِي فِيهَا مَعَاشِي، وَأَصْلِحْ لِي آخِرَتِي الَّتِي فِيهَا مَعَادِي، وَاجْعَلِ الْحَيَاةَ زِيَادَةً لِي فِي كُلِّ خَيْرٍ، وَاجْعَلِ الْمَوْتَ رَاحَةً لِي مِنْ كُلِّ شَرٍّ.",
          "source": "رواه مسلم"
        }
      ];
    }

    // Safeguard current index bounds
    if (currentIndex >= duaas.length || currentIndex < 0) {
      currentIndex = 0;
    }
    
    // Bind speech recognition engine if available
    initSpeechRecognition();
    
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

    // Stop recitation if voice is reading when navigating
    stopSpeechSynthesis();
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
    if (isListening) {
      instructionLabel.innerHTML = `<i class="fa-solid fa-microphone"></i> <span>اقرأ الدعاء بصوتك، أو انقر للتسبيح</span>`;
    } else {
      if (targetReps > 1) {
        instructionLabel.innerHTML = `<i class="fa-solid fa-hand-pointer"></i> <span>انقر لتكرار التسبيح (${currentRepCount}/${targetReps})</span>`;
      } else {
        instructionLabel.innerHTML = `<i class="fa-solid fa-hand-pointer"></i> <span>انقر فوق البطاقة للانتقال للتالي</span>`;
      }
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
      // Loop back to start with visual chimes
      playSuccessChime(false);
      showToast("تقبل الله طاعاتكم! أتممت مجلس الذكر.");
      navigateTo(0, 'next');
    }
  }

  function handlePrev() {
    if (currentIndex > 0) {
      navigateTo(currentIndex - 1, 'prev');
    }
  }

  // --- TASBEEH TAPPING HANDLER ---
  function handleCardTap(e) {
    // Avoid tapping trigger when clicking inner buttons (like favorites or speech synthesis)
    if (e.target.closest('#bookmark-btn') || e.target.closest('#speak-synthesis-btn')) return;
    
    // Visual ripple effect inside card at click position
    createRipple(e);
    
    // Increment repeat count
    currentRepCount++;
    
    if (currentRepCount >= targetReps) {
      // Completed current duaa reps!
      playSuccessChime(false);
      
      // Flash glowing emerald border
      duaaCard.classList.add('matched');
      setTimeout(() => {
        duaaCard.classList.remove('matched');
        handleNext();
      }, 700);
    } else {
      // Just a simple tap rep increment
      playSuccessChime(true);
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

  // --- ARABIC SPEECH RECOGNITION (VOICE CONTROL) ---
  function initSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      console.log('Web Speech Recognition API is not supported in this browser.');
      voiceRecognitionToggle.style.display = 'none'; // hide voice button if completely unsupported
      return;
    }
    
    recognition = new SpeechRecognition();
    recognition.lang = 'ar-SA';
    recognition.continuous = true;
    recognition.interimResults = true;
    
    recognition.onstart = () => {
      isListening = true;
      speechWave.classList.add('active');
      voiceRecognitionToggle.classList.add('active');
      voiceRecognitionToggle.querySelector('i').className = 'fa-solid fa-microphone';
      speechBtnLabel.textContent = "الاستماع مفعل";
      updateTasbeehCounter();
      showToast("تم تفعيل الميكروفون، يمكنك القراءة الآن");
    };
    
    recognition.onend = () => {
      // Auto-restart if user wanted to keep it active
      if (isListening) {
        try {
          recognition.start();
        } catch (e) {
          console.log('Error restarting recognition:', e);
        }
      } else {
        speechWave.classList.remove('active');
        voiceRecognitionToggle.classList.remove('active');
        voiceRecognitionToggle.querySelector('i').className = 'fa-solid fa-microphone-slash';
        speechBtnLabel.textContent = "التحدث للتنقل";
        updateTasbeehCounter();
      }
    };
    
    recognition.onerror = (event) => {
      console.log('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        showToast("خطأ: لم يتم إعطاء صلاحية الوصول للميكروفون");
        toggleListening(false);
      }
    };
    
    recognition.onresult = (event) => {
      if (duaas.length === 0) return;
      
      let interimTranscript = '';
      let finalTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
      
      const combinedTranscript = (finalTranscript + ' ' + interimTranscript).trim();
      if (!combinedTranscript) return;
      
      console.log('Spoken:', combinedTranscript);
      
      // Perform text normalization match against the current active duaa
      const activeDuaaText = duaas[currentIndex].text;
      const isMatched = matchArabicText(combinedTranscript, activeDuaaText);
      
      if (isMatched) {
        // Stop recognition momentarily to prevent double triggers
        recognition.stop();
        
        // Visual ding + counter completion
        currentRepCount = targetReps;
        updateTasbeehCounter();
        
        playSuccessChime(false);
        duaaCard.classList.add('matched');
        
        showToast("قراءة صحيحة! جاري الانتقال...");
        
        setTimeout(() => {
          duaaCard.classList.remove('matched');
          handleNext();
        }, 1200);
      }
    };
  }

  function toggleListening(forceState = null) {
    if (!recognition) {
      showToast("عذراً، متصفحك الحالي لا يدعم ميزة التعرف على الصوت");
      return;
    }
    
    const targetState = forceState !== null ? forceState : !isListening;
    
    if (targetState) {
      isListening = true;
      try {
        recognition.start();
      } catch (e) {
        console.log('Error starting recognition:', e);
      }
    } else {
      isListening = false;
      try {
        recognition.stop();
      } catch (e) {
        console.log('Error stopping recognition:', e);
      }
      speechWave.classList.remove('active');
      voiceRecognitionToggle.classList.remove('active');
      voiceRecognitionToggle.querySelector('i').className = 'fa-solid fa-microphone-slash';
      speechBtnLabel.textContent = "التحدث للتنقل";
      updateTasbeehCounter();
      showToast("تم إيقاف الميكروفون");
    }
  }

  // --- ARABIC TEXT NORMALIZATION & KEYWORD MATCHING ENGINE ---
  function normalizeArabic(txt) {
    if (!txt) return '';
    // Strip diacritics (fatha, damma, kasra, shadda, tanween, etc.)
    txt = txt.replace(/[\u064B-\u065F\u0670]/g, '');
    // Normalize alefs to a simple bare alef
    txt = txt.replace(/[أإآ]/g, 'ا');
    // Normalize teh marbuta to simple heh
    txt = txt.replace(/ة\b/g, 'ه');
    // Normalize symbols & punctuation
    txt = txt.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()«»""'؟?]/g, '');
    // Replace multiple spaces with a single space
    txt = txt.replace(/\s+/g, ' ');
    return txt.trim().toLowerCase();
  }

  function matchArabicText(spoken, original) {
    const cleanSpoken = normalizeArabic(spoken);
    const cleanOriginal = normalizeArabic(original);
    
    if (!cleanSpoken || !cleanOriginal) return false;
    
    // Quick direct check
    if (cleanSpoken.includes(cleanOriginal) || cleanOriginal.includes(cleanSpoken)) {
      return true;
    }
    
    // Keyword Matching:
    // Split into individual words
    const spokenWords = cleanSpoken.split(' ');
    const originalWords = cleanOriginal.split(' ');
    
    // Filter original words to only keep significant words (>= 3 chars) to avoid matches on simple prepositions like 'في', 'من'
    const significantOriginalWords = originalWords.filter(word => word.length >= 3);
    
    if (significantOriginalWords.length === 0) return false;
    
    // Count how many significant original words exist in the spoken text
    let matchedCount = 0;
    for (const originalWord of significantOriginalWords) {
      // We check if the word exists in the spoken transcript
      if (spokenWords.some(spokenWord => spokenWord.includes(originalWord) || originalWord.includes(spokenWord))) {
        matchedCount++;
      }
    }
    
    // Match threshold: If the user says at least 3 significant words, OR at least 30% of the significant words of the Duaa, it matches!
    // This allows natural recitation where Speech recognition might miss a word or two or have slightly different transcription.
    const matchPercentage = matchedCount / significantOriginalWords.length;
    const isKeywordMatched = matchedCount >= 3 || (significantOriginalWords.length <= 4 && matchedCount >= 2) || matchPercentage >= 0.35;
    
    console.log(`Matching metrics: Spoken matches ${matchedCount}/${significantOriginalWords.length} words (${Math.round(matchPercentage*100)}%). Matched: ${isKeywordMatched}`);
    
    return isKeywordMatched;
  }

  // --- ARABIC TEXT-TO-SPEECH (TTS SYNTHESIS RECITER) ---
  function speakDuaa() {
    if (!window.speechSynthesis) {
      showToast("عذراً، متصفحك الحالي لا يدعم ميزة نطق النصوص");
      return;
    }
    
    if (isReciting) {
      stopSpeechSynthesis();
      return;
    }
    
    if (duaas.length === 0) return;
    
    const duaaText = duaas[currentIndex].text;
    
    // Clean text of punctuation that makes synthesizers pause weirdly, but keep commas
    const cleanForSpeech = duaaText.replace(/[«»()]/g, '');
    
    currentUtterance = new SpeechSynthesisUtterance(cleanForSpeech);
    currentUtterance.lang = 'ar-SA';
    currentUtterance.rate = 0.85; // slightly slower for peaceful, clear recitation
    
    // Try to find a native Arabic voice
    const voices = window.speechSynthesis.getVoices();
    const arabicVoice = voices.find(voice => voice.lang.startsWith('ar'));
    if (arabicVoice) {
      currentUtterance.voice = arabicVoice;
    }
    
    currentUtterance.onstart = () => {
      isReciting = true;
      speakSynthesisBtn.classList.add('active');
      speakSynthesisBtn.innerHTML = '<i class="fa-solid fa-square"></i>';
      showToast("جاري تلاوة الدعاء الشريف...");
    };
    
    currentUtterance.onend = () => {
      isReciting = false;
      speakSynthesisBtn.classList.remove('active');
      speakSynthesisBtn.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
    };
    
    currentUtterance.onerror = (e) => {
      console.log('Speech synthesis error:', e);
      isReciting = false;
      speakSynthesisBtn.classList.remove('active');
      speakSynthesisBtn.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
    };
    
    window.speechSynthesis.speak(currentUtterance);
  }

  function stopSpeechSynthesis() {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    isReciting = false;
    speakSynthesisBtn.classList.remove('active');
    speakSynthesisBtn.innerHTML = '<i class="fa-solid fa-volume-high"></i>';
  }

  // Load voices dynamically since browsers load them asynchronously
  if (window.speechSynthesis && window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = () => {
      console.log('Speech synthesis voices loaded successfully.');
    };
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
    const isOpen = forceState !== null ? forceState : !selectorDrawer.classList.contains('active');
    
    if (isOpen) {
      selectorDrawer.classList.add('active');
      drawerOverlay.classList.add('active');
      selectorDrawer.setAttribute('aria-hidden', 'false');
      renderDrawerList(); // refresh
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
    const copyString = `✨ أذكار يوم عرفة ✨\n\n${duaa.text}\n\n📚 المصدر: ${duaa.source}\n\n🕌 أذكار وأدعية يوم عرفة - نسألكم صالح الدعاء`;
    
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
      // Fallback to copy string
      handleCopy();
    }
  }

  // Bind Event Listeners
  duaaCard.addEventListener('click', handleCardTap);
  prevBtn.addEventListener('click', handlePrev);
  nextBtn.addEventListener('click', handleNext);
  bookmarkBtn.addEventListener('click', toggleBookmark);
  speakSynthesisBtn.addEventListener('click', speakDuaa);
  voiceRecognitionToggle.addEventListener('click', () => toggleListening());
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
  
  // Close settings HUD when clicking outside
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

  // Access keyboard triggers for accessibility
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
