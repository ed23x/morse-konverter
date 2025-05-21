document.addEventListener('DOMContentLoaded', () => {
    const textInput = document.getElementById('text-input');
    const morseInput = document.getElementById('morse-input');
    const playMorseBtn = document.getElementById('play-morse-btn');
    const themeToggleBtn = document.getElementById('theme-toggle');
    const sunIcon = themeToggleBtn.querySelector('.icon-sun');
    const moonIcon = themeToggleBtn.querySelector('.icon-moon');

    const MORSE_CODE_MAP = {
        'A': '.-', 'B': '-...', 'C': '-.-.', 'D': '-..', 'E': '.', 'F': '..-.', 'G': '--.', 'H': '....',
        'I': '..', 'J': '.---', 'K': '-.-', 'L': '.-..', 'M': '--', 'N': '-.', 'O': '---', 'P': '.--.',
        'Q': '--.-', 'R': '.-.', 'S': '...', 'T': '-', 'U': '..-', 'V': '...-', 'W': '.--', 'X': '-..-',
        'Y': '-.--', 'Z': '--..',
        '1': '.----', '2': '..---', '3': '...--', '4': '....-', '5': '.....',
        '6': '-....', '7': '--...', '8': '---..', '9': '----.', '0': '-----',
        '.': '.-.-.-', ',': '--..--', '?': '..--..', "'": '.----.', '!': '-.-.--', '/': '-..-.',
        '(': '-.--.', ')': '-.--.-', '&': '.-...', ':': '---...', ';': '-.-.-.', '=': '-...-',
        '+': '.-.-.', '-': '-....-', '_': '..--.-', '"': '.-..-.', '$': '...-..-', '@': '.--.-.',
        ' ': '/' // Worttrenner im Morsecode
    };

    const TEXT_MAP = Object.fromEntries(Object.entries(MORSE_CODE_MAP).map(([key, value]) => [value, key]));

    // --- Konvertierungsfunktionen ---
    function textToMorse(text) {
        return text.toUpperCase().split('')
            .map(char => MORSE_CODE_MAP[char] || '')
            .join(' ')
            .replace(/\s+/g, ' ') // Mehrfache Leerzeichen (entstehen durch unbek. Zeichen) reduzieren
            .trim();
    }

    function morseToText(morse) {
        const trimmedMorse = morse.trim();
        if (!trimmedMorse) return ''; // Wenn nur Leerzeichen, dann leerer Text

        return trimmedMorse.split(' ')
            .map(code => {
                if (code === '/') return ' '; // Worttrenner
                return TEXT_MAP[code] || (code ? '?' : ''); // Unbekannte Codes als '?', leere Codes (durch doppelte Leerzeichen) ignorieren
            })
            .join('');
    }

    // --- Automatische Konvertierung bei Eingabe ---
    textInput.addEventListener('input', () => {
        morseInput.value = textToMorse(textInput.value);
        updatePlayButtonState();
    });

    morseInput.addEventListener('input', () => {
        textInput.value = morseToText(morseInput.value);
        updatePlayButtonState(); // Auch hier, falls Morse manuell geändert wird
    });


    // --- Audio Wiedergabe ---
    let audioContext;
    let dotDuration = 100; // ms

    function getAudioContext() {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        return audioContext;
    }

    function playTone(frequency, duration) {
        return new Promise(resolve => {
            const context = getAudioContext();
            const oscillator = context.createOscillator();
            const gainNode = context.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(context.destination);

            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(frequency, context.currentTime);
            
            gainNode.gain.setValueAtTime(0, context.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.6, context.currentTime + 0.01);
            gainNode.gain.linearRampToValueAtTime(0, context.currentTime + duration / 1000 - 0.01);

            oscillator.start(context.currentTime);
            oscillator.stop(context.currentTime + duration / 1000);
            oscillator.onended = resolve;
        });
    }

    async function playMorseSequence(morseCode) {
        playMorseBtn.disabled = true;
        const frequency = 600; // Hz

        for (const symbol of morseCode) {
            if (audioContext && audioContext.state === 'suspended') {
                await audioContext.resume();
            }
            switch (symbol) {
                case '.':
                    await playTone(frequency, dotDuration);
                    await new Promise(resolve => setTimeout(resolve, dotDuration));
                    break;
                case '-':
                    await playTone(frequency, dotDuration * 3);
                    await new Promise(resolve => setTimeout(resolve, dotDuration));
                    break;
                case ' ': // Pause zwischen Buchstaben
                    await new Promise(resolve => setTimeout(resolve, dotDuration * 2)); // 3 Einheiten (1 nach Symbol + 2 hier)
                    break;
                case '/': // Pause zwischen Wörtern
                    await new Promise(resolve => setTimeout(resolve, dotDuration * 6)); // 7 Einheiten (1 nach Symbol + 6 hier)
                    break;
            }
        }
        // Nach der Sequenz den Button-Status basierend auf dem aktuellen Zustand aktualisieren
        updatePlayButtonState();
    }
    
    function updatePlayButtonState() {
        const canPlay = morseInput.value.trim() !== '';
        playMorseBtn.disabled = !canPlay;
    }

    // Die 'input'-Events auf morseInput rufen updatePlayButtonState bereits auf.

    playMorseBtn.addEventListener('click', () => {
        if (morseInput.value.trim()) { // Checkbox-Bedingung entfernt
            if (!audioContext) {
                 getAudioContext();
            }
            if (audioContext.state === 'suspended') {
                audioContext.resume().then(() => {
                    playMorseSequence(morseInput.value.trim());
                });
            } else {
                playMorseSequence(morseInput.value.trim());
            }
        }
    });

    // --- Theme Toggle ---
    function setInitialTheme() {
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        const savedTheme = localStorage.getItem('theme');

        if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
            document.body.classList.add('dark-mode');
            moonIcon.style.display = 'inline';
            sunIcon.style.display = 'none';
        } else {
            document.body.classList.remove('dark-mode');
            sunIcon.style.display = 'inline';
            moonIcon.style.display = 'none';
        }
    }

    themeToggleBtn.addEventListener('click', () => {
        document.body.classList.toggle('dark-mode');
        const isDarkMode = document.body.classList.contains('dark-mode');
        localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
        
        if (isDarkMode) {
            moonIcon.style.display = 'inline';
            sunIcon.style.display = 'none';
        } else {
            sunIcon.style.display = 'inline';
            moonIcon.style.display = 'none';
        }
    });

    // Initialisierungen
    setInitialTheme();
    updatePlayButtonState();
});