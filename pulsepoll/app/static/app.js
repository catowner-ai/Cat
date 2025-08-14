document.addEventListener('DOMContentLoaded', () => {
	const addBtn = document.getElementById('add-option');
	const container = document.getElementById('options-container');
	if (addBtn && container) {
		let idx = 6;
		addBtn.addEventListener('click', () => {
			const input = document.createElement('input');
			input.type = 'text';
			input.name = `option${idx++}`;
			input.placeholder = addBtn.textContent.replace('+ ', '');
			input.className = 'w-full border rounded px-3 py-2';
			container.appendChild(input);
		});
	}

	if ('serviceWorker' in navigator) {
		navigator.serviceWorker.register('/static/sw.js').catch(() => {});
	}
});