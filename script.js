document.addEventListener('DOMContentLoaded', () => {
    // Element-Referenzen holen, sobald das DOM geladen ist
    const textInput = document.getElementById('text-input');
    const morseInput = document.getElementById('morse-input');
    const playMorseBtn = document.getElementById('play-morse-btn');
    const themeToggleBtn = document.getElementById('theme-toggle');
    const sunIcon = themeToggleBtn.querySelector('.icon-sun'); // Icon für Hellmodus
    const moonIcon = themeToggleBtn.querySelector('.icon-moon'); // Icon für Dunkelmodus

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

    // Eine umgekehrte Map erstellen, um Morsecode in Text umzuwandeln
    const TEXT_MAP = Object.fromEntries(Object.entries(MORSE_CODE_MAP).map(([key, value]) => [value, key]));

    // --- Konvertierungsfunktionen ---

    function textToMorse(text) {
        // Wandelt Text in Großbuchstaben um, splittet ihn in Zeichen,
        // ordnet jedem Zeichen den entsprechenden Morsecode zu und verbindet sie mit Leerzeichen.
        // Reduziert dann mehrfache Leerzeichen und entfernt führende/abschließende Leerzeichen.
        return text.toUpperCase().split('')
            .map(char => MORSE_CODE_MAP[char] || '') // Map jedes Zeichens zu seinem Morsecode, unbekannte Zeichen werden zu leeren Strings
            .join(' ') // Verbinde die Morsecode-Teile mit einem Leerzeichen
            .replace(/\s+/g, ' ') // Mehrfache Leerzeichen (entstehen durch unbek. Zeichen) reduzieren
            .trim(); // Entfernt führende/abschließende Leerzeichen
    }

    function morseToText(morse) {
        const trimmedMorse = morse.trim();
        if (!trimmedMorse) return ''; // Wenn nur Leerzeichen, dann leerer Text

        return trimmedMorse.split(' ')
            .map(code => {
                if (code === '/') return ' '; // Ein '/' im Morsecode wird zu einem Leerzeichen im Text
                // Ordnet jeden Morsecode-Teil seinem Textzeichen zu.
                // Wenn der Code nicht gefunden wird, wird '?' verwendet, es sei denn, der Code ist leer (doppeltes Leerzeichen im Morsecode).
                return TEXT_MAP[code] || (code ? '?' : '');
            })
            .join(''); // Verbinde die Textzeichen
    }

    // --- Automatische Konvertierung bei Eingabe ---

    // --- Automatische Konvertierung bei Eingabe ---
    // Event-Listener für das Texteingabefeld
    textInput.addEventListener('input', () => {
        morseInput.value = textToMorse(textInput.value); // Konvertiert Text zu Morse und aktualisiert das Morse-Feld
        updatePlayButtonState(); // Aktualisiert den Zustand des Abspiel-Buttons
    });

    // Event-Listener für das Morsecode-Eingabefeld
    morseInput.addEventListener('input', () => {
        textInput.value = morseToText(morseInput.value); // Konvertiert Morse zu Text und aktualisiert das Text-Feld
        updatePlayButtonState(); // Aktualisiert den Zustand des Abspiel-Buttons (auch wenn Morse manuell geändert wird)
    });


    // --- Audio Wiedergabe ---


    // --- Audio Wiedergabe ---
    let audioContext; // AudioContext-Instanz zur Klangerzeugung
    let dotDuration = 100; // ms // Dauer eines 'Punkt' im Morsecode in Millisekunden

    function getAudioContext() {
        // Erstellt oder gibt die bestehende AudioContext-Instanz zurück
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        return audioContext;
    }

    function playTone(frequency, duration) {
        // Spielt einen einzelnen Ton mit gegebener Frequenz und Dauer ab
        return new Promise(resolve => {
            const context = getAudioContext();
            const oscillator = context.createOscillator(); // Erstellt einen Oszillator (Klangerzeuger)
            const gainNode = context.createGain(); // Erstellt einen GainNode (Lautstärkeregler)

            oscillator.connect(gainNode);
            gainNode.connect(context.destination);

            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(frequency, context.currentTime);
            
            gainNode.gain.setValueAtTime(0, context.currentTime); // Startet bei Lautstärke 0
            gainNode.gain.linearRampToValueAtTime(0.6, context.currentTime + 0.01); // Rampe schnell auf Lautstärke 0.6
            gainNode.gain.linearRampToValueAtTime(0, context.currentTime + duration / 1000 - 0.01); // Rampe kurz vor Ende auf Lautstärke 0

            oscillator.start(context.currentTime);
            oscillator.stop(context.currentTime + duration / 1000);
            oscillator.onended = resolve;
        });
    }

    async function playMorseSequence(morseCode) {
        // Spielt eine Morsecode-Sequenz ab
        playMorseBtn.disabled = true; // Deaktiviert den Button während der Wiedergabe
        const frequency = 600; // Hz // Frequenz des Tons

        for (const symbol of morseCode) {
            if (audioContext && audioContext.state === 'suspended') {
                await audioContext.resume();
            }
            // Spielt den Ton basierend auf dem Morse-Symbol ab
            switch (symbol) {
                case '.': // Punkt
                    await playTone(frequency, dotDuration); // Dauer: 1 Einheit
                    await new Promise(resolve => setTimeout(resolve, dotDuration)); // Pause nach Punkt: 1 Einheit
                    break;
                case '-': // Strich
                    await playTone(frequency, dotDuration * 3); // Dauer: 3 Einheiten
                    await new Promise(resolve => setTimeout(resolve, dotDuration)); // Pause nach Strich: 1 Einheit
                    break;
                case ' ': // Pause zwischen Buchstaben
                    await new Promise(resolve => setTimeout(resolve, dotDuration * 2)); // Zusätzliche Pause: 2 Einheiten (gesamt 1 nach Symbol + 2 = 3 Einheiten)
                    break;
                case '/': // Pause zwischen Wörtern
                    await new Promise(resolve => setTimeout(resolve, dotDuration * 6)); // Zusätzliche Pause: 6 Einheiten (gesamt 1 nach Symbol + 6 = 7 Einheiten)
                    break;
            }
        }
        // Nach der Sequenz den Button-Status basierend auf dem aktuellen Zustand aktualisieren
        updatePlayButtonState();
    }

    // Funktion zur Aktualisierung des Zustands des Abspiel-Buttons
    function updatePlayButtonState() {
        // Button ist nur aktiv, wenn das Morsecode-Feld nicht leer ist (nach Trimmen von Leerzeichen)
        const canPlay = morseInput.value.trim() !== '';
        playMorseBtn.disabled = !canPlay;
    }

    // Die 'input'-Events auf morseInput rufen updatePlayButtonState bereits auf.

    // Event-Listener für den Klick auf den Abspiel-Button
    playMorseBtn.addEventListener('click', () => {
        // Stellt sicher, dass Morsecode vorhanden ist
        if (morseInput.value.trim()) {
            // AudioContext instanziieren, falls noch nicht geschehen
            if (!audioContext) {
                 getAudioContext();
            }
            // Überprüfen, ob der AudioContext suspendiert ist (z.B. nach Seitenladen durch Browser-Regeln)
            if (audioContext.state === 'suspended') {
                // AudioContext fortsetzen und dann die Wiedergabe starten
                audioContext.resume().then(() => {
                    playMorseSequence(morseInput.value.trim());
                });
            } else {
                // Direkte Wiedergabe starten
                playMorseSequence(morseInput.value.trim());
            }
        }
    });

    // --- Theme Toggle ---

    // --- Theme Toggle ---
    // Funktion zum Setzen des anfänglichen Themes basierend auf localStorage oder Systempräferenzen
    function setInitialTheme() {
        // Prüft, ob das System den Dunkelmodus bevorzugt
        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        // Holt das gespeicherte Theme aus dem lokalen Speicher
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

    // Event-Listener für den Klick auf den Theme-Toggle-Button
    themeToggleBtn.addEventListener('click', () => {
        // Schaltet die 'dark-mode' Klasse auf dem Body um
        document.body.classList.toggle('dark-mode');
        // Prüft, ob der Dunkelmodus jetzt aktiv ist
        const isDarkMode = document.body.classList.contains('dark-mode');
        // Speichert die Theme-Präferenz im lokalen Speicher
        localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
        
        if (isDarkMode) {
            moonIcon.style.display = 'inline';
            sunIcon.style.display = 'none';
        } else {
            sunIcon.style.display = 'inline';
            moonIcon.style.display = 'none';
        }
        // Schaltet die Sichtbarkeit der Icons um
        if (isDarkMode) {
            moonIcon.style.display = 'inline';
            sunIcon.style.display = 'none';
        } else {
            sunIcon.style.display = 'inline';
            moonIcon.style.display = 'none';
        }
    });

    // Initialisierungen beim Laden der Seite
    setInitialTheme(); // Setzt das Theme beim Start
    updatePlayButtonState(); // Aktualisiert den Zustand des Buttons beim Start
});