// Erstelle eine Liste mit Ball
const imageList = [];
for (let i = 0; i <= 5; i++) {
    imageList.push(`ball/ball_${i}.png`);
}

// Erstelle eine Liste mit Sonne
const sunImageList = [];
for (let i = 0; i <= 13; i++) {
    sunImageList.push(`sun/sun_${i}.png`);
}

// Nur die ersten Bilder für die Anzeige
const singleImages = [
    'ball/ball_0.png',
    'sun/sun_0.png'
];

// Aktueller Index und Auto-Zustände
let currentSunIndex = 0;
let currentBallIndex = 0;
let ballDirection = 1; // 1 für vorwärts, -1 für rückwärts
let sunAutoInterval = null;
let ballAutoInterval = null;

// Funktion zum Erzeugen von <img>-Elementen und Hinzufügen zum HTML
function displayImages(containerId, images) {
    const container = document.getElementById(containerId);
    container.innerHTML = ''; // Container leeren
    images.forEach(src => {
        const img = document.createElement('img');
        img.src = src;
        img.alt = src;
        img.style.margin = '8px';
        container.appendChild(img);
    });
}

// Funktion zum Aktualisieren der angezeigten Bilder
function initDisplay() {
    const container = document.getElementById('image-container');
    container.innerHTML = ''; // Container leeren

    // Ball Bereich erstellen
    const ballDiv = document.createElement('div');
    ballDiv.style.display = 'inline-block';
    ballDiv.style.margin = '20px';
    ballDiv.style.textAlign = 'center';

    const ballImg = document.createElement('img');
    ballImg.id = 'ball';
    ballImg.src = `ball/ball_${currentBallIndex}.png`;
    ballImg.alt = `ball_${currentBallIndex}`;
    ballImg.style.display = 'block';
    ballImg.style.margin = '0 auto 10px auto';

    const ballButtons = document.createElement('div');
    ballButtons.innerHTML = `
        <button onclick="ballLeft()">ballL</button>
        <button onclick="ballAuto()">ballAuto</button>
        <button onclick="ballRight()">ballR</button>
    `;

    ballDiv.appendChild(ballImg);
    ballDiv.appendChild(ballButtons);

    // Sun Bereich erstellen
    const sunDiv = document.createElement('div');
    sunDiv.style.display = 'inline-block';
    sunDiv.style.margin = '20px';
    sunDiv.style.textAlign = 'center';

    const sunImg = document.createElement('img');
    sunImg.id = 'sun';
    sunImg.src = `sun/sun_${currentSunIndex}.png`;
    sunImg.alt = `sun_${currentSunIndex}`;
    sunImg.style.display = 'block';
    sunImg.style.margin = '0 auto 10px auto';

    const sunButtons = document.createElement('div');
    sunButtons.innerHTML = `
        <button onclick="sunLeft()">sunL</button>
        <button onclick="sunAuto()">sunAuto</button>
        <button onclick="sunRight()">sunR</button>
    `;

    sunDiv.appendChild(sunImg);
    sunDiv.appendChild(sunButtons);

    container.appendChild(ballDiv);
    container.appendChild(sunDiv);
    const imgTag = document.getElementById("anzeige");
    imgTag.src = images[index];
}

// Build display
initDisplay();

// Funktion zum Aktualisieren der angezeigten Bilder
function updateDisplay() {
    const ballImg = document.getElementById("ball");
    ballImg.src = `ball/ball_${currentBallIndex}.png`;
    const sunImg = document.getElementById("sun");
    sunImg.src = `sun/sun_${currentSunIndex}.png`;
}

// Sun Button Funktionen
function sunLeft() {
    currentSunIndex = (currentSunIndex - 1 + sunImageList.length) % sunImageList.length;
    updateDisplay();
}

function sunRight() {
    currentSunIndex = (currentSunIndex + 1) % sunImageList.length;
    updateDisplay();
}

function sunAuto() {
    if (sunAutoInterval) {
        clearInterval(sunAutoInterval);
        sunAutoInterval = null;
    } else {
        sunAutoInterval = setInterval(() => {
            sunRight();
        }, 600); // Alle 600ms wechseln
    }
}

// Ball Button Funktionen
function ballLeft() {
    if (currentBallIndex === 0 && ballDirection === 1) {
        ballDirection = -1;
        currentBallIndex = 1;
    } else if (currentBallIndex === 5 && ballDirection === -1) {
        ballDirection = 1;
        currentBallIndex = 4;
    } else {
        currentBallIndex -= ballDirection;
    }
    updateDisplay();
}

function ballRight() {
    if (currentBallIndex === 5 && ballDirection === 1) {
        ballDirection = -1;
        currentBallIndex = 4;
    } else if (currentBallIndex === 0 && ballDirection === -1) {
        ballDirection = 1;
        currentBallIndex = 1;
    } else {
        currentBallIndex += ballDirection;
    }
    updateDisplay();
}

function ballAuto() {
    if (ballAutoInterval) {
        clearInterval(ballAutoInterval);
        ballAutoInterval = null;
    } else {
        ballAutoInterval = setInterval(() => {
            ballRight();
        }, 600); // Alle 600ms wechseln
    }
}
