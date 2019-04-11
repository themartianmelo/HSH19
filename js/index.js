console.clear();

// NODES

var $ = document.querySelector.bind(document);

var wordInputNode = $(".word-input");
var wordsNode = $(".words");
var timerNode = $(".timer");
var cpsNode = $(".stat-cps .value");
var accNode = $(".stat-accuracy .value");
var mistakesNode = $(".stat-mistakes .value");
var replayNode = $(".btn-replay");

// PREINIT

// Github Gist w/ 1000 words
var thousandWordsGist = "https://gist.githubusercontent.com/deekayen/4148741/raw/01c6252ccc5b5fb307c1bb899c95989a8a284616/1-1000.txt";

var words = void 0;

setWordInputEnabled(false);

fetch(thousandWordsGist).then(function (response) {
	// Get response as text
	return response.text();
}).then(function (text) {
	// Trim down to 250
	words = text.trim().split("\n").slice(0, 250);
	initApp();
});

// UTIL

// Returns a random element from an array
function randomArrayElement(arr) {
	return arr[Math.floor(arr.length * Math.random())];
}

// Removes all children from a node
function removeNodeChildren(node) {
	while (node.firstChild) {
		node.removeChild(node.firstChild);
	}
}

// Creates a word span node
function createWordSpanNode() {
	var wordNode = document.createElement("span");
	wordNode.classList.add("word");

	return wordNode;
}

// Returns seconds as a text of minutes:seconds
// Yes I copied that from SO
function secondsAsText(s) {
	return (s - (s %= 60)) / 60 + (9 < s ? ":" : ":0") + s;
}

// Counts the mistakes in a word string from a template string.
function countMistakes(template, word) {
	// If identical, no mistakes.
	if (template === word)
	return 0;

	var mistakes = 0;

	while (word.length !== 0) {
		// Check for first letter in submitted word
		var charAtZero = word[0];
		// Check its appearance in the template
		var charInTemplate = template.indexOf(charAtZero);

		// If it's not at first place in template string, add mistake
		if (charInTemplate !== 0) {
			mistakes++;
		}

		// If not found in template string, set index to zero
		if (charInTemplate === -1) {
			charInTemplate = 0;
		}

		// Slice template string from the found index plus one
		template = template.slice(charInTemplate + 1);
		// Slice the word by one
		word = word.slice(1);
	}

	// If there's a difference in lengths between the template string and the
	// submitted word, add those as mistakes as well.
	return mistakes + Math.max(word.length, template.length);
}

// Sets whether or not the replay button should be shown.
function setReplayButtonShown(val) {
	replayNode.style.display = val ? "block" : "none";
}

// Sets the disabled status of the text input and adds focus if needed
function setWordInputEnabled(val) {
	if (val) {
		wordInputNode.disabled = "";
		wordInputNode.focus();
	} else {
		wordInputNode.disabled = "disabled";
	}
}

// APP

// Seconds left
var secondsLeft = void 0;
// Timer ID from setInterval()
var timer = void 0;
// True if game is running
var gameRunning = false;
// Timestamp of when the game started
var runningSince = void 0;
// List of currently selected words
var currentWords = void 0;
// Amount of mistakes
var mistakesCount = void 0;
// Last typed word into input
var lastWord = void 0;
// Amount of typed characters
var typeCount = void 0;
// Amount of corrected characters
var correctCount = void 0;

var cpsSamples = void 0;

// Run every second to decrease the timer and update CPS.
function tick() {
	secondsLeft--;
	cpsSamples.push(calculateCPS());

	renderCPS();
	renderTimer();

	// If time is over ...
	if (secondsLeft === 0) {
		// ... disable game.
		gameRunning = false;

		// ... append deviation.
		cpsNode.textContent += "\xB1" + calculateStability().toFixed(2);
		// ... stop timer.
		clearInterval(timer);
		// ... disable inputs and enable replay.
		setWordInputEnabled(false);
		setReplayButtonShown(true);
		// ... clear stuff.
		wordInputNode.value = "";
		timer = undefined;
	}
}

// Calculates the standard deviation of the CPS.
function calculateStability() {
	var meanCPS = 0;
	var meanDev = 0;

	cpsSamples.forEach(function (val) {return meanCPS += val;});

	meanCPS /= cpsSamples.length;
	cpsSamples.forEach(function (val) {return meanDev += Math.pow(val - meanCPS, 2);});

	meanDev /= cpsSamples.length;
	meanDev = Math.pow(meanDev, 0.5);

	return meanDev;
}

// Event handler for text input event
function handleWordInputChange(event) {
	if (gameRunning) {
		// No timer yet set?
		if (!timer) {
			// Tick every second
			timer = setInterval(tick, 1000);
			// Set starting timestamp
			runningSince = Date.now();
		}

		// Current typed value
		var val = event.target.value;
		// Difference in length between last typed word and current word
		var diff = val.length - lastWord.length;

		// Everything unsuspicious?
		if (Math.abs(diff) <= 1) {
			// Last character space?
			if (val.slice(-1) === " ") {
				// String only space?
				if (val.length == 1) {
					// Just try again.
					event.target.value = "";
				} else {
					// Increase type count
					typeCount++;
					// Count mistakes
					mistakesCount += countMistakes(currentWords.shift().toLowerCase(), val.trim().toLowerCase());
					// Add new word to list of current words
					currentWords.push(randomArrayElement(words));
					// Reset input
					event.target.value = "";
					// Reset last word
					lastWord = "";

					renderWords();
				}
			} else {
				// Increase type count
				typeCount++;
				// Update last word
				lastWord = val;

				// If too many characters or deleted character ...
				if (diff <= 0 || currentWords[0].length < val.length) {
					// ... increase correct count.
					correctCount++;
				}
			}

			renderStats();
		}
	}
}

// Adds event listeners and starts a round.
function initApp() {
	wordInputNode.addEventListener("input", handleWordInputChange);
	replayNode.addEventListener("click", initRound);

	initRound();
}

// Calculates the current characters per second.
function calculateCPS() {
	return typeCount / ((Date.now() - runningSince) / 1000) || 0;
}

// Renders the current characters per second.
function renderCPS() {
	cpsNode.textContent = calculateCPS().toFixed(2);
}

// Renders the accuracy and mistakes.
function renderStats() {
	mistakesNode.textContent = mistakesCount;
	accNode.textContent = (100 * (typeCount - correctCount) / typeCount || 100).toFixed(1) + "%";
}

// Renders the timer.
function renderTimer() {
	timerNode.textContent = secondsAsText(secondsLeft);
}

// Renders the list of current words.
function renderWords() {
	removeNodeChildren(wordsNode);

	var wordNode = void 0;

	// Iterate over list of words, create new one with each.
	for (var i = 0; i < currentWords.length; i++) {
		wordNode = createWordSpanNode();

		if (i == 0) {
			wordNode.classList.add("current");
		}

		wordNode.textContent = currentWords[i];

		wordsNode.appendChild(wordNode);
	}
}

// Starts a new round.
function initRound() {
	// 60 seconds
	secondsLeft = 60;
	// Reset mistakes, corrected chars, typed chars, current words, and last word.
	mistakesCount = 0;
	correctCount = 0;
	typeCount = 0;
	currentWords = [];
	cpsSamples = [];
	lastWord = "";

	// Update UI.
	setReplayButtonShown(false);
	setWordInputEnabled(true);

	// Add some random words.
	for (var i = 0; i < 20; i++) {
		currentWords.push(randomArrayElement(words));}

	// Render UI.
	renderWords();
	renderTimer();
	renderCPS();
	renderStats();

	// Set game as running.
	gameRunning = true;
}